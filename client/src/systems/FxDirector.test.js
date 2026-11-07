import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { FxDirector } from './FxDirector.js';

const racer = (over = {}) => ({ isBot: false, rank: 20, nickname: 'x', ...over });
const texts = (cues) => cues.filter((c) => c.kind === 'text');
const sounds = (cues) => cues.filter((c) => c.kind === 'sound').map((c) => c.name);

test('né hoàn hảo: người thật có chữ và tiếng; bot ngoài top thì im lặng', () => {
  const d = new FxDirector(CONFIG);
  const cues = d.handle({ type: 'dodge', racer: racer() }, 10);
  assert.equal(texts(cues)[0].text, 'Né hoàn hảo!');
  assert.deepEqual(sounds(cues), ['dodge']);
  assert.deepEqual(d.handle({ type: 'dodge', racer: racer({ isBot: true, rank: 12 }) }, 20), []);
  assert.equal(texts(d.handle({ type: 'dodge', racer: racer({ isBot: true, rank: 2 }) }, 30)).length, 1);
});

test('chữ nổi bị giới hạn: toàn cục có khoảng cách, từng nhân vật có thời gian nghỉ', () => {
  const d = new FxDirector(CONFIG);
  const a = racer();
  const b = racer();
  assert.equal(texts(d.handle({ type: 'dodge', racer: a }, 10)).length, 1);
  assert.equal(texts(d.handle({ type: 'dodge', racer: b }, 10.1)).length, 0, 'quá sát chữ trước');
  assert.equal(texts(d.handle({ type: 'dodge', racer: b }, 10.5)).length, 1);
  assert.equal(texts(d.handle({ type: 'dodge', racer: a }, 11)).length, 0, 'a còn đang nghỉ');
  assert.equal(texts(d.handle({ type: 'dodge', racer: a }, 13)).length, 1);
});

test('dính chướng ngại: luôn có tiếng, bot ngoài top nhỏ tiếng hơn và không có chữ', () => {
  const d = new FxDirector(CONFIG);
  const real = d.handle({ type: 'hit', racer: racer() }, 5);
  assert.equal(real.find((c) => c.name === 'hit').volume, 1);
  assert.equal(texts(real)[0].text, 'Choáng!');
  const bot = d.handle({ type: 'hit', racer: racer({ isBot: true, rank: 15 }) }, 9);
  assert.equal(bot.find((c) => c.name === 'hit').volume, 0.5);
  assert.equal(texts(bot).length, 0);
});

test('quà: luôn hiện tên người tặng, kể cả cho bot và không bị giới hạn tần suất', () => {
  const d = new FxDirector(CONFIG);
  const ev = (name) => ({ type: 'boost', source: 'gift', racer: racer({ isBot: true, rank: 20 }), senderName: name, gift: { name: 'Hoa hồng' }, tier: { announce: false } });
  const c1 = d.handle(ev('Lan'), 1);
  const c2 = d.handle(ev('Minh'), 1.01);
  assert.equal(texts(c1)[0].text, 'Lan tặng Hoa hồng');
  assert.equal(texts(c2)[0].text, 'Minh tặng Hoa hồng');
  assert.ok(sounds(c1).includes('gift'));
});

test('tim: có tiếng mỗi lần, chữ "Bay vút!" thưa theo likeTextGap; tim quá nhỏ bị bỏ qua', () => {
  const d = new FxDirector(CONFIG);
  const r = racer();
  const like = (seconds) => ({ type: 'boost', source: 'like', racer: r, seconds });
  assert.equal(texts(d.handle(like(1), 10))[0].text, 'Bay vút!');
  const again = d.handle(like(1), 11);
  assert.deepEqual(sounds(again), ['boost']);
  assert.equal(texts(again).length, 0);
  assert.equal(texts(d.handle(like(1), 14)).length, 1);
  assert.deepEqual(d.handle(like(0), 30), []);
});
