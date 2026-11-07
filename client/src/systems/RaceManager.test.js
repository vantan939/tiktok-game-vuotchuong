import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { Lobby } from './Lobby.js';
import { RaceManager } from './RaceManager.js';
import { EventBus } from '../core/EventBus.js';
import { CommandRouter } from './CommandRouter.js';
import { joinMessage, shortName } from './JoinMessage.js';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const NAMES = Array.from({ length: 60 }, (_, i) => `Bot${i}`);
const user = (i) => ({ userId: `u${i}`, nickname: `Người${i}`, avatarUrl: '' });
// Đường ngắn để mỗi lượt kết thúc nhanh trong test
// Các test cũ kiểm tra luật theo quy mô 30 người, top 10; ghim lại để không phụ thuộc cấu hình hiện tại
const BIG = { ...CONFIG, maxPlayers: 30, botFillTo: 30, topShown: 10 };
const SHORT = { ...BIG, trackLength: 500, obstacleEndMargin: 100, roundSeconds: 60 };

function setup(cfg = SHORT, seed = 3) {
  const rng = seeded(seed);
  const lobby = new Lobby({ cfg, rng, botNames: NAMES });
  const events = [];
  const manager = new RaceManager(lobby, { cfg, rng, skinCount: 8, onEvent: (e) => events.push(e) });
  return { lobby, manager, events };
}

// Chạy tới khi điều kiện đúng (tối đa maxSeconds giây game)
function runUntil(manager, cond, maxSeconds = 2000, dt = 1 / 30) {
  for (let t = 0; t < maxSeconds && !cond(); t += dt) manager.update(dt);
  assert.ok(cond(), 'điều kiện không đạt trong thời gian cho phép');
}

test('Lobby: join vào đoàn đua, không cho join hai lần', () => {
  const lobby = new Lobby({ cfg: BIG, botNames: NAMES });
  assert.equal(lobby.join(user(1)), 'racing', 'còn suất thì vào đoàn đua');
  assert.equal(lobby.join(user(1)), 'duplicate');
  lobby.prepareRound();
  assert.equal(lobby.join(user(1)), 'duplicate', 'đã có trong đoàn đua cũng không join lại');
});

test('Lobby: thiếu người thì thêm bot cho đủ 30, không trùng tên người thật', () => {
  const lobby = new Lobby({ botNames: ['A', 'B', 'C', 'Người1'] });
  lobby.join({ userId: 'u1', nickname: 'A' });
  const roster = lobby.prepareRound();
  assert.equal(roster.length, CONFIG.botFillTo);
  assert.equal(roster.filter((p) => !p.isBot).length, 1);
  const names = roster.map((p) => p.nickname);
  assert.equal(new Set(names).size, names.length, 'không trùng tên');
});

test('Lobby: người cũ ở lại, hàng đợi chỉ vào chỗ trống, tối đa 30 người thật', () => {
  const lobby = new Lobby({ cfg: BIG, botNames: NAMES });
  for (let i = 0; i < 35; i++) lobby.join(user(i));
  let roster = lobby.prepareRound();
  assert.equal(roster.length, 30);
  assert.ok(roster.every((p) => !p.isBot));
  assert.equal(lobby.queue.length, 5);

  // Lượt sau: người cũ vẫn ở lại, hàng đợi vẫn chờ vì không còn chỗ
  roster = lobby.prepareRound();
  assert.deepEqual(roster.map((p) => p.userId), Array.from({ length: 30 }, (_, i) => `u${i}`));
  assert.equal(lobby.queue.length, 5);

  // Có 2 người rời đi thì 2 người đầu hàng đợi vào
  lobby.leave('u3');
  lobby.leave('u7');
  roster = lobby.prepareRound();
  assert.equal(roster.length, 30);
  assert.ok(roster.some((p) => p.userId === 'u30') && roster.some((p) => p.userId === 'u31'));
  assert.equal(lobby.queue.length, 3);
  assert.deepEqual(lobby.queue.map((p) => p.userId), ['u32', 'u33', 'u34'], 'đúng thứ tự hàng đợi');
});

test('Lobby: người mới vào thay chỗ bot ở lượt sau', () => {
  const lobby = new Lobby({ cfg: BIG, botNames: NAMES });
  lobby.join(user(1));
  assert.equal(lobby.prepareRound().filter((p) => p.isBot).length, 29);
  lobby.join(user(2));
  const roster = lobby.prepareRound();
  assert.equal(roster.filter((p) => p.isBot).length, 28);
  assert.equal(roster.length, 30);
});

test('RaceManager: chạy đúng thứ tự trạng thái chờ → đếm ngược → đua → kết quả → lượt mới', () => {
  const { manager, events } = setup();
  manager.begin();
  runUntil(manager, () => manager.round === 3);
  const states = events.filter((e) => e.type === 'state').map((e) => e.state);
  const cycle = ['wait', 'countdown', 'race', 'result'];
  assert.deepEqual(states.slice(0, 8), [...cycle, ...cycle]);
  assert.deepEqual(events.filter((e) => e.type === 'round').map((e) => e.round), [1, 2, 3]);
});

test('RaceManager: thời gian các trạng thái đúng cấu hình', () => {
  const stamps = [];
  const { manager } = setup();
  manager.onEvent = (e) => e.type === 'state' && stamps.push([e.state, manager.now]);
  manager.begin();
  runUntil(manager, () => manager.round === 2);
  const [wait, countdown, race, result] = stamps.slice(0, 4).map(([, t]) => t);
  assert.ok(Math.abs(countdown - wait - CONFIG.waitSeconds) < 0.1, 'chờ 2 giây');
  assert.ok(Math.abs(race - countdown - CONFIG.countdownSeconds) < 0.1, 'đếm ngược 3 giây');
  assert.ok(result > race, 'lượt đua có diễn ra');
  assert.ok(manager.now - result >= CONFIG.resultSeconds - 0.1, 'màn kết quả hiện đủ 8 giây trước khi sang lượt mới');
});

test('RaceManager: có người về đích thì lượt kết thúc ngay, người thắng là người về đích đầu tiên', () => {
  const { manager } = setup();
  manager.begin();
  runUntil(manager, () => manager.state === 'result');
  const r = manager.result;
  assert.ok(r.finished);
  assert.ok(r.winner.finished && r.winner.rank === 1);
  assert.ok(r.raceSeconds < SHORT.roundSeconds);
  assert.equal(manager.racers.filter((x) => x.finished).length >= 1, true);
  assert.equal(r.top.length, 10);
  assert.ok(r.top[0].finished && r.top[0].percent === 100);
});

test('RaceManager: hết giờ thì xếp theo % quãng đường, người dẫn đầu thắng', () => {
  const cfg = { ...CONFIG, trackLength: 5500, roundSeconds: 6 };
  const { manager } = setup(cfg);
  manager.begin();
  runUntil(manager, () => manager.state === 'result');
  const r = manager.result;
  assert.equal(r.finished, false);
  assert.equal(r.raceSeconds, 6);
  const best = Math.max(...manager.racers.map((x) => x.dist));
  assert.equal(r.winner.dist, best, 'người xa nhất thắng');
  for (let i = 1; i < r.top.length; i++) assert.ok(r.top[i - 1].percent >= r.top[i].percent);
});

test('RaceManager: lượt mới đủ 30 người, người thật ở lại, hàng đợi vào khi có chỗ, thiếu thì bot', () => {
  const { lobby, manager } = setup();
  for (let i = 0; i < 5; i++) lobby.join(user(i));
  manager.begin();
  assert.equal(manager.racers.length, 30);
  assert.equal(manager.racers.filter((r) => !r.isBot).length, 5);

  lobby.join(user(99)); // vào hàng đợi giữa lúc đang chờ
  runUntil(manager, () => manager.round === 2);
  assert.equal(manager.racers.length, 30);
  assert.equal(manager.racers.filter((r) => !r.isBot).length, 6, 'người cũ ở lại, người mới vào thay bot');
  for (let i = 0; i < 5; i++) assert.ok(manager.racers.some((r) => r.userId === `u${i}`));
  assert.ok(manager.racers.some((r) => r.userId === 'u99'));
});

test('RaceManager: người thật thắng thì dodgeSkill tăng 0,02 ở lượt sau, bot thì không ghi', () => {
  const { lobby, manager } = setup({ ...SHORT, botFillTo: 1 });
  lobby.join(user(1));
  manager.begin();
  const before = manager.racers.find((r) => r.userId === 'u1').stats.dodgeSkill;
  manager.racers.find((r) => r.userId === 'u1').stats.speed = 1000; // chắc chắn về nhất
  runUntil(manager, () => manager.state === 'result');
  assert.equal(manager.result.winner.userId, 'u1');
  assert.equal(lobby.statsFor('u1').dodgeSkill, Math.round((before + 0.02) * 100) / 100);
  runUntil(manager, () => manager.round === 2);
  assert.equal(manager.racers.find((r) => r.userId === 'u1').stats.dodgeSkill, lobby.statsFor('u1').dodgeSkill);
  assert.equal(lobby.stats.size, 1, 'chỉ lưu người thật');
});

test('RaceManager: chạy liên tục 10 lượt không cần can thiệp, mỗi lượt đều có người thắng', () => {
  const { manager, events } = setup(SHORT, 11);
  manager.begin();
  runUntil(manager, () => manager.round === 11, 20000);
  const ends = events.filter((e) => e.type === 'end');
  assert.equal(ends.length, 10);
  assert.ok(ends.every((e) => e.result.winner && e.result.top.length === 10));
});

// Gửi lệnh join qua đường thật: EventBus → CommandRouter → RaceManager.join
function joinViaBus(manager, count, { start = 0, text = 'join' } = {}) {
  const bus = new EventBus();
  let t = 0;
  const router = new CommandRouter(bus, () => t);
  const results = [];
  router.onCommand(({ command, user: u }) => {
    if (command === 'join') results.push({ user: u, ...manager.join(u) });
  });
  for (let i = start; i < start + count; i++) {
    t += 10;
    bus.emit({ type: 'chat', userId: `u${i}`, nickname: `Người${i}`, avatarUrl: '', text: i % 2 ? text.toUpperCase() : `${text} ` });
  }
  return results;
}

test('Task 8: 45 lệnh join thì có 30 người đua và 15 người xếp hàng đúng thứ tự', () => {
  const { lobby, manager } = setup();
  manager.begin();
  const results = joinViaBus(manager, 45);

  assert.equal(results.filter((r) => r.status === 'racing').length, 30);
  assert.equal(results.filter((r) => r.status === 'queued').length, 15);
  assert.deepEqual(results.slice(30).map((r) => r.queuePosition), Array.from({ length: 15 }, (_, i) => i + 1), 'vị trí hàng đợi 1 đến 15');

  const racing = manager.racers.filter((r) => !r.isBot);
  assert.equal(racing.length, 30);
  assert.equal(manager.racers.length, 30);
  assert.equal(manager.racers.filter((r) => r.isBot).length, 0, 'đủ 30 người thật thì không còn bot');
  assert.deepEqual(racing.map((r) => r.userId).sort(), Array.from({ length: 30 }, (_, i) => `u${i}`).sort());
  assert.deepEqual(lobby.queue.map((p) => p.userId), Array.from({ length: 15 }, (_, i) => `u${i + 30}`), 'đúng thứ tự vào');
});

test('Task 8: hàng đợi chỉ lên đường ở lượt mới, theo đúng thứ tự', () => {
  const { lobby, manager } = setup();
  manager.begin();
  joinViaBus(manager, 45);
  runUntil(manager, () => manager.round === 2);
  assert.equal(lobby.queue.length, 15, 'đoàn đua còn đủ 30 người cũ nên hàng đợi chưa được lên');

  // 3 người rời đi: lượt tới 3 người đầu hàng đợi lên đường
  ['u2', 'u9', 'u11'].forEach((id) => lobby.leave(id));
  assert.equal(manager.racers.length, 30, 'lượt đang chạy không bị ảnh hưởng');
  runUntil(manager, () => manager.round === 3);
  const ids = manager.racers.map((r) => r.userId);
  assert.deepEqual(['u30', 'u31', 'u32'].filter((id) => ids.includes(id)), ['u30', 'u31', 'u32']);
  assert.ok(!ids.includes('u33'));
  assert.deepEqual(lobby.queue.map((p) => p.userId)[0], 'u33');
});

test('Task 8: join hai lần thì báo đã tham gia, không thêm người, kể cả người đang xếp hàng', () => {
  const { lobby, manager } = setup();
  manager.begin();
  joinViaBus(manager, 31);
  const again = joinViaBus(manager, 1, { start: 0 })[0];
  assert.equal(again.status, 'duplicate');
  const queuedAgain = joinViaBus(manager, 1, { start: 30 })[0];
  assert.equal(queuedAgain.status, 'duplicate');
  assert.equal(lobby.queue.length, 1);
  assert.equal(manager.racers.filter((r) => !r.isBot).length, 30);
});

test('Task 8: chính sách vào giữa lượt: giữ suất, vào đoàn đua từ lượt sau', () => {
  const { lobby, manager } = setup();
  manager.begin();
  runUntil(manager, () => manager.state === 'race');
  const before = manager.racers.map((r) => r.userId);
  const [res] = joinViaBus(manager, 1);
  assert.equal(res.status, 'racing');
  assert.equal(res.late, true);
  assert.deepEqual(manager.racers.map((r) => r.userId), before, 'đoàn đua đang chạy không đổi');
  assert.equal(joinMessage(res, 'A').text, 'A vào đua ở lượt sau');

  runUntil(manager, () => manager.round === 2);
  assert.ok(manager.racers.some((r) => r.userId === 'u0'), 'lượt sau có mặt');
  assert.equal(lobby.queue.length, 0);
});

test('Task 8: join trước lúc đua thì thế chỗ bot ngay trên vạch xuất phát', () => {
  const { manager, events } = setup();
  manager.begin();
  const bot = manager.racers.filter((r) => r.isBot).at(-1);
  const [res] = joinViaBus(manager, 1);
  assert.equal(res.late, false);
  const added = events.find((e) => e.type === 'racer');
  assert.equal(added.removed, bot);
  assert.equal(added.added.userId, 'u0');
  assert.equal(added.added.dist, bot.dist);
  assert.equal(manager.racers.length, 30);
  assert.ok(!manager.racers.includes(bot));
});

test('joinMessage: đúng ba thông báo và cắt tên quá dài', () => {
  assert.equal(joinMessage({ status: 'racing', late: false }, 'Lan').text, 'Lan vào đua');
  assert.equal(joinMessage({ status: 'queued' }, 'Lan').text, 'Lan vào hàng đợi');
  assert.equal(joinMessage({ status: 'duplicate' }, 'Lan').text, 'Lan đã tham gia rồi');
  assert.equal(shortName('Nguyễn Thị Hồng Nhung Xinh Đẹp Quá Trời'), 'Nguyễn Thị Hồng N…');
  assert.equal(shortName('Ngắn'), 'Ngắn');
});
