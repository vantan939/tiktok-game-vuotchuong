import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpeechQueue } from './Mc.js';

const line = (text, priority) => ({ text, priority });

test('SpeechQueue: rảnh thì nói ngay, bận thì xếp hàng câu quan trọng, bỏ câu phụ', () => {
  const q = new SpeechQueue(2);
  assert.equal(q.offer(line('a', 2)), 'speak');
  assert.equal(q.offer(line('phụ', 1)), 'dropped', 'câu phụ khi MC bận thì bỏ');
  assert.equal(q.offer(line('b', 2)), 'queued');
  assert.equal(q.next()?.text, 'b');
  assert.equal(q.next(), null);
});

test('SpeechQueue: câu ưu tiên cao hơn chen lên, cắt câu đang nói và xoá câu chờ thấp hơn', () => {
  const q = new SpeechQueue(2);
  q.offer(line('phụ', 1), 0);
  q.offer(line('sự kiện', 2), 0); // chen được lên câu phụ đang nói
  assert.equal(q.current.text, 'sự kiện');
  q.offer(line('chờ', 2), 0);
  assert.equal(q.offer(line('xuất phát', 3), 0), 'speak');
  assert.equal(q.current.text, 'xuất phát');
  assert.equal(q.next(0), null, 'câu chờ ưu tiên thấp hơn đã bị xoá');
});

test('SpeechQueue: hàng đợi đầy thì bỏ câu thấp nhất; câu chờ quá lâu thì bỏ; chọn ưu tiên cao trước', () => {
  const q = new SpeechQueue(2);
  q.offer(line('đang nói', 2), 0);
  assert.equal(q.offer(line('x', 2), 0), 'queued');
  assert.equal(q.offer(line('y', 2), 0), 'queued');
  assert.equal(q.offer(line('z', 2), 0), 'dropped', 'đầy và không hơn câu nào');
  const q2 = new SpeechQueue(2);
  q2.offer(line('đang nói', 3), 0);
  q2.offer(line('thấp', 2), 0);
  q2.offer(line('thấp 2', 2), 0);
  assert.equal(q2.offer(line('cao', 3), 0), 'queued', 'đẩy bớt một câu thấp');
  assert.equal(q2.next(0).text, 'cao', 'ưu tiên cao nói trước');
  const q3 = new SpeechQueue(2);
  q3.offer(line('đang nói', 3), 0);
  q3.offer(line('cũ', 2), 0);
  assert.equal(q3.next(60000), null, 'chờ quá lâu thì bỏ');
});
