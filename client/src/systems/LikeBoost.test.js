import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { Lobby } from './Lobby.js';
import { RaceManager } from './RaceManager.js';
import { LikeBoost, giveLike } from './LikeBoost.js';
import { createRacer } from './Racer.js';
import { stepRacer } from './RacerAI.js';
import { EventBus } from '../core/EventBus.js';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const NAMES = Array.from({ length: 60 }, (_, i) => `Bot${i}`);
const SHORT = { ...CONFIG, trackLength: 5000, roundSeconds: 600 };

function newRacer() {
  return createRacer({ userId: 'x', nickname: 'x' }, { stats: { speed: 36, dodgeSkill: 0.6, reaction: 0.3 } });
}

function startRace(realPlayers = 3) {
  const rng = seeded(8);
  const lobby = new Lobby({ cfg: SHORT, rng, botNames: NAMES });
  const manager = new RaceManager(lobby, { cfg: SHORT, rng, skinCount: 8 });
  for (let i = 0; i < realPlayers; i++) lobby.join({ userId: `u${i}`, nickname: `Người${i}` });
  manager.begin();
  while (manager.state !== 'race') manager.update(1 / 30);
  return { manager, likeBoost: new LikeBoost(manager, SHORT) };
}

const like = (userId, likeCount = 1) => ({ type: 'like', userId, nickname: userId, avatarUrl: '', likeCount });

test('giveLike: một lần chạm cho ~1 giây boost, tốc độ x1,6', () => {
  const r = newRacer();
  const gained = giveLike(r, 1, 0);
  assert.ok(Math.abs(gained - CONFIG.likeBoostSeconds) < 1e-9);
  assert.equal(r.boostMul, CONFIG.likeBoostMultiplier);
  assert.equal(r.boostMul, 1.6);
});

test('giveLike: cộng dồn nhưng không vượt trần 4 giây', () => {
  const r = newRacer();
  for (let i = 0; i < 100; i++) giveLike(r, 5, 0);
  assert.ok(r.boost <= CONFIG.likeBoostMaxSeconds + 1e-9);
  assert.ok(r.boost > CONFIG.likeBoostMaxSeconds - 0.01, 'spam mạnh thì chạm trần');
});

test('giveLike: thả liên tục thì hiệu quả giảm dần, nghỉ thì hồi lại', () => {
  const r = newRacer();
  const gains = [];
  for (let i = 0; i < 6; i++) {
    r.boost = 0; // bỏ qua trần để chỉ so sánh hiệu quả từng lần
    gains.push(giveLike(r, 1, i * 0.1));
  }
  for (let i = 1; i < gains.length; i++) assert.ok(gains[i] < gains[i - 1], `lần ${i + 1} phải ít hơn lần trước`);
  r.boost = 0;
  const afterRest = giveLike(r, 1, 30); // nghỉ 30 giây
  assert.ok(afterRest > gains.at(-1) * 2 && afterRest > 0.95, `sau khi nghỉ hồi lại ${afterRest}`);
});

test('giveLike: sự kiện gộp nhiều lần chạm chỉ tính tối đa likeMaxTapsPerEvent', () => {
  const a = newRacer();
  const b = newRacer();
  giveLike(a, 5, 0);
  giveLike(b, 500, 0);
  assert.equal(a.boost, b.boost);
});

test('giveLike: không làm ngắn boost đang có (vd. quà)', () => {
  const r = newRacer();
  r.boost = 6;
  r.boostMul = 2.2;
  giveLike(r, 3, 0);
  assert.equal(r.boost, 6);
  assert.equal(r.boostMul, 2.2, 'giữ mức boost mạnh hơn');
});

// Chạy 30 giây trên đường trống, thả tim theo lịch; trả về quãng đường
function distanceWithLikes(everySeconds, taps) {
  const r = newRacer();
  r.wanderTimer = 1e9;
  let now = 0;
  let nextLike = 0;
  const dt = 1 / 30;
  while (now < 30) {
    if (everySeconds && now >= nextLike) {
      giveLike(r, taps, now);
      nextLike += everySeconds;
    }
    now += dt;
    stepRacer(r, dt, { now, cfg: { ...CONFIG, trackLength: 1e9 } });
  }
  return r.dist;
}

test('spam tim không thắng tuyệt đối: thả vừa phải còn lợi hơn spam, cả hai đều hơn không thả', () => {
  const none = distanceWithLikes(0, 0);
  const spam = distanceWithLikes(0.1, 5); // 10 lần mỗi giây, mỗi lần 5 chạm
  const moderate = distanceWithLikes(1, 1); // 1 lần chạm mỗi giây
  assert.ok(spam > none, 'spam vẫn nhanh hơn không thả');
  assert.ok(moderate > spam, `vừa phải ${moderate.toFixed(0)} phải hơn spam ${spam.toFixed(0)}`);
  const maxPossible = none * CONFIG.likeBoostMultiplier;
  assert.ok(spam < none + (maxPossible - none) * 0.25, 'spam chỉ được tối đa khoảng một phần tư lợi thế boost liên tục');
  assert.ok(moderate < maxPossible * 0.9, 'thả vừa phải cũng không boost liên tục');
});

test('LikeBoost: tim của người đang đua tăng tốc nhân vật của chính họ', () => {
  const { manager, likeBoost } = startRace();
  const mine = manager.racerOf('u1');
  const res = likeBoost.handle(like('u1'));
  assert.equal(res.racer, mine);
  assert.ok(mine.boost > 0.9 && mine.boostMul === 1.6);
  assert.ok(manager.racers.filter((r) => r !== mine).every((r) => r.boost === 0), 'không ảnh hưởng người khác');
});

test('LikeBoost: mỗi người chỉ tính một lần mỗi likeCooldownSeconds', () => {
  const { manager, likeBoost } = startRace();
  assert.ok(likeBoost.handle(like('u1')));
  assert.equal(likeBoost.handle(like('u1')), null, 'trong thời gian chờ');
  for (let t = 0; t < CONFIG.likeCooldownSeconds + 0.05; t += 1 / 30) manager.update(1 / 30);
  assert.ok(likeBoost.handle(like('u1')), 'hết thời gian chờ thì tính lại');
  assert.ok(likeBoost.handle(like('u2')), 'người khác không bị ảnh hưởng');
});

test('LikeBoost: chưa đua (đếm ngược) thì chưa tính tim', () => {
  const rng = seeded(2);
  const lobby = new Lobby({ cfg: SHORT, rng, botNames: NAMES });
  const manager = new RaceManager(lobby, { cfg: SHORT, rng, skinCount: 8 });
  lobby.join({ userId: 'u1', nickname: 'A' });
  manager.begin();
  const likeBoost = new LikeBoost(manager, SHORT);
  assert.equal(likeBoost.handle(like('u1')), null);
  assert.equal(manager.racerOf('u1').boost, 0);
});

test('LikeBoost: người chưa có nhân vật (hàng đợi, chưa join) thả tim thì không ai được tăng tốc', () => {
  const { manager, likeBoost } = startRace(3);
  for (let i = 0; i < 40; i++) assert.equal(likeBoost.handle(like(`khan_gia_${i}`)), null);
  assert.ok(manager.racers.every((r) => r.boost === 0), 'không ảnh hưởng người nào');
});

test('LikeBoost: nhân vật đã về đích thì tim không còn tác dụng', () => {
  const { manager, likeBoost } = startRace();
  manager.racerOf('u1').finished = true;
  assert.equal(likeBoost.handle(like('u1')), null);
});

test('LikeBoost: phát sự kiện boost để hiển thị hiệu ứng', () => {
  const { manager, likeBoost } = startRace();
  const events = [];
  manager.addListener((e) => e.type === 'boost' && events.push(e));
  likeBoost.handle(like('u0'));
  assert.equal(events.length, 1);
  assert.equal(events[0].source, 'like');
  assert.equal(events[0].racer, manager.racerOf('u0'));
});

test('LikeBoost: nối qua EventBus nhận sự kiện like', () => {
  const { manager, likeBoost } = startRace();
  const bus = new EventBus();
  bus.on('like', (e) => likeBoost.handle(e));
  bus.emit(like('u2', 3));
  assert.ok(manager.racerOf('u2').boost > 0);
});
