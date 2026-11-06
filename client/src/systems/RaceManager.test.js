import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { Lobby } from './Lobby.js';
import { RaceManager } from './RaceManager.js';

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
const SHORT = { ...CONFIG, trackLength: 500, obstacleEndMargin: 100, roundSeconds: 60 };

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

test('Lobby: join vào hàng đợi, không cho join hai lần', () => {
  const lobby = new Lobby({ botNames: NAMES });
  assert.equal(lobby.join(user(1)), 'queued');
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
  const lobby = new Lobby({ botNames: NAMES });
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
  const lobby = new Lobby({ botNames: NAMES });
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
