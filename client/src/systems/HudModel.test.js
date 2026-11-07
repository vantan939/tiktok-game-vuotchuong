import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { Lobby } from './Lobby.js';
import { RaceManager } from './RaceManager.js';
import { CloseCams } from './CloseCams.js';
import { rankRacers } from './Ranking.js';
import { buildHudModel, elapsedSeconds, formatClock, isTimeLow } from './HudModel.js';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const NAMES = Array.from({ length: 60 }, (_, i) => `Bot${i}`);

// Ghim quy mô 30 người, top 10 cho các test cũ; test cấu hình hiện tại ở cuối file
const BIG = { ...CONFIG, maxPlayers: 30, botFillTo: 30, topShown: 10 };

function setup(cfg = BIG) {
  const rng = seeded(6);
  const lobby = new Lobby({ cfg, rng, botNames: NAMES });
  const manager = new RaceManager(lobby, { cfg, rng, skinCount: 8 });
  const cams = new CloseCams(manager, cfg);
  manager.begin();
  return { lobby, manager, cams };
}

const step = (m, until, dt = 1 / 30) => {
  for (let i = 0; i < 100000 && !until(); i++) m.update(dt);
  assert.ok(until());
};

test('formatClock: mm:ss, làm tròn xuống, không âm', () => {
  assert.equal(formatClock(0), '00:00');
  assert.equal(formatClock(156.9), '02:36');
  assert.equal(formatClock(180), '03:00');
  assert.equal(formatClock(-5), '00:00');
});

test('ĐANG ĐUA: số người trong đoàn đua trên tối đa 30, giữ 30/30 nhờ bot', () => {
  const { lobby, manager, cams } = setup();
  let model = buildHudModel(manager, lobby, cams, BIG);
  assert.equal(model.racing, 30);
  assert.equal(model.max, 30);
  // ít người hơn thì hiện đúng số thật có trong đoàn
  const small = setup({ ...BIG, botFillTo: 12 });
  model = buildHudModel(small.manager, small.lobby, small.cams, BIG);
  assert.equal(model.racing, 12);
  assert.equal(model.max, 30);
});

test('THỜI GIAN: 00:00 khi chờ và đếm ngược, chạy khi đua, đứng yên ở kết quả', () => {
  const { lobby, manager, cams } = setup();
  assert.equal(buildHudModel(manager, lobby, cams, BIG).time, '00:00');
  step(manager, () => manager.state === 'countdown');
  assert.equal(buildHudModel(manager, lobby, cams, BIG).time, '00:00');
  step(manager, () => manager.state === 'race');
  step(manager, () => manager.raceTime >= 5);
  assert.equal(buildHudModel(manager, lobby, cams, BIG).time, '00:05');
  step(manager, () => manager.raceTime >= 65.5);
  assert.equal(buildHudModel(manager, lobby, cams, BIG).time, '01:05');
  assert.equal(buildHudModel(manager, lobby, cams, BIG).total, '03:00');

  step(manager, () => manager.state === 'result');
  const final = buildHudModel(manager, lobby, cams, BIG).time;
  assert.equal(final, formatClock(manager.result.raceSeconds));
  for (let i = 0; i < 30; i++) manager.update(1 / 30);
  assert.equal(buildHudModel(manager, lobby, cams, BIG).time, final, 'màn kết quả không chạy tiếp');
});

test('THỜI GIAN: sang lượt mới thì về 00:00', () => {
  const { manager } = setup({ ...CONFIG, trackLength: 500, obstacleEndMargin: 100 });
  step(manager, () => manager.state === 'result');
  assert.ok(elapsedSeconds(manager) > 0);
  step(manager, () => manager.round === 2);
  assert.equal(elapsedSeconds(manager), 0);
});

test('hết giờ thì thời gian dừng ở đúng độ dài lượt', () => {
  const cfg = { ...CONFIG, roundSeconds: 5 };
  const { lobby, manager, cams } = setup(cfg);
  step(manager, () => manager.state === 'result');
  const model = buildHudModel(manager, lobby, cams, BIG);
  assert.equal(model.time, '00:05');
  assert.equal(model.total, '00:05');
});

test('dưới 10 giây cuối của lượt thì báo động (đỏ, nhấp nháy), chỉ khi đang đua', () => {
  const cfg = { ...CONFIG, roundSeconds: 40, trackLength: 99999 };
  const { manager } = setup(cfg);
  assert.equal(isTimeLow(manager), false, 'chưa đua');
  step(manager, () => manager.state === 'race');
  step(manager, () => manager.raceTime >= 29.5);
  assert.equal(isTimeLow(manager), false, 'còn hơn 10 giây');
  step(manager, () => manager.raceTime >= 30.5);
  assert.equal(isTimeLow(manager), true, 'còn dưới 10 giây');
  step(manager, () => manager.state === 'result');
  assert.equal(isTimeLow(manager), false, 'hết lượt thì tắt báo động');
});

test('các số liệu khác của HUD: camera cận, top 10, hàng đợi', () => {
  const { lobby, manager, cams } = setup();
  for (let i = 0; i < 33; i++) manager.join({ userId: `u${i}`, nickname: `N${i}`, avatarUrl: '' });
  cams.update(manager.now); // camera cận tự bật cho người đang chơi (tối đa maxCloseCams)
  const withCam = cams.cams.map((c) => c.racer.userId);
  const model = buildHudModel(manager, lobby, cams, BIG);
  assert.deepEqual(model.cams, { used: BIG.maxCloseCams, max: BIG.maxCloseCams });
  assert.equal(model.top.length, 10);
  // Đưa u1 lên đầu bảng để chắc chắn nằm trong top 10, rồi kiểm tra dấu hiệu camera cận
  manager.racerOf('u1').dist = 9999;
  rankRacers(manager.racers, manager.ranking);
  const flagged = buildHudModel(manager, lobby, cams, BIG);
  assert.equal(flagged.top[0].id, 'u1');
  assert.ok(flagged.top.every((e) => e.cam === withCam.includes(e.id)), 'chỉ người có camera cận mới có dấu hiệu');
  assert.equal(model.queueTotal, 3);
  assert.deepEqual(model.queueFirst.map((q) => q.id), ['u30', 'u31', 'u32']);
  assert.equal(model.queueBase, 30);
});

test('hàng đợi 12 người: chỉ hiện 5 người đầu, đếm đủ 12, số thứ tự bắt đầu từ #31', () => {
  const { lobby, manager, cams } = setup();
  for (let i = 0; i < 42; i++) manager.join({ userId: `u${i}`, nickname: `N${i}`, avatarUrl: `http://x/${i}.png` });
  const model = buildHudModel(manager, lobby, cams, BIG);
  assert.equal(model.queueTotal, 12);
  assert.deepEqual(model.queueFirst.map((q) => q.id), ['u30', 'u31', 'u32', 'u33', 'u34']);
  assert.equal(model.queueFirst[0].avatarUrl, 'http://x/30.png');
  assert.equal(model.queueBase, 30);

  // Có người rời đi thì tổng giảm, 5 người đầu cập nhật theo
  lobby.leave('u30');
  const after = buildHudModel(manager, lobby, cams, BIG);
  assert.equal(after.queueTotal, 11);
  assert.deepEqual(after.queueFirst.map((q) => q.id), ['u31', 'u32', 'u33', 'u34', 'u35']);
});

test('hàng đợi trống thì không có ai', () => {
  const { lobby, manager, cams } = setup();
  const model = buildHudModel(manager, lobby, cams, BIG);
  assert.equal(model.queueTotal, 0);
  assert.deepEqual(model.queueFirst, []);
});

test('cấu hình hiện tại: một lượt 3 người, bảng xếp hạng chỉ top 1, hàng đợi bắt đầu từ #4', () => {
  assert.equal(CONFIG.maxPlayers, 3);
  assert.equal(CONFIG.topShown, 1);
  const { lobby, manager, cams } = setup(CONFIG);
  for (let i = 0; i < 8; i++) manager.join({ userId: `u${i}`, nickname: `N${i}`, avatarUrl: '' });
  const model = buildHudModel(manager, lobby, cams);
  assert.equal(model.racing, 3);
  assert.equal(model.max, 3);
  assert.equal(model.top.length, 1);
  assert.equal(model.queueTotal, 5);
  assert.equal(model.queueBase, 3);
});

test('hàng đợi: maxPlayers người đầu hiện dấu ✓ (vào đua lượt kế), còn lại đánh số #4, #5...; sang lượt mới người vào đua bị xóa khỏi hàng', () => {
  const cfg = { ...BIG, maxPlayers: 3, botFillTo: 3 };
  const { lobby, manager, cams } = setup(cfg);
  step(manager, () => manager.state === 'race');
  for (const i of [0, 1, 2, 3, 4]) manager.join({ userId: `u${i}`, nickname: `N${i}`, avatarUrl: '' }); // giữa lượt đua: tất cả vào hàng đợi
  const model = buildHudModel(manager, lobby, cams, cfg);
  assert.equal(model.queueTotal, 5);
  assert.deepEqual(model.queueFirst.map((q) => [q.id, q.late, q.n]), [['u0', true, undefined], ['u1', true, undefined], ['u2', true, undefined], ['u3', false, 4], ['u4', false, 5]]);
  step(manager, () => manager.round === 2);
  const next = buildHudModel(manager, lobby, cams, cfg);
  assert.deepEqual(next.queueFirst.map((q) => q.id), ['u3', 'u4'], 'u0 đến u2 đã vào đua nên rời hàng đợi');
  assert.ok(next.queueFirst.every((q) => q.late), 'hàng chỉ còn 2 người nên đều vào đua lượt kế');
});
