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

test('Mc: câu không báo xong (kẹt) bị bỏ sau watchdog để MC nói tiếp; câu xong bình thường thì nói câu kế', async () => {
  const { Mc } = await import('./Mc.js');
  const spoken = [];
  const finishers = [];
  const remote = {
    enabled: true,
    init: async () => {},
    cancel() {},
    speak(text, done) {
      spoken.push(text);
      finishers.push(done);
    },
  };
  const cfg = { enabled: true, maxQueue: 2, watchdogMs: 20, lang: 'vi', rate: 1, pitch: 1, volume: 1 };
  const mc = new Mc(cfg, { remote });
  mc.say([{ text: 'một', priority: 2 }, { text: 'hai', priority: 2 }]);
  assert.deepEqual(spoken, ['một']);
  finishers[0](); // xong câu một thì tự nói câu hai
  assert.deepEqual(spoken, ['một', 'hai']);
  // câu hai kẹt: không báo xong. Câu phụ bị bỏ vì MC đang bận...
  mc.say([{ text: 'phụ', priority: 1 }]);
  assert.deepEqual(spoken, ['một', 'hai']);
  // ...nhưng quá watchdog thì MC được giải phóng và nói tiếp
  await new Promise((r) => setTimeout(r, 40));
  mc.say([{ text: 'ba', priority: 1 }]);
  assert.deepEqual(spoken, ['một', 'hai', 'ba']);
});

test('Mc: chưa ai bấm vào trang thì thử phát âm thanh im lặng; được (cờ autoplay) thì nói luôn, không được thì chờ người dùng bấm', async () => {
  const { Mc } = await import('./Mc.js');
  const realNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const realAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  const setNav = (hasBeenActive) => Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userActivation: { hasBeenActive } } });
  const spoken = [];
  const remote = { enabled: true, init: async () => {}, cancel() {}, speak: (text) => spoken.push(text) };
  const cfg = { enabled: true, maxQueue: 2, watchdogMs: 1e9, lang: 'vi', rate: 1, pitch: 1, volume: 1 };
  try {
    // 1. Trình duyệt cho phát không cần bấm (mở bằng --autoplay-policy): thử im lặng thành công thì nói được
    setNav(false);
    Object.defineProperty(globalThis, 'Audio', { configurable: true, value: class { play() { return Promise.resolve(); } pause() {} } });
    const a = new Mc(cfg, { remote });
    a.say([{ text: 'một', priority: 2 }]);
    assert.deepEqual(spoken, [], 'lần đầu chưa biết có được không nên bỏ');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(a.autoplayOk, true);
    a.say([{ text: 'hai', priority: 2 }]);
    assert.deepEqual(spoken, ['hai'], 'đã biết được phát thì nói không cần bấm');

    // 2. Trình duyệt chặn: im lặng cho tới khi người dùng bấm vào trang
    spoken.length = 0;
    Object.defineProperty(globalThis, 'Audio', { configurable: true, value: class { play() { return Promise.reject(new Error('NotAllowedError')); } pause() {} } });
    const b = new Mc(cfg, { remote });
    b.say([{ text: 'ba', priority: 2 }]);
    await new Promise((r) => setTimeout(r, 10));
    b.say([{ text: 'bốn', priority: 2 }]);
    assert.deepEqual(spoken, [], 'bị chặn thì không nói');
    setNav(true); // người dùng đã bấm
    b.say([{ text: 'năm', priority: 2 }]);
    assert.deepEqual(spoken, ['năm']);
  } finally {
    if (realNav) Object.defineProperty(globalThis, 'navigator', realNav);
    if (realAudio) Object.defineProperty(globalThis, 'Audio', realAudio);
    else delete globalThis.Audio;
  }
});
