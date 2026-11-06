import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { Lobby } from './Lobby.js';
import { RaceManager } from './RaceManager.js';
import { CloseCams } from './CloseCams.js';
import { CommandRouter } from './CommandRouter.js';
import { EventBus } from '../core/EventBus.js';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const NAMES = Array.from({ length: 60 }, (_, i) => `Bot${i}`);
const SHORT = { ...CONFIG, trackLength: 500, obstacleEndMargin: 100, roundSeconds: 60 };

function setup(cfg = SHORT) {
  const rng = seeded(4);
  const lobby = new Lobby({ cfg, rng, botNames: NAMES });
  const manager = new RaceManager(lobby, { cfg, rng, skinCount: 8 });
  const cams = new CloseCams(manager, cfg);
  manager.begin();
  return { lobby, manager, cams };
}

// Gõ lệnh qua đường thật: bình luận → EventBus → CommandRouter → join / s.
// Mỗi lệnh cách nhau 10 giây (đồng hồ giả tính bằng ms) để không vướng chống spam.
function chatter(manager, cams) {
  const bus = new EventBus();
  let t = 0;
  const router = new CommandRouter(bus, () => t);
  const log = [];
  router.onCommand(({ command, user: u }) => {
    if (command === 'join') log.push({ who: u.userId, cmd: 'join', ...manager.join(u) });
    else if (command === 's') log.push({ who: u.userId, cmd: 's', ...cams.press(u) });
  });
  return {
    log,
    say(i, text) {
      t += 10_000;
      bus.emit({ type: 'chat', userId: `u${i}`, nickname: `Người${i}`, avatarUrl: '', text });
    },
  };
}

function runUntil(manager, cond, maxSeconds = 2000) {
  for (let t = 0; t < maxSeconds && !cond(); t += 1 / 30) manager.update(1 / 30);
  assert.ok(cond());
}

test('s: 5 người gõ liên tiếp thì 4 người đầu có cửa sổ, người thứ 5 bị báo đầy; người đầu tắt thì người thứ 5 gõ lại được', () => {
  const { manager, cams } = setup();
  const c = chatter(manager, cams);
  for (let i = 0; i < 5; i++) c.say(i, 'join');
  for (let i = 0; i < 5; i++) c.say(i, 's');
  const presses = c.log.filter((e) => e.cmd === 's').map((e) => e.status);
  assert.deepEqual(presses, ['on', 'on', 'on', 'on', 'full']);
  assert.deepEqual(cams.cams.map((x) => x.racer.userId), ['u0', 'u1', 'u2', 'u3']);

  c.say(0, 's'); // người đầu tắt
  assert.equal(c.log.at(-1).status, 'off');
  assert.equal(cams.cams.length, 3);

  c.say(4, 's'); // người thứ 5 gõ lại
  assert.equal(c.log.at(-1).status, 'on');
  assert.deepEqual(cams.cams.map((x) => x.racer.userId), ['u1', 'u2', 'u3', 'u4']);
});

test('s: không ảnh hưởng người khác, bật rồi tắt lại', () => {
  const { manager, cams } = setup();
  const c = chatter(manager, cams);
  c.say(1, 'join');
  c.say(2, 'join');
  c.say(1, 's');
  assert.equal(cams.cams.length, 1);
  c.say(2, 'S ');
  assert.equal(cams.cams.length, 2);
  c.say(1, 's');
  assert.deepEqual(cams.cams.map((x) => x.racer.userId), ['u2'], 'người 2 vẫn còn cửa sổ');
});

test('s: chưa join hoặc đang ở hàng đợi thì nhắc gõ join trước, không bật cửa sổ', () => {
  const { manager, cams } = setup();
  const c = chatter(manager, cams);
  c.say(99, 's');
  assert.equal(c.log.at(-1).status, 'not-joined');
  for (let i = 0; i < 31; i++) c.say(i, 'join'); // u30 vào hàng đợi
  c.say(30, 's');
  assert.equal(c.log.at(-1).status, 'not-joined');
  assert.equal(cams.cams.length, 0);
});

test('s: vào giữa lượt đua (chưa có mặt ở lượt này) thì báo lượt sau', () => {
  const { manager, cams } = setup();
  const c = chatter(manager, cams);
  runUntil(manager, () => manager.state === 'race');
  c.say(1, 'join');
  c.say(1, 's');
  assert.equal(c.log.at(-1).status, 'next-round');
  assert.equal(cams.cams.length, 0);
});

test('s: tự tắt sau closeCamSeconds (chỉnh được trong config)', () => {
  const cfg = { ...SHORT, closeCamSeconds: 5 };
  const { manager, cams } = setup(cfg);
  const c = chatter(manager, cams);
  c.say(1, 'join');
  c.say(1, 's');
  assert.equal(cams.cams.length, 1);
  assert.ok(Math.abs(cams.secondsLeft(cams.cams[0], manager.now) - 5) < 1e-9);
  runUntil(manager, () => manager.now > 4.5);
  cams.update(manager.now);
  assert.equal(cams.cams.length, 1);
  runUntil(manager, () => manager.now > 5.5);
  cams.update(manager.now);
  assert.equal(cams.cams.length, 0);
});

test('s: closeCamSeconds = 0 thì không tự tắt', () => {
  const cfg = { ...SHORT, closeCamSeconds: 0 };
  const { manager, cams } = setup(cfg);
  const c = chatter(manager, cams);
  c.say(1, 'join');
  c.say(1, 's');
  cams.update(manager.now + 99999);
  assert.equal(cams.cams.length, 1);
  assert.equal(cams.secondsLeft(cams.cams[0], 0), Infinity);
});

test('s: hết lượt thì tự tắt hết, sang lượt mới bật lại được', () => {
  const { manager, cams } = setup({ ...SHORT, closeCamSeconds: 0 });
  const c = chatter(manager, cams);
  for (let i = 0; i < 3; i++) c.say(i, 'join');
  for (let i = 0; i < 3; i++) c.say(i, 's');
  assert.equal(cams.cams.length, 3);
  runUntil(manager, () => manager.state === 'result');
  assert.equal(cams.cams.length, 0, 'tắt hết khi hết lượt');
  c.say(0, 's');
  assert.equal(c.log.at(-1).status, 'idle', 'màn kết quả không bật được');
  runUntil(manager, () => manager.round === 2);
  c.say(0, 's');
  assert.equal(c.log.at(-1).status, 'on');
});
