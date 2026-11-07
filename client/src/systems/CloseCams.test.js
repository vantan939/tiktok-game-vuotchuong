import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { Lobby } from './Lobby.js';
import { RaceManager } from './RaceManager.js';
import { CloseCams } from './CloseCams.js';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const NAMES = Array.from({ length: 60 }, (_, i) => `Bot${i}`);
const SHORT = { ...CONFIG, maxPlayers: 5, botFillTo: 5, maxCloseCams: 3, trackLength: 500, obstacleEndMargin: 100, roundSeconds: 60 };

function setup(cfg = SHORT, joins = 0) {
  const rng = seeded(4);
  const lobby = new Lobby({ cfg, rng, botNames: NAMES });
  const manager = new RaceManager(lobby, { cfg, rng, skinCount: 8 });
  const cams = new CloseCams(manager, cfg);
  for (let i = 0; i < joins; i++) lobby.join({ userId: `u${i}`, nickname: `Người${i}`, avatarUrl: '' });
  manager.begin();
  return { lobby, manager, cams };
}

function runUntil(manager, cond, maxSeconds = 2000) {
  for (let t = 0; t < maxSeconds && !cond(); t += 1 / 30) manager.update(1 / 30);
  assert.ok(cond());
}

const ids = (cams) => cams.cams.map((c) => c.racer.userId);

test('camera cận tự động: mỗi người thật đang chơi có một cửa sổ, bot thì không, không cần gõ lệnh', () => {
  const { cams } = setup(SHORT, 2);
  cams.update(0);
  assert.deepEqual(ids(cams).sort(), ['u0', 'u1'], 'đúng hai người thật');
  assert.ok(cams.cams.every((c) => !c.racer.isBot));
});

test('camera cận: không có người thật nào thì không có cửa sổ', () => {
  const { cams } = setup(SHORT, 0);
  cams.update(0);
  assert.equal(cams.cams.length, 0);
});

test('camera cận: tối đa maxCloseCams cửa sổ dù có nhiều người chơi hơn', () => {
  const { cams } = setup({ ...SHORT, maxCloseCams: 2 }, 4);
  cams.update(0);
  assert.equal(cams.cams.length, 2);
});

test('camera cận: người vào đua trước giờ xuất phát tự có cửa sổ; đổi người thì giữ nguyên mốc thời gian của người cũ', () => {
  const { manager, cams } = setup(SHORT, 1);
  cams.update(1);
  const first = cams.cams[0];
  assert.equal(first.since, 1);
  manager.join({ userId: 'late', nickname: 'Muộn', avatarUrl: '' }); // lượt chưa xuất phát, còn suất: vào đua ngay
  cams.update(5);
  assert.equal(cams.cams.length, 2);
  assert.equal(cams.cams.find((c) => c.racer === first.racer).since, 1, 'cửa sổ đã có giữ nguyên');
});

test('camera cận: hết lượt thì tắt hết, lượt mới tự bật lại cho người đã gõ join lại', () => {
  const { lobby, manager, cams } = setup(SHORT, 3);
  runUntil(manager, () => manager.state === 'race');
  cams.update(manager.now);
  assert.equal(cams.cams.length, 3);
  runUntil(manager, () => manager.state === 'result');
  cams.update(manager.now);
  assert.equal(cams.cams.length, 0, 'màn kết quả không có cửa sổ cận');
  lobby.join({ userId: 'u1', nickname: 'Người1', avatarUrl: '' }); // chỉ u1 xếp hàng lại để chơi tiếp
  runUntil(manager, () => manager.round === 2);
  cams.update(manager.now);
  assert.deepEqual(ids(cams), ['u1'], 'chỉ người có mặt ở lượt mới');
});
