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
  assert.equal(mc.onState('countdown', {}, 1).length, 1, 'chỉ báo chuẩn bị; ba hai một đọc đúng lúc còn 3 giây');
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
  const mc = new McDirector({ ...CONFIG, mc: { ...CONFIG.mc, idleSeconds: 1e9 } }, rng); // tắt câu xen kẽ để thử riêng phần này
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

test('im quá lâu khi đang đua thì nói xen một câu, rồi im một lúc; không nói ngoài lúc đua', () => {
  const mc = new McDirector(CONFIG, rng);
  const idle = CONFIG.mc.idleSeconds;
  const a = { nickname: 'Lan', dist: 100 };
  const b = { nickname: 'Minh', dist: 90 };
  const m = fakeManager({ ranking: [a, b] });
  mc.update(m, 0);
  assert.match(texts(mc.update(m, 2))[0], /Lan đang dẫn đầu/, 'xướng người dẫn đầu trước');
  assert.deepEqual(mc.update(m, 2 + idle - 1), [], 'chưa đủ lâu thì im');
  const filler = mc.update(m, 2 + idle + 0.1);
  assert.equal(filler.length, 1);
  assert.equal(filler[0].priority, PRIORITY.chatter);
  assert.deepEqual(mc.update(m, 2 + idle + 0.1 + idle - 1), [], 'vừa nói xong thì im một lúc');
  assert.deepEqual(mc.update(fakeManager({ state: 'wait', ranking: [a, b] }), 500), [], 'không đua thì không nói xen');
});

test('câu xen kẽ không lặp liền nhau và có đủ các loại', () => {
  let i = 0;
  const seq = [0.9, 0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 0.9, 0.9, 0.9, 0.9, 0.9];
  const mc = new McDirector(CONFIG, () => seq[i++ % seq.length]);
  const lines = [];
  for (let k = 0; k < 12; k++) lines.push(...mc.update(fakeManager({ ranking: [{ nickname: 'Lan', dist: 1 }] }), 100 + k * 100).map((l) => l.text));
  assert.ok(lines.length >= 10);
  for (let k = 1; k < lines.length; k++) assert.notEqual(lines[k], lines[k - 1]);
});

test('bot trong top 3 cũng được bình luận khi né, dính; bot ngoài top thì không', () => {
  const mc = new McDirector(CONFIG, rng);
  assert.match(mc.onEvent({ type: 'dodge', racer: { isBot: true, rank: 2, nickname: 'RainDev' } }, 0)[0].text, /./);
  assert.match(mc.onEvent({ type: 'hit', racer: { isBot: true, rank: 3, nickname: 'Cherry' } }, 0)[0].text, /Cherry/);
  assert.deepEqual(mc.onEvent({ type: 'dodge', racer: { isBot: true, rank: 8, nickname: 'X' } }, 50), []);
});

test('đếm ngược dài: nhắc vào đua ở giữa, đọc ba hai một đúng lúc còn 3 giây, mỗi câu một lần', () => {
  const mc = new McDirector(CONFIG, rng);
  const at = (left) => mc.update({ state: 'countdown', countdownValue: left }, 0);
  assert.deepEqual(at(10), []);
  assert.deepEqual(at(7), [], 'chưa tới giữa');
  assert.match(texts(at(6))[0], /gõ join/);
  assert.deepEqual(at(5), [], 'chỉ một lần');
  assert.match(texts(at(3))[0], /Ba! Hai! Một!/);
  assert.deepEqual(at(2), []);
  mc.onRound();
  assert.match(texts(at(3))[0], /Ba! Hai! Một!/, 'lượt mới nói lại');
});
