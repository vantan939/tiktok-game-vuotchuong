import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { applyWin, createRacer, hashString, randomStats } from './Racer.js';
import { stepRacer } from './RacerAI.js';
import { progressPercent, rankRacers } from './Ranking.js';
import { AvatarCache } from '../core/AvatarCache.js';

// Bộ sinh số ngẫu nhiên có hạt giống để test lặp lại được
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const user = (i) => ({ userId: `u${i}`, nickname: `N${i}`, avatarUrl: '' });

test('randomStats: nằm trong khoảng cấu hình', () => {
  const rng = seeded(7);
  for (let i = 0; i < 500; i++) {
    const s = randomStats(rng);
    assert.ok(s.speed >= CONFIG.speedMin && s.speed <= CONFIG.speedMax);
    assert.ok(s.dodgeSkill >= CONFIG.dodgeSkillMin && s.dodgeSkill <= CONFIG.dodgeSkillMax);
    assert.ok(s.reaction >= CONFIG.reactionMin && s.reaction <= CONFIG.reactionMax);
  }
});

test('applyWin: +0,02 mỗi lần thắng, tối đa 0,9', () => {
  assert.equal(applyWin({ speed: 36, dodgeSkill: 0.5, reaction: 0.3 }).dodgeSkill, 0.52);
  let s = { speed: 36, dodgeSkill: 0.8, reaction: 0.3 };
  for (let i = 0; i < 20; i++) s = applyWin(s);
  assert.equal(s.dodgeSkill, CONFIG.dodgeSkillCap);
  assert.equal(s.speed, 36);
});

test('createRacer: 30 người xếp lên 3 làn, 10 hàng; skin ổn định theo userId', () => {
  const racers = Array.from({ length: 30 }, (_, i) => createRacer(user(i), { index: i, skinCount: 8, rng: seeded(i + 1) }));
  for (let lane = 0; lane < 3; lane++) assert.equal(racers.filter((r) => r.targetLane === lane).length, 10);
  assert.equal(racers[0].dist, 0);
  assert.equal(racers[29].dist, -9 * CONFIG.startRowGap);
  assert.equal(hashString('abc'), hashString('abc'));
  assert.equal(createRacer(user(5), { skinCount: 8 }).skinIndex, createRacer(user(5), { index: 9, skinCount: 8 }).skinIndex);
});

test('stepRacer: chạy đúng tốc độ và dừng ở vạch đích', () => {
  const r = createRacer(user(1), { stats: { speed: 36, dodgeSkill: 0.5, reaction: 0.3 } });
  stepRacer(r, 1, { now: 1 });
  assert.equal(r.dist, 36);
  for (let t = 2; t < 400; t++) stepRacer(r, 1, { now: t });
  assert.equal(r.dist, CONFIG.trackLength);
  assert.ok(r.finished);
  const at = r.finishTime;
  stepRacer(r, 1, { now: 999 });
  assert.equal(r.finishTime, at, 'về đích rồi thì không cập nhật nữa');
});

test('stepRacer: không bao giờ đổi vào làn đang có chướng ngại', () => {
  const rng = seeded(3);
  const blockedLane = 2;
  const isBlocked = (lane) => lane === blockedLane;
  const racers = Array.from({ length: 30 }, (_, i) => createRacer(user(i), { index: i, rng }));
  racers.forEach((r) => {
    r.lane = r.targetLane = 0; // đều ở làn trái, làn 2 bị chặn
  });
  for (let t = 0; t < 600; t += 0.1) {
    for (const r of racers) {
      r.dist = 0; // giữ nguyên chỗ, chỉ thử đổi làn
      r.finished = false;
      stepRacer(r, 0.1, { now: t, rng, isBlocked });
      assert.notEqual(r.targetLane, blockedLane);
    }
  }
});

test('stepRacer: không đổi làn khi làn hiện tại đang có chướng ngại phía trước', () => {
  const r = createRacer(user(1), { index: 1, stats: { speed: 36, dodgeSkill: 0.5, reaction: 0.3 } });
  r.wanderTimer = 0;
  stepRacer(r, 0.1, { now: 0, isBlocked: (lane) => lane === r.targetLane });
  assert.equal(r.pending, null);
});

test('stepRacer: đổi làn có độ trễ bằng reaction', () => {
  const r = createRacer(user(1), { index: 1, stats: { speed: 36, dodgeSkill: 0.5, reaction: 0.5 } });
  r.wanderTimer = 0;
  stepRacer(r, 0.01, { now: 0, rng: () => 0 });
  assert.ok(r.pending, 'đã quyết định đổi làn');
  const lane = r.pending.lane;
  stepRacer(r, 0.3, { now: 0 });
  assert.equal(r.targetLane, 1, 'chưa hết 0,5 giây thì chưa đổi');
  stepRacer(r, 0.3, { now: 0 });
  assert.equal(r.targetLane, lane);
});

test('stepRacer: 30 người không đổi làn đồng loạt (độ trễ khác nhau)', () => {
  const rng = seeded(11);
  const racers = Array.from({ length: 30 }, (_, i) => createRacer(user(i), { index: i, rng }));
  racers.forEach((r) => (r.wanderTimer = 0));
  racers.forEach((r) => stepRacer(r, 0.01, { now: 0, rng }));
  const delays = new Set(racers.filter((r) => r.pending).map((r) => r.pending.delay.toFixed(3)));
  assert.ok(delays.size > 10, `chỉ có ${delays.size} độ trễ khác nhau`);
});

test('rankRacers: về đích trước, rồi theo quãng đường', () => {
  const a = { dist: 100, finished: false };
  const b = { dist: 300, finished: false };
  const c = { dist: 5500, finished: true, finishTime: 150 };
  const d = { dist: 5500, finished: true, finishTime: 140 };
  const out = rankRacers([a, b, c, d]);
  assert.deepEqual(out, [d, c, b, a]);
  assert.deepEqual([d.rank, c.rank, b.rank, a.rank], [1, 2, 3, 4]);
});

test('progressPercent: 0 đến 100', () => {
  assert.equal(progressPercent({ dist: -20 }), 0);
  assert.equal(progressPercent({ dist: CONFIG.trackLength / 2 }), 50);
  assert.equal(progressPercent({ dist: 99999 }), 100);
});

test('AvatarCache: mỗi url chỉ tải một lần, lỗi thì trả null', async () => {
  let calls = 0;
  const cache = new AvatarCache(async (url) => {
    calls++;
    if (url.includes('bad')) throw new Error('lỗi');
    return { url };
  }, 1);
  const [x, y] = await Promise.all([cache.request('http://a/1.png'), cache.request('http://a/1.png')]);
  assert.equal(x, y);
  assert.equal(calls, 1);
  assert.equal(await cache.request('http://a/bad.png'), null);
  assert.equal(await cache.request('http://a/bad.png'), null);
  assert.equal(calls, 2, 'url lỗi cũng không tải lại');
  assert.equal(await cache.request(''), null);
});

test('AvatarCache: quá hạn thì trả null', async () => {
  const cache = new AvatarCache(() => new Promise(() => {}), 0.05);
  assert.equal(await cache.request('http://a/slow.png'), null);
});
