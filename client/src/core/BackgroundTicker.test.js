import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BackgroundTicker } from './BackgroundTicker.js';

function make(opts = {}) {
  let t = 0;
  const calls = { beat: 0, stale: [] };
  let fire;
  const ticker = new BackgroundTicker({
    onBeat: () => calls.beat++,
    onStale: (dt) => calls.stale.push(dt),
    now: () => t,
    makeTimer: (fn) => { fire = fn; return { stop() {} }; },
    ...opts,
  });
  return { ticker, calls, beat: (ms) => { t += ms; fire(); }, advance: (ms) => { t += ms; }, tick: () => fire() };
}

test('khung hình chạy đều thì không chạy bù, nhưng vẫn đều nhịp nhạc', () => {
  const { ticker, calls, beat, advance } = make();
  for (let i = 0; i < 10; i++) {
    advance(16);
    ticker.frame();
    beat(100);
    ticker.frame();
  }
  assert.equal(calls.stale.length, 0);
  assert.equal(calls.beat, 10);
});

test('khung hình ngừng (tab ẩn) thì mỗi nhịp chạy bù đúng thời gian đã trôi', () => {
  const { ticker, calls, beat } = make();
  ticker.frame();
  beat(100); // chưa đủ staleMs
  assert.equal(calls.stale.length, 0);
  beat(100); // 200
  beat(100); // 300 >= 250
  assert.equal(calls.stale.length, 1);
  assert.ok(Math.abs(calls.stale[0] - 0.3) < 1e-9);
  beat(100);
  beat(100);
  beat(100);
  assert.equal(calls.stale.length, 2, 'chạy bù tiếp, không chạy trùng đoạn đã bù');
  assert.ok(Math.abs(calls.stale[1] - 0.3) < 1e-9);
});

test('khoảng trống quá dài (máy ngủ) thì chỉ bù tối đa maxCatchUpMs', () => {
  const { ticker, calls, beat } = make();
  ticker.frame();
  beat(60000);
  assert.equal(calls.stale[0], 1);
});

test('stop dừng bộ đếm', () => {
  let stopped = false;
  const { ticker } = make({ makeTimer: () => ({ stop: () => { stopped = true; } }) });
  ticker.stop();
  assert.equal(stopped, true);
});
