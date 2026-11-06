import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { Lobby } from './Lobby.js';
import { RaceManager } from './RaceManager.js';
import { GiftBoost, giveGift, tierFor } from './GiftBoost.js';
import { giveLike } from './LikeBoost.js';
import { ObstacleField } from './Obstacles.js';
import { createRacer } from './Racer.js';
import { stepRacer } from './RacerAI.js';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const NAMES = Array.from({ length: 60 }, (_, i) => `Bot${i}`);
const SHORT = { ...CONFIG, trackLength: 5000, roundSeconds: 600 };
const [SMALL, MEDIUM, LARGE] = CONFIG.giftTiers;
const spike = (dist, lane, id) => ({ id, type: 'spike', dist, lane, phase: 0, warn: 0 });
const hammer = (dist, lane, phase, id) => ({ id, type: 'hammer', dist, lane, phase, warn: 0.8 });

function racer(skill = 0.6) {
  const r = createRacer({ userId: 'x', nickname: 'x' }, { stats: { speed: 36, dodgeSkill: skill, reaction: 0.3 } });
  r.lane = r.targetLane = 1;
  r.wanderTimer = 1e9;
  return r;
}

function setup(realPlayers = 3) {
  const rng = seeded(8);
  const lobby = new Lobby({ cfg: SHORT, rng, botNames: NAMES });
  const manager = new RaceManager(lobby, { cfg: SHORT, rng, skinCount: 8 });
  for (let i = 0; i < realPlayers; i++) lobby.join({ userId: `u${i}`, nickname: `Người${i}` });
  manager.begin();
  return { manager, giftBoost: new GiftBoost(manager, SHORT) };
}

const gift = (userId, diamonds, giftName = 'Quà') => ({ type: 'gift', userId, nickname: `Tên_${userId}`, avatarUrl: '', giftName, diamonds });

// Chạy racer qua field, trả về danh sách vị trí lúc bị dính
function runThrough(r, field, seconds, rng = () => 0.99) {
  const hitsAt = [];
  let now = 0;
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    now += dt;
    stepRacer(r, dt, { now, cfg: CONFIG, rng, field, onHit: (x) => hitsAt.push(x.dist + CONFIG.knockback) });
  }
  return hitsAt;
}

test('tierFor: phân bậc theo số kim cương (nhỏ, vừa, lớn)', () => {
  assert.equal(tierFor(1), SMALL);
  assert.equal(tierFor(99), SMALL);
  assert.equal(tierFor(100), MEDIUM);
  assert.equal(tierFor(999), MEDIUM);
  assert.equal(tierFor(1000), LARGE);
  assert.equal(tierFor(29999), LARGE);
  assert.equal(tierFor(0), SMALL);
  assert.equal(tierFor(undefined), SMALL);
});

test('giveGift: khiên 5 giây và boost mạnh, quà càng giá trị hiệu ứng càng lớn', () => {
  const results = [SMALL, MEDIUM, LARGE].map((tier) => {
    const r = racer();
    giveGift(r, tier);
    return r;
  });
  results.forEach((r) => assert.equal(r.shield, 5, 'khiên 5 giây'));
  const muls = results.map((r) => r.boostMul);
  assert.ok(muls[0] > CONFIG.likeBoostMultiplier, 'mạnh hơn boost của tim');
  assert.ok(muls[0] < muls[1] && muls[1] < muls[2]);
  const secs = results.map((r) => r.boost);
  assert.ok(secs[0] < secs[1] && secs[1] < secs[2]);
  const fx = results.map((r) => r.gift.fxScale);
  assert.ok(fx[0] < fx[1] && fx[1] < fx[2]);
  const grow = results.map((r) => r.gift.grow);
  assert.ok(grow[0] < grow[1] && grow[1] < grow[2]);
  assert.deepEqual([SMALL, MEDIUM, LARGE].map((t) => t.announce), [false, false, true], 'chỉ quà lớn có thông báo to');
});

test('3 mức quà đi xa khác nhau trong cùng thời gian', () => {
  const dist = (tier) => {
    const r = racer();
    giveGift(r, tier);
    let now = 0;
    for (let t = 0; t < 6; t += 1 / 60) {
      now += 1 / 60;
      stepRacer(r, 1 / 60, { now, cfg: { ...CONFIG, trackLength: 1e9 } });
    }
    return r.dist;
  };
  const [a, b, c] = [SMALL, MEDIUM, LARGE].map(dist);
  assert.ok(a > 36 * 6 && a < b && b < c, `${a.toFixed(0)} < ${b.toFixed(0)} < ${c.toFixed(0)}`);
});

test('giveGift: không làm yếu boost đang có, vẫn nhận mức mạnh hơn', () => {
  const r = racer();
  giveGift(r, LARGE);
  giveGift(r, SMALL);
  assert.equal(r.boostMul, LARGE.boostMultiplier);
  assert.equal(r.boost, LARGE.boostSeconds);
  assert.equal(r.gift, LARGE);

  const withLike = racer();
  giveLike(withLike, 5, 0);
  giveGift(withLike, MEDIUM);
  assert.equal(withLike.boostMul, MEDIUM.boostMultiplier, 'quà mạnh hơn tim');
});

test('khiên chặn đúng chướng ngại: có khiên thì lướt qua, hết khiên thì dính', () => {
  const field = new ObstacleField([
    spike(100, 1, 0),
    spike(200, 1, 1),
    spike(400, 1, 2), // sau khi hết khiên
    spike(550, 1, 3),
  ]);
  const shielded = racer();
  giveGift(shielded, SMALL); // khiên 5 giây: boost 2,0x trong 3 giây rồi 36 u/s => bảo vệ tới khoảng 288
  const hits = runThrough(shielded, field, 14);
  assert.ok(hits.length >= 1, 'hết khiên thì vẫn dính');
  assert.ok(hits.every((d) => d > 288), `không dính khi còn khiên, dính ở ${hits.map((d) => d.toFixed(0))}`);

  const plain = racer();
  const plainHits = runThrough(plain, field, 14);
  assert.ok(plainHits[0] < 150, 'không khiên thì dính ngay cầu gai đầu tiên');
});

test('khiên chặn búa đập đúng lúc búa chạm sàn', () => {
  // búa đập ngay lúc nhân vật tới nơi
  for (let phase = 0; phase < 2; phase += 0.25) {
    const field = new ObstacleField([hammer(100, 1, phase, 0)]);
    const r = racer();
    giveGift(r, SMALL);
    const hits = runThrough(r, field, 4);
    assert.equal(hits.length, 0, `phase ${phase} không được dính khi có khiên`);
    assert.ok(r.dist > 120);
  }
});

test('có khiên thì không cố né: cứ lao thẳng; hết khiên lại tự né', () => {
  const field = new ObstacleField([spike(100, 1, 0)]);
  const alwaysNotice = () => 0;
  const shielded = racer(0.9);
  giveGift(shielded, SMALL);
  let now = 0;
  for (let t = 0; t < 2; t += 1 / 60) {
    now += 1 / 60;
    stepRacer(shielded, 1 / 60, { now, cfg: CONFIG, rng: alwaysNotice, field });
  }
  assert.equal(shielded.targetLane, 1, 'không đổi làn');
  assert.equal(shielded.hits, 0);

  const bare = racer(0.9);
  now = 0;
  for (let t = 0; t < 2; t += 1 / 60) {
    now += 1 / 60;
    stepRacer(bare, 1 / 60, { now, cfg: CONFIG, rng: alwaysNotice, field });
  }
  assert.notEqual(bare.targetLane, 1, 'không khiên thì đổi làn né');
});

test('khiên sắp hết trước khi tới chướng ngại thì vẫn tự né', () => {
  const field = new ObstacleField([spike(100, 1, 0)]);
  const r = racer(0.9);
  r.shield = 0.2; // sắp hết
  r.dist = 60;
  perceiveOnce(r, field);
  assert.ok(r.plan, 'khiên không kịp bảo vệ nên phải né');
});

function perceiveOnce(r, field) {
  stepRacer(r, 1 / 60, { now: 0, cfg: CONFIG, rng: () => 0, field });
}

test('GiftBoost: quà của người đang đua cho khiên và boost nhân vật của chính họ, kèm sự kiện', () => {
  const { manager, giftBoost } = setup();
  const events = [];
  manager.addListener((e) => e.type === 'boost' && events.push(e));
  const mine = manager.racerOf('u1');
  const res = giftBoost.handle(gift('u1', 5000, 'Sư tử'));
  assert.equal(res.racer, mine);
  assert.equal(res.tier, LARGE);
  assert.equal(mine.shield, 5);
  assert.equal(mine.boostMul, LARGE.boostMultiplier);
  assert.ok(manager.racers.filter((r) => r !== mine).every((r) => r.shield === 0), 'không ảnh hưởng người khác');
  assert.equal(events.length, 1);
  assert.equal(events[0].source, 'gift');
  assert.equal(events[0].senderName, 'Tên_u1');
  assert.deepEqual(events[0].gift, { name: 'Sư tử', diamonds: 5000 });
});

test('GiftBoost: người chưa có nhân vật tặng quà thì cổ vũ ngẫu nhiên một người thật', () => {
  const { manager, giftBoost } = setup(3);
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    const res = giftBoost.handle(gift(`khan_gia_${i}`, 10));
    assert.equal(res.cheered, true);
    assert.ok(!res.racer.isBot);
    seen.add(res.racer.userId);
  }
  assert.ok(seen.size > 1);
  assert.ok(manager.racers.filter((r) => r.isBot).every((r) => r.shield === 0));
});

test('GiftBoost: nhận lúc chờ và đếm ngược (hiệu lực khi đua), bỏ qua ở màn kết quả', () => {
  const { manager, giftBoost } = setup();
  assert.equal(manager.state, 'wait');
  assert.ok(giftBoost.handle(gift('u0', 10)));
  while (manager.state !== 'countdown') manager.update(1 / 30);
  assert.ok(giftBoost.handle(gift('u1', 10)));
  assert.equal(manager.racerOf('u1').shield, 5, 'khiên chưa bị trừ trước khi đua');
  while (manager.state !== 'race') manager.update(1 / 30);
  assert.ok(manager.racerOf('u0').shield > 4.9, 'khiên mua lúc chờ vẫn còn gần đủ lúc xuất phát');
  while (manager.state !== 'result') manager.update(1 / 30);
  assert.equal(giftBoost.handle(gift('u2', 10)), null);
});
