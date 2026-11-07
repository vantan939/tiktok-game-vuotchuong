import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { McDirector, PRIORITY, spokenName } from './McDirector.js';

const rng = () => 0; // luôn chọn câu đầu tiên
const real = (nickname = 'Lan') => ({ isBot: false, nickname });
const bot = (nickname = 'Bot') => ({ isBot: true, nickname });
const texts = (lines) => lines.map((l) => l.text);

test('spokenName: bỏ ký tự lạ, cắt ngắn, trống thì gọi là bạn', () => {
  assert.equal(spokenName('Lan_Anh😀★'), 'LanAnh');
  assert.equal(spokenName('  Minh   Gaming '), 'Minh Gaming');
  assert.equal(spokenName('Nguyễn Thị Hồng Nhung Dài Quá Mức'.padEnd(40, 'x')).length <= 14, true);
  assert.equal(spokenName('😀😀'), 'bạn');
  assert.equal(spokenName(null), 'bạn');
});

test('trạng thái: chào ở lượt chờ (thưa), chuẩn bị + đếm ngược, xuất phát, người thắng', () => {
  const mc = new McDirector(CONFIG, rng);
  assert.match(texts(mc.onState('wait', {}, 0))[0], /Chào mừng/);
  assert.deepEqual(mc.onState('wait', {}, 30), [], 'chào lại quá sớm thì bỏ');
  assert.equal(mc.onState('wait', {}, 200).length, 1, 'đủ lâu thì chào lại');
  assert.equal(mc.onState('countdown', {}, 1).length, 2);
  const go = mc.onState('race', {}, 5);
  assert.equal(go[0].priority, PRIORITY.key);
  const win = mc.onState('result', { result: { winner: bot('RainDev'), finished: true } }, 9);
  assert.match(win[0].text, /RainDev về nhất/);
  const timeUp = mc.onState('result', { result: { winner: real('Lan'), finished: false } }, 9);
  assert.match(timeUp[0].text, /Hết giờ! Lan/);
});

test('join: nói tên người vào đua, có khoảng nghỉ', () => {
  const mc = new McDirector(CONFIG, rng);
  assert.match(mc.onJoin('Lan', 0)[0].text, /Lan vào đua/);
  assert.deepEqual(mc.onJoin('Minh', 1), []);
  assert.equal(mc.onJoin('Minh', 10).length, 1);
});

test('sự kiện: chỉ bình luận người thật; né, dính, tim có khoảng nghỉ riêng', () => {
  const mc = new McDirector(CONFIG, rng);
  assert.deepEqual(mc.onEvent({ type: 'dodge', racer: bot() }, 0), [], 'bot thì im');
  assert.equal(mc.onEvent({ type: 'dodge', racer: real() }, 0)[0].priority, PRIORITY.chatter);
  assert.deepEqual(mc.onEvent({ type: 'dodge', racer: real() }, 3), [], 'né liên tục thì bỏ qua');
  assert.match(mc.onEvent({ type: 'hit', racer: real('Lan') }, 3)[0].text, /Lan/);
  const like = { type: 'boost', source: 'like', seconds: 1, racer: real('Lan') };
  assert.equal(mc.onEvent(like, 5).length, 1);
  assert.deepEqual(mc.onEvent({ ...like, seconds: 0 }, 50), [], 'tim quá nhỏ thì bỏ');
});

test('quà: luôn được cảm ơn bằng tên người tặng, quà lớn nói nhiệt tình hơn, ưu tiên cao hơn tim', () => {
  const mc = new McDirector(CONFIG, rng);
  const ev = (announce) => ({ type: 'boost', source: 'gift', racer: bot(), senderName: 'Lan_😀', gift: { name: 'Hoa hồng' }, tier: { announce } });
  const a = mc.onEvent(ev(false), 0)[0];
  const b = mc.onEvent(ev(true), 0.1)[0];
  assert.equal(a.text, 'Cảm ơn Lan đã tặng Hoa hồng! Bay vút luôn!');
  assert.match(b.text, /^Wow! Lan tặng Hoa hồng/);
  assert.ok(a.priority > PRIORITY.chatter);
});

function fakeManager({ state = 'race', ranking = [], raceTime = 0, roundSeconds = 180 } = {}) {
  return { state, ranking, raceTime, cfg: { roundSeconds } };
}

test('update: xướng tên người dẫn đầu khi giữ vị trí đủ lâu, sắp về đích và 10 giây cuối chỉ báo một lần', () => {
  const mc = new McDirector(CONFIG, rng);
  const a = { nickname: 'Lan', dist: 100 };
  const b = { nickname: 'Minh', dist: 90 };
  assert.deepEqual(mc.update(fakeManager({ ranking: [a, b] }), 0), [], 'mới dẫn đầu chưa nói');
  assert.match(texts(mc.update(fakeManager({ ranking: [a, b] }), CONFIG.mc.leaderHoldSeconds + 0.1))[0], /Lan/);
  assert.deepEqual(mc.update(fakeManager({ ranking: [a, b] }), 5), [], 'không nhắc lại cùng một người');
  // đổi người dẫn đầu nhưng chưa giữ đủ lâu thì chưa nói; giữ đủ lâu và hết khoảng nghỉ thì nói
  assert.deepEqual(mc.update(fakeManager({ ranking: [b, a] }), 20), []);
  assert.match(texts(mc.update(fakeManager({ ranking: [b, a] }), 22))[0], /Minh/);
  const near = { nickname: 'Minh', dist: CONFIG.trackLength * 0.9 };
  assert.equal(texts(mc.update(fakeManager({ ranking: [near, a] }), 23)).filter((t) => /về đích|mét cuối/.test(t)).length, 1);
  assert.equal(texts(mc.update(fakeManager({ ranking: [near, a] }), 24)).filter((t) => /về đích|mét cuối/.test(t)).length, 0, 'chỉ một lần');
  assert.equal(texts(mc.update(fakeManager({ ranking: [near, a], raceTime: 172 }), 25)).filter((t) => /mười giây/.test(t)).length, 1);
  assert.deepEqual(mc.update(fakeManager({ state: 'wait', ranking: [a] }), 30), [], 'không đua thì không nói');
  mc.onRound();
  assert.equal(texts(mc.update(fakeManager({ ranking: [near, a], raceTime: 175 }), 60)).filter((t) => /mười giây/.test(t)).length, 1, 'lượt mới báo lại được');
});
