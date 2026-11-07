import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { ObstacleField, generateObstacles, hammerLethalDuring, hammerLift, hammerPhaseAt, spikeDist } from './Obstacles.js';
import { applyHit, findHit } from './Collision.js';
import { createRacer } from './Racer.js';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const hammer = (dist, lane, phase = 0, warn = 0.8, id = 0) => ({ id, type: 'hammer', dist, lane, phase, warn });
const spike = (dist, lane, id = 0) => ({ id, type: 'spike', dist, lane, phase: 0, warn: 0 });
const racerAt = (dist, lane) => {
  const r = createRacer({ userId: 'x', nickname: 'x' });
  r.dist = dist;
  r.lane = r.targetLane = lane;
  return r;
};

test('generateObstacles: khoảng cách hàng theo config, luôn chừa ít nhất 1 làn, có hàng đơn và hàng đôi', () => {
  const field = generateObstacles(seeded(5), { ...CONFIG, obstacleDoubleChance: 0.25 });
  const rows = new Map();
  for (const o of field.list) rows.set(o.dist, [...(rows.get(o.dist) ?? []), o]);
  const dists = [...rows.keys()];
  for (let i = 1; i < dists.length; i++) {
    const gap = dists[i] - dists[i - 1];
    assert.ok(gap >= CONFIG.obstacleGapMin - 1e-9 && gap <= CONFIG.obstacleGapMax + 1e-9, `khoảng cách ${gap}`);
  }
  const sizes = new Set();
  for (const row of rows.values()) {
    assert.ok(row.length <= CONFIG.lanes - 1, 'phải chừa ít nhất 1 làn trống');
    assert.equal(new Set(row.map((o) => o.lane)).size, row.length, 'không trùng làn');
    sizes.add(row.length);
  }
  assert.ok(sizes.has(1) && sizes.has(2));
  assert.ok(dists[0] >= CONFIG.obstacleFirstDist);
  assert.ok(dists.at(-1) < CONFIG.trackLength - CONFIG.obstacleEndMargin);
  assert.ok(field.list.some((o) => o.type === 'hammer') && field.list.some((o) => o.type === 'spike'));
});

test('generateObstacles: cùng hạt giống cho cùng kết quả', () => {
  assert.deepEqual(generateObstacles(seeded(9)).list, generateObstacles(seeded(9)).list);
});

test('ObstacleField: indexAfter và hasObstacle', () => {
  const f = new ObstacleField([spike(100, 0, 0), spike(200, 1, 1), spike(300, 2, 2)]);
  assert.equal(f.indexAfter(0), 0);
  assert.equal(f.indexAfter(150), 1);
  assert.equal(f.indexAfter(301), 3);
  assert.ok(f.hasObstacle(1, 150, 210));
  assert.ok(!f.hasObstacle(0, 150, 210));
});

test('búa: warn kéo dài đúng o.warn rồi impact, chu kỳ 2 giây', () => {
  const o = hammer(100, 0, 0, 0.7);
  const at = CONFIG.hammerImpactAt;
  assert.equal(hammerPhaseAt(o, at - 0.71), 'up');
  assert.equal(hammerPhaseAt(o, at - 0.69), 'warn');
  assert.equal(hammerPhaseAt(o, at + 0.01), 'impact');
  assert.equal(hammerPhaseAt(o, at + CONFIG.hammerImpactSeconds + 0.01), 'up');
  assert.equal(hammerPhaseAt(o, at + CONFIG.hammerCycleSeconds + 0.01), 'impact', 'lặp lại mỗi chu kỳ');
  assert.equal(hammerLift(o, at + 0.1), 0, 'nằm dưới sàn');
  assert.equal(hammerLift(o, 0.1), 1, 'nâng cao');
});

test('búa: hammerLethalDuring khớp với lấy mẫu từng mili giây', () => {
  const rng = seeded(21);
  for (let n = 0; n < 200; n++) {
    const o = hammer(0, 0, rng() * 2, 0.5 + rng() * 0.5);
    const t0 = rng() * 10;
    const t1 = t0 + rng() * 1.5;
    let brute = false;
    for (let t = t0; t <= t1; t += 0.001) if (hammerPhaseAt(o, t) === 'impact') brute = true;
    if (brute) assert.ok(hammerLethalDuring(o, t0, t1), 'mẫu thấy impact thì hàm phải báo nguy hiểm');
    if (!hammerLethalDuring(o, t0, t1)) assert.ok(!brute);
  }
});

test('cầu gai lăn qua lại quanh vị trí gốc', () => {
  const o = spike(500, 1);
  for (let t = 0; t < 10; t += 0.1) assert.ok(Math.abs(spikeDist(o, t) - 500) <= CONFIG.spikeRollAmp + 1e-9);
});

test('va chạm: cầu gai cùng làn và chồng vị trí thì dính', () => {
  const f = new ObstacleField([spike(100, 1)]);
  assert.ok(findHit(racerAt(100 - spikeDist(spike(100, 1), 0) + 100, 1), f, 0));
  assert.equal(findHit(racerAt(100, 0), f, 0), null, 'khác làn thì không dính');
  assert.equal(findHit(racerAt(60, 1), f, 0), null, 'chưa tới thì không dính');
});

test('va chạm: búa chỉ gây choáng lúc impact', () => {
  const o = hammer(100, 1, 0, 0.8);
  const f = new ObstacleField([o]);
  assert.equal(findHit(racerAt(100, 1), f, 0.1), null, 'búa đang nâng');
  assert.equal(findHit(racerAt(100, 1), f, CONFIG.hammerImpactAt - 0.3), null, 'đang cảnh báo, chưa đập');
  assert.equal(findHit(racerAt(100, 1), f, CONFIG.hammerImpactAt + 0.1), o);
});

test('va chạm: khiên và đang choáng thì miễn nhiễm, nhảy qua được cầu gai nhưng không qua được búa', () => {
  const s = spike(100, 1);
  const f = new ObstacleField([s]);
  const near = () => racerAt(spikeDist(s, 0), 1);
  const shielded = near();
  shielded.shield = 5;
  assert.equal(findHit(shielded, f, 0), null);
  const stunned = near();
  stunned.stun = 0.5;
  assert.equal(findHit(stunned, f, 0), null);
  const jumping = near();
  jumping.jump = 0.3;
  assert.equal(findHit(jumping, f, 0), null);

  const h = hammer(100, 1);
  const jumpingAtHammer = racerAt(100, 1);
  jumpingAtHammer.jump = 0.3;
  assert.equal(findHit(jumpingAtHammer, new ObstacleField([h]), CONFIG.hammerImpactAt + 0.1), h);
});

test('applyHit: choáng 1 giây, bị đẩy lùi, không bị loại', () => {
  const r = racerAt(500, 1);
  r.plan = { kind: 'jump' };
  r.rolled.add(3);
  applyHit(r);
  assert.equal(r.stun, CONFIG.stunSeconds);
  assert.equal(r.dist, 500 - CONFIG.knockback);
  assert.equal(r.hits, 1);
  assert.equal(r.plan, null);
  assert.equal(r.rolled.size, 0, 'được nhận diện lại chướng ngại sau khi bị đẩy lùi');
  assert.ok(!r.finished);
});
