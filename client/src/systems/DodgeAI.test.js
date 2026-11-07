import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { ObstacleField, hammerPhaseAt } from './Obstacles.js';
import { createRacer } from './Racer.js';
import { stepRacer } from './RacerAI.js';
import { noticeChance, perceive } from './DodgeAI.js';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const hammer = (dist, lane, phase = 0, warn = 0.8, id = 0) => ({ id, type: 'hammer', dist, lane, phase, warn });
const spike = (dist, lane, id = 0) => ({ id, type: 'spike', dist, lane, phase: 0, warn: 0 });

function racer({ dist = 0, lane = 1, skill = 0.8, reaction = 0.3, speed = 36 } = {}) {
  const r = createRacer({ userId: 'x', nickname: 'x' }, { stats: { speed, dodgeSkill: skill, reaction } });
  r.dist = dist;
  r.lane = r.targetLane = lane;
  r.wanderTimer = 1e9; // tắt tự đổi làn để chỉ thử việc né
  return r;
}

// Chạy tới khi qua hết chướng ngại (hoặc hết thời gian), trả về racer
function run(r, field, { seconds = 12, rng = () => 0, start = 0 } = {}) {
  let now = start;
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    now += dt;
    stepRacer(r, dt, { now, cfg: CONFIG, rng, field });
  }
  return r;
}

test('noticeChance: theo dodgeSkill, boost trừ 0,1, luôn chừa 10% để dính', () => {
  assert.equal(noticeChance(racer({ skill: 0.5 })), 0.5);
  assert.equal(noticeChance(racer({ skill: 0.9 })), 0.9);
  assert.equal(noticeChance(racer({ skill: 0.99 })), 1 - CONFIG.minHitChance);
  const b = racer({ skill: 0.7 });
  b.boost = 2;
  assert.ok(Math.abs(noticeChance(b) - 0.6) < 1e-9);
  assert.equal(noticeChance(racer({ skill: 0 })), 0);
});

test('perceive: chỉ nhìn trước khoảng lookAheadSeconds và chỉ xét chướng ngại trên làn của mình', () => {
  const f = new ObstacleField([spike(100, 0, 1), spike(200, 1, 0)]);
  const r = racer({ dist: 100 - 36 * 1.5 - 5, lane: 1 }); // chưa tới tầm nhìn của chướng ngại ở 100
  perceive(r, { field: f, cfg: CONFIG, rng: () => 0, now: 0 });
  assert.equal(r.encounters, 0);
  const near = racer({ dist: 200 - 36 * 1.5 + 1, lane: 1 });
  perceive(near, { field: f, cfg: CONFIG, rng: () => 0, now: 0 });
  assert.equal(near.encounters, 1);
  assert.equal(near.rolled.size, 1);
});

test('né: hai bên đều trống thì đổi sang làn bên cạnh, chọn ngẫu nhiên cả hai phía', () => {
  const f = new ObstacleField([spike(100, 1)]);
  const seen = new Set();
  for (let seed = 1; seed < 40; seed++) {
    const r = racer({ dist: 60, lane: 1 });
    perceive(r, { field: f, cfg: CONFIG, rng: seeded(seed), now: 0 });
    // rng thật dùng cho cả nhận diện lẫn chọn phía; chỉ ghi nhận khi đã có kế hoạch
    if (r.plan) seen.add(r.plan.lane);
  }
  assert.deepEqual([...seen].sort(), [0, 2]);
});

test('né: một bên bị chặn thì sang bên còn lại', () => {
  const f = new ObstacleField([spike(100, 1, 0), spike(100, 0, 1)]);
  const r = racer({ dist: 60, lane: 1 });
  perceive(r, { field: f, cfg: CONFIG, rng: () => 0, now: 0 });
  assert.equal(r.plan.kind, 'lane');
  assert.equal(r.plan.lane, 2);
});

test('né: hai bên đều có chướng ngại và là cầu gai thì nhảy', () => {
  const f = new ObstacleField([spike(100, 0, 0), spike(100, 1, 1)]); // người ở làn biên 0, hàng xóm duy nhất bị chặn
  const r = racer({ dist: 60, lane: 0 });
  perceive(r, { field: f, cfg: CONFIG, rng: () => 0, now: 0 });
  assert.equal(r.plan.kind, 'jump');
});

test('né: là búa mà hai bên chặn thì canh nhịp (chờ), không nhảy', () => {
  // phase đặt để búa đập đúng lúc người chạy tới: tới nơi sau ~1,1 giây, impact ở 1,4
  const f = new ObstacleField([hammer(100, 0, 0.3, 0.8, 0), spike(100, 1, 1)]);
  const r = racer({ dist: 60, lane: 0 });
  perceive(r, { field: f, cfg: CONFIG, rng: () => 0, now: 0 });
  assert.equal(r.plan?.kind, 'wait');
});

test('né: búa sẽ đang nâng lúc tới nơi thì cứ chạy thẳng, không cần hành động', () => {
  const f = new ObstacleField([hammer(100, 1, 1.0, 0.8, 0)]); // tới nơi lúc búa chưa đập
  const r = racer({ dist: 60, lane: 1 });
  assert.ok(!f.list.length || true);
  perceive(r, { field: f, cfg: CONFIG, rng: () => 0, now: 0 });
  assert.equal(r.plan, null);
});

test('né: hành động chỉ bắt đầu sau độ trễ reaction', () => {
  const f = new ObstacleField([spike(100, 1)]);
  const r = racer({ dist: 60, lane: 1, reaction: 0.5 });
  const ctx = { now: 0, cfg: CONFIG, rng: () => 0, field: f };
  stepRacer(r, 1 / 60, ctx);
  assert.equal(r.plan.kind, 'lane');
  assert.equal(r.targetLane, 1, 'chưa đổi làn ngay');
  for (let i = 0; i < 20; i++) stepRacer(r, 1 / 60, ctx); // 0,33 giây
  assert.equal(r.targetLane, 1);
  for (let i = 0; i < 20; i++) stepRacer(r, 1 / 60, ctx); // 0,67 giây
  assert.notEqual(r.targetLane, 1);
});

test('né thành công: nhân vật nhận ra luôn tránh được cầu gai (đổi làn, nhảy)', () => {
  // đổi làn
  const a = run(racer({ dist: 0, lane: 1 }), new ObstacleField([spike(100, 1)]));
  assert.equal(a.hits, 0);
  assert.notEqual(a.targetLane, 1);
  // nhảy: làn biên, hàng xóm bị chặn
  const b = run(racer({ dist: 0, lane: 0 }), new ObstacleField([spike(100, 0, 0), spike(100, 1, 1)]));
  assert.equal(b.hits, 0);
  assert.ok(b.dist > 120, 'đã chạy qua');
});

test('né thành công: canh nhịp búa, không bao giờ dính dù búa đập ở bất kỳ pha nào', () => {
  for (let phase = 0; phase < 2; phase += 0.1) {
    const f = new ObstacleField([hammer(100, 0, phase, 0.8, 0), spike(100, 1, 1)]);
    const r = run(racer({ dist: 0, lane: 0 }), f, { seconds: 14 });
    assert.equal(r.hits, 0, `phase ${phase.toFixed(1)}`);
    assert.ok(r.dist > 115, `phase ${phase.toFixed(1)} phải qua được, dist=${r.dist.toFixed(1)}`);
  }
});

test('né thất bại: không nhận ra thì dính choáng 1 giây và bị đẩy lùi', () => {
  const f = new ObstacleField([spike(100, 1)]);
  const r = racer({ dist: 0, lane: 1, skill: 0.4 });
  let now = 0;
  let stunnedAt = null;
  for (let t = 0; t < 8; t += 1 / 60) {
    now += 1 / 60;
    stepRacer(r, 1 / 60, { now, cfg: CONFIG, rng: () => 0.99, field: f }); // luôn "lơ đễnh"
    if (r.stun > 0 && stunnedAt === null) stunnedAt = r.dist;
  }
  assert.ok(r.hits >= 1);
  assert.ok(stunnedAt !== null && stunnedAt < 100 + CONFIG.spikeRollAmp + 10);
  assert.ok(!r.finished, 'không bị loại');
});

test('dính xong có cơ hội nhận diện lại (không đâm lại mãi mãi)', () => {
  const f = new ObstacleField([spike(100, 1)]);
  const r = racer({ dist: 0, lane: 1, skill: 0.9 });
  let missFirst = true;
  const rng = () => {
    if (missFirst) {
      missFirst = false;
      return 0.99; // lần đầu lơ đễnh
    }
    return 0; // sau đó nhận ra
  };
  run(r, f, { rng, seconds: 14 });
  assert.equal(r.hits, 1);
  assert.ok(r.dist > 120, 'đã vượt qua sau khi dính');
});

test('thống kê: dodgeSkill cao dính ít hơn rõ rệt dodgeSkill thấp', () => {
  const rng = seeded(77);
  const list = [];
  for (let i = 0; i < 20; i++) list.push(spike(100 + i * 70, Math.floor(rng() * 3), i));
  const field = new ObstacleField(list);
  const hits = (skill) => {
    let total = 0;
    for (let n = 0; n < 60; n++) total += run(racer({ dist: 0, lane: 1, skill }), field, { rng, seconds: 50 }).hits;
    return total;
  };
  const low = hits(0.4);
  const high = hits(0.8);
  assert.ok(high * 1.5 < low, `skill cao ${high} lần, skill thấp ${low} lần`);
  assert.ok(high > 0, 'skill cao vẫn có lúc dính');
});

test('boost làm dodgeSkill giảm nên dính nhiều hơn', () => {
  const rng = seeded(5);
  const list = [];
  for (let i = 0; i < 20; i++) list.push(spike(100 + i * 70, Math.floor(rng() * 3), i));
  const field = new ObstacleField(list);
  const hits = (boosted) => {
    let total = 0;
    for (let n = 0; n < 80; n++) {
      const r = racer({ dist: 0, lane: 1, skill: 0.6 });
      if (boosted) {
        r.boost = 1e9;
        r.boostMul = 1; // chỉ xét phần trừ dodgeSkill, không đổi tốc độ
      }
      total += run(r, field, { rng, seconds: 50 }).hits;
    }
    return total;
  };
  assert.ok(hits(true) > hits(false));
});

test('khi cao nhất 0,9, vẫn có xác suất dính khoảng 10%', () => {
  const rng = seeded(31);
  let missed = 0;
  const trials = 4000;
  for (let i = 0; i < trials; i++) {
    const r = racer({ dist: 60, lane: 1, skill: 0.9 });
    perceive(r, { field: new ObstacleField([spike(100, 1)]), cfg: CONFIG, rng, now: 0 });
    if (!r.plan) missed++;
  }
  const rate = missed / trials;
  assert.ok(rate > 0.08 && rate < 0.12, `tỉ lệ lơ đễnh ${rate}`);
});

test('búa: hammerPhaseAt dùng đúng cho kịch bản chờ (sanity)', () => {
  assert.equal(hammerPhaseAt(hammer(0, 0, 0, 0.8), 0.1), 'up');
});

test('né hoàn hảo: báo đúng một lần sau khi chạy qua hết chướng ngại đã né, không báo khi dính', () => {
  const dodged = [];
  const ctxFor = (field, rng) => (now) => ({ now, cfg: CONFIG, rng, field, onDodge: (r, o) => dodged.push(o.id) });
  const f = new ObstacleField([spike(100, 1, 7)]);
  const r = racer({ dist: 0, lane: 1 });
  const make = ctxFor(f, () => 0);
  let now = 0;
  for (let t = 0; t < 8; t += 1 / 60) {
    now += 1 / 60;
    stepRacer(r, 1 / 60, make(now));
  }
  assert.deepEqual(dodged, [7]);

  dodged.length = 0;
  const hit = racer({ dist: 0, lane: 1, skill: 0.4 });
  const miss = ctxFor(new ObstacleField([spike(100, 1, 8)]), () => 0.99); // luôn lơ đễnh nên dính
  now = 0;
  for (let t = 0; t < 8; t += 1 / 60) {
    now += 1 / 60;
    stepRacer(hit, 1 / 60, miss(now));
  }
  assert.ok(hit.hits >= 1);
  assert.deepEqual(dodged, []);
});
