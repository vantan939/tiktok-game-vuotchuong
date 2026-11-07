import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, parseCommand, isValidEvent } from './events.js';

test('normalizeText: chữ thường, bỏ dấu, bỏ khoảng trắng thừa', () => {
  assert.equal(normalizeText('JOIN'), 'join');
  assert.equal(normalizeText('Join'), 'join');
  assert.equal(normalizeText('  S '), 's');
  assert.equal(normalizeText('Đại   Chiến'), 'dai chien');
  assert.equal(normalizeText(undefined), '');
});

test('parseCommand: nhận join mọi kiểu viết', () => {
  for (const t of ['join', 'JOIN', 'Join', ' join ', 'jơin']) {
    assert.ok(parseCommand(t), `"${t}" phải hợp lệ`);
  }
  assert.equal(parseCommand('JOIN'), 'join');
});

test('parseCommand: bỏ qua bình luận khác', () => {
  for (const t of ['', 'sss', 'join đi', 'hello', 'su', 'join join', '1', null, 's', 'S', ' s ']) { // lệnh s đã bỏ
    assert.equal(parseCommand(t), null, `"${t}" phải bị bỏ qua`);
  }
});

test('isValidEvent: kiểm tra đúng dạng sự kiện', () => {
  const base = { userId: 'u1', nickname: 'A', avatarUrl: '' };
  assert.ok(isValidEvent({ type: 'chat', text: 'join', ...base }));
  assert.ok(isValidEvent({ type: 'like', likeCount: 3, ...base }));
  assert.ok(isValidEvent({ type: 'gift', giftName: 'Kem', diamonds: 10, ...base }));
  assert.ok(!isValidEvent({ type: 'like', likeCount: 0, ...base }));
  assert.ok(!isValidEvent({ type: 'chat', ...base }));
  assert.ok(!isValidEvent({ type: 'khac', ...base }));
  assert.ok(!isValidEvent(null));
});
