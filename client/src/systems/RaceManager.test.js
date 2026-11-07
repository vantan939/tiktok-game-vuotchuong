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

test('Lobby: gõ join luôn vào hàng đợi, trùng khi đang chờ, đang đua gõ tiếp thì xếp hàng lại', () => {
  const lobby = new Lobby({ cfg: BIG, botNames: NAMES });
  assert.equal(lobby.join(user(1)), 'queued');
  assert.equal(lobby.where('u1'), 'queued');
  assert.equal(lobby.join(user(1)), 'duplicate', 'đang chờ mà gõ lại thì báo trùng');
  lobby.prepareRound();
  assert.deepEqual(lobby.players.map((p) => p.userId), ['u1'], 'lượt kế tiếp thì vào đua');
  assert.equal(lobby.inQueue('u1'), false, 'vào đua thì bị xóa khỏi hàng đợi');
  assert.equal(lobby.where('u1'), 'racing');
  assert.equal(lobby.join(user(1)), 'queued', 'đang đua gõ tiếp thì vào hàng đợi lại');
  assert.equal(lobby.where('u1'), 'queued');
  assert.equal(lobby.queuePosition('u1'), 1);
});

test('Lobby: thiếu người thì thêm bot cho đủ 30, không trùng tên người thật', () => {
  const lobby = new Lobby({ cfg: BIG, botNames: ['A', 'B', 'C', 'Người1'] });
  lobby.join(user(1)); // nickname "Người1" trùng một tên bot
  const roster = lobby.prepareRound();
  assert.equal(roster.length, 30);
  assert.equal(roster.filter((p) => p.nickname === 'Người1').length, 1, 'bot không lấy tên người thật');
  assert.equal(roster.filter((p) => !p.isBot).length, 1);
  assert.equal(new Set(roster.map((p) => p.nickname)).size, 30, 'không trùng tên nào');
});

test('Lobby: mỗi lượt lấy tối đa maxPlayers người từ đầu hàng đợi đúng thứ tự, người chơi lượt trước phải gõ join lại', () => {
  const cfg = { ...BIG, maxPlayers: 3, botFillTo: 3 };
  const lobby = new Lobby({ cfg, botNames: NAMES });
  for (let i = 0; i < 8; i++) lobby.join(user(i));
  const ids = () => lobby.players.map((p) => p.userId);
  lobby.prepareRound();
  assert.deepEqual(ids(), ['u0', 'u1', 'u2']);
  assert.deepEqual(lobby.queue.map((p) => p.userId), ['u3', 'u4', 'u5', 'u6', 'u7'], 'người vào đua bị xóa khỏi hàng đợi');
  assert.deepEqual(lobby.evicted, []);
  lobby.prepareRound();
  assert.deepEqual(ids(), ['u3', 'u4', 'u5']);
  assert.deepEqual(lobby.evicted.map((p) => p.userId), ['u0', 'u1', 'u2'], 'chưa gõ join lại nên không có mặt lượt này');
  const roster = lobby.prepareRound();
  assert.deepEqual(ids(), ['u6', 'u7']);
  assert.equal(roster.length, 3, 'thiếu một người thì thêm bot');
  assert.equal(roster.filter((p) => p.isBot).length, 1);
  assert.equal(lobby.queue.length, 0);
});

test('Lobby: đang đua mà xếp hàng lại thì vào lượt sau theo đúng thứ tự trong hàng, không tính là bị loại', () => {
  const cfg = { ...BIG, maxPlayers: 3, botFillTo: 3 };
  const lobby = new Lobby({ cfg, botNames: NAMES });
  for (let i = 0; i < 4; i++) lobby.join(user(i)); // u0-u2 đua, u3 chờ
  lobby.prepareRound();
  assert.equal(lobby.join(user(0)), 'queued'); // u0 đang đua gõ tiếp: xếp sau u3
  assert.deepEqual(lobby.queue.map((p) => p.userId), ['u3', 'u0']);
  lobby.prepareRound();
  assert.deepEqual(lobby.players.map((p) => p.userId), ['u3', 'u0']);
  assert.deepEqual(lobby.evicted.map((p) => p.userId), ['u1', 'u2'], 'chỉ u1 và u2 không quay lại');
});

test('Lobby: promote đưa người từ đầu hàng vào lượt hiện tại khi còn suất, bỏ qua người đang có mặt mà xếp hàng lại', () => {
  const cfg = { ...BIG, maxPlayers: 3, botFillTo: 3 };
  const lobby = new Lobby({ cfg, botNames: NAMES });
  lobby.join(user(0));
  lobby.prepareRound(); // u0 đang đua
  lobby.join(user(0)); // u0 xếp hàng lại
  lobby.join(user(1));
  lobby.join(user(2));
  const taken = lobby.promote();
  assert.deepEqual(taken.map((p) => p.userId), ['u1', 'u2'], 'u0 đã có mặt nên giữ nguyên trong hàng');
  assert.deepEqual(lobby.players.map((p) => p.userId), ['u0', 'u1', 'u2']);
  assert.deepEqual(lobby.queue.map((p) => p.userId), ['u0']);
});

test('Lobby: người gõ join thay chỗ bot ở lượt kế, người không gõ lại thì không còn', () => {
  const lobby = new Lobby({ cfg: BIG, botNames: NAMES });
  lobby.join(user(1));
  assert.equal(lobby.prepareRound().filter((p) => p.isBot).length, 29);
  lobby.join(user(2));
  const roster = lobby.prepareRound();
  assert.equal(roster.filter((p) => p.isBot).length, 29);
  assert.deepEqual(roster.filter((p) => !p.isBot).map((p) => p.userId), ['u2']);
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

test('RaceManager: lượt mới đủ 30 người, người chơi lượt trước phải gõ join lại, hàng đợi vào lượt mới, thiếu thì bot', () => {
  const { lobby, manager } = setup();
  for (let i = 0; i < 5; i++) lobby.join(user(i));
  manager.begin();
  assert.equal(manager.racers.length, 30);
  assert.equal(manager.racers.filter((r) => !r.isBot).length, 5);

  lobby.join(user(99)); // vào hàng đợi giữa lúc đang chờ (còn suất nên vào đua luôn qua lobby.promote ở RaceManager.join, ở đây gọi thẳng lobby nên vẫn chờ)
  lobby.join(user(0)); // u0 đang đua, xếp hàng lại để chơi tiếp
  runUntil(manager, () => manager.round === 2);
  assert.equal(manager.racers.length, 30);
  assert.deepEqual(manager.racers.filter((r) => !r.isBot).map((r) => r.userId).sort(), ['u0', 'u99'], 'chỉ người đã xếp hàng lại và người mới');
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
  lobby.join(user(1)); // xếp hàng lại để chơi lượt sau
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

test('Task 8: hàng đợi lên đường ở lượt mới theo thứ tự; người chơi lượt trước phải gõ join lại', () => {
  const { lobby, manager } = setup();
  manager.begin();
  joinViaBus(manager, 45); // 30 người đua ngay (chưa xuất phát), 15 người chờ
  runUntil(manager, () => manager.round === 2);
  const ids = manager.racers.map((r) => r.userId);
  const range = (from, to) => Array.from({ length: to - from }, (_, i) => `u${from + i}`);
  assert.ok(range(30, 45).every((id) => ids.includes(id)), 'u30 đến u44 (đầu hàng đợi) vào đua');
  assert.ok(range(0, 30).every((id) => !ids.includes(id)), 'u0 đến u29 chưa gõ join lại nên không có mặt');
  assert.equal(lobby.queue.length, 0, 'người vào đua đã bị xóa khỏi hàng đợi');
  assert.equal(manager.racers.length, 30);
  assert.equal(manager.racers.filter((r) => r.isBot).length, 15, 'thiếu thì bot');
});

test('Task 8: 3 suất, 7 người: vào từng nhóm theo thứ tự qua các lượt, ai đang đua gõ lại thì chơi tiếp', () => {
  const { lobby, manager } = setup({ ...SHORT, maxPlayers: 3, botFillTo: 3 });
  manager.begin();
  joinViaBus(manager, 7); // u0-u2 đua ngay, u3-u6 chờ
  assert.deepEqual(lobby.queue.map((p) => p.userId), ['u3', 'u4', 'u5', 'u6']);
  joinViaBus(manager, 1, { start: 0 }); // u0 đang đua, gõ tiếp: xếp cuối hàng
  assert.deepEqual(lobby.queue.map((p) => p.userId), ['u3', 'u4', 'u5', 'u6', 'u0']);
  runUntil(manager, () => manager.round === 2);
  assert.deepEqual(manager.racers.filter((r) => !r.isBot).map((r) => r.userId).sort(), ['u3', 'u4', 'u5']);
  assert.deepEqual(lobby.queue.map((p) => p.userId), ['u6', 'u0']);
  runUntil(manager, () => manager.round === 3);
  assert.deepEqual(manager.racers.filter((r) => !r.isBot).map((r) => r.userId).sort(), ['u0', 'u6'], 'u0 quay lại chơi sau u6');
  assert.equal(lobby.queue.length, 0);
});

test('Task 8: gõ join hai lần khi đang chờ thì báo trùng; đang đua mà chưa xếp hàng thì gõ lại là vào hàng đợi', () => {
  const { lobby, manager } = setup();
  manager.begin();
  joinViaBus(manager, 31); // u0-u29 đua ngay, u30 chờ
  const again = joinViaBus(manager, 1, { start: 30 })[0];
  assert.equal(again.status, 'duplicate', 'u30 đang chờ');
  assert.equal(again.where, 'queued');
  assert.equal(again.queuePosition, 1);
  const racingAgain = joinViaBus(manager, 1, { start: 0 })[0];
  assert.equal(racingAgain.status, 'queued', 'u0 đang đua, gõ tiếp thì xếp hàng lại');
  assert.equal(racingAgain.queuePosition, 2);
  assert.equal(lobby.queue.length, 2);
  assert.equal(manager.racers.filter((r) => !r.isBot).length, 30);
});

test('Task 8: gõ join giữa lượt đua thì vào hàng đợi (không chen vào đoàn đang chạy), lượt sau được vào', () => {
  const { lobby, manager } = setup();
  manager.begin();
  runUntil(manager, () => manager.state === 'race');
  const before = manager.racers.map((r) => r.userId);
  const [res] = joinViaBus(manager, 1);
  assert.equal(res.status, 'queued');
  assert.equal(res.queuePosition, 1);
  assert.deepEqual(manager.racers.map((r) => r.userId), before, 'đoàn đua đang chạy không đổi');
  assert.equal(joinMessage(res, 'A').text, 'A vào hàng đợi (số 1)');

  runUntil(manager, () => manager.round === 2);
  assert.ok(manager.racers.some((r) => r.userId === 'u0'), 'lượt sau có mặt');
  assert.equal(lobby.queue.length, 0, 'đã vào đua thì bị xóa khỏi hàng đợi');
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
  assert.equal(joinMessage({ status: 'duplicate', where: 'queued', queuePosition: 2 }, 'Lan').text, 'Lan đã tham gia rồi (đang chờ, số 2)');
  assert.equal(joinMessage({ status: 'duplicate', where: 'racing', queuePosition: 0 }, 'Lan').text, 'Lan đã tham gia rồi (đã có suất đua)');
  assert.equal(shortName('Nguyễn Thị Hồng Nhung Xinh Đẹp Quá Trời'), 'Nguyễn Thị Hồng N…');
  assert.equal(shortName('Ngắn'), 'Ngắn');
});

test('RaceManager: tạm dừng thì đồng hồ game đứng yên, tiếp tục thì chạy tiếp', () => {
  const { manager, events } = setup();
  manager.begin();
  runUntil(manager, () => manager.state === 'race');
  for (let i = 0; i < 30; i++) manager.update(1 / 30);
  const dists = manager.racers.map((r) => r.dist);
  const now = manager.now;
  assert.equal(manager.togglePause(), true);
  for (let i = 0; i < 90; i++) manager.update(1 / 30);
  assert.equal(manager.now, now, 'đồng hồ đứng yên');
  assert.deepEqual(manager.racers.map((r) => r.dist), dists, 'nhân vật đứng yên');
  assert.equal(manager.state, 'race');
  assert.equal(manager.togglePause(), false);
  manager.update(1 / 30);
  assert.ok(manager.now > now, 'tiếp tục chạy');
  assert.deepEqual(events.filter((e) => e.type === 'pause').map((e) => e.paused), [true, false]);
});

test('RaceManager: bắt đầu lại lượt giữ số lượt, người chơi và hàng đợi, đưa mọi người về vạch xuất phát', () => {
  const cfg = { ...SHORT, maxPlayers: 3, botFillTo: 3 };
  const { lobby, manager, events } = setup(cfg);
  manager.begin();
  joinViaBus(manager, 5); // u0-u2 đua, u3-u4 chờ
  runUntil(manager, () => manager.state === 'race');
  for (let i = 0; i < 120; i++) manager.update(1 / 30);
  const round = manager.round;
  assert.ok(manager.racers.some((r) => r.dist > 20), 'đã chạy ra khỏi vạch');
  const queueBefore = lobby.queue.map((p) => p.userId);
  manager.togglePause();
  manager.restartRound();
  assert.equal(manager.paused, false, 'bắt đầu lại thì tiếp tục luôn');
  assert.equal(manager.round, round, 'cùng số lượt');
  assert.equal(manager.state, 'wait');
  assert.deepEqual(manager.racers.map((r) => r.userId).sort(), ['u0', 'u1', 'u2']);
  assert.deepEqual(lobby.queue.map((p) => p.userId), queueBefore, 'hàng đợi không đổi, không ai phải nhường chỗ');
  assert.ok(manager.racers.every((r) => r.dist <= 0 && !r.finished));
  const last = events.filter((e) => e.type === 'round').at(-1);
  assert.equal(last.restart, true);
  assert.deepEqual(last.evicted, []);
  runUntil(manager, () => manager.state === 'result');
  assert.equal(manager.round, round);
});
