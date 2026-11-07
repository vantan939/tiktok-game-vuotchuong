import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { EventBus } from '../core/EventBus.js';
import { WebSocketSource } from '../sources/WebSocketSource.js';
import { NetStatus, backoffMs } from './NetStatus.js';

const cfg = CONFIG.net;

test('backoffMs: 1, 2, 4, 8, 16, 30, 30 giây, tối đa 30 giây', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 20].map((a) => backoffMs(a, cfg)), [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
});

test('NetStatus: xanh khi mở và server báo nối được; vàng khi server nối lại; đỏ khi server báo mất', () => {
  const n = new NetStatus(cfg, 0);
  assert.equal(n.color(0), 'yellow', 'đang kết nối lần đầu');
  n.onOpen(1000);
  assert.equal(n.color(1000), 'green');
  assert.equal(n.label(1000), 'Đang nhận sự kiện');
  n.onServerStatus({ state: 'reconnecting' });
  assert.equal(n.color(2000), 'yellow');
  n.onServerStatus({ state: 'disconnected', detail: 'chưa live' });
  assert.equal(n.color(3000), 'red');
  assert.match(n.label(3000), /Mất kết nối: chưa live/);
  n.onServerStatus({ state: 'connected' });
  assert.equal(n.color(4000), 'green');
  n.onServerStatus({ state: 'bậy bạ' });
  assert.equal(n.color(4000), 'green', 'tin lạ bị bỏ qua');
});

test('NetStatus: đứt WebSocket thì vàng, quá redAfterMs thì đỏ, nối lại được thì xanh', () => {
  const n = new NetStatus(cfg, 0);
  n.onOpen(0);
  n.onClose(5000);
  assert.equal(n.color(5000), 'yellow');
  assert.equal(n.color(5000 + cfg.redAfterMs - 1), 'yellow');
  assert.equal(n.color(5000 + cfg.redAfterMs), 'red');
  assert.equal(n.label(20000), 'Mất kết nối');
  n.onOpen(30000);
  assert.equal(n.color(30000), 'green');
});

test('NetStatus: kết nối mở nhưng im lặng quá staleMs thì coi là chết ngầm; có tin nhắn thì hết', () => {
  const n = new NetStatus(cfg, 0);
  n.onOpen(0);
  assert.equal(n.isStale(cfg.staleMs), false);
  assert.equal(n.isStale(cfg.staleMs + 1), true);
  n.onMessage(cfg.staleMs);
  assert.equal(n.isStale(cfg.staleMs + 1), false);
  n.onClose(100000);
  assert.equal(n.isStale(999999), false, 'đã đóng thì không tính');
});

// WebSocket giả và đồng hồ giả
function fakeEnv() {
  let t = 0;
  const timers = [];
  const sockets = [];
  const logs = [];
  const env = {
    now: () => t,
    setTimer: (fn, ms) => {
      const x = { fn, at: t + ms, on: true };
      timers.push(x);
      return x;
    },
    clearTimer: (x) => x && (x.on = false),
    setRepeat: (fn, ms) => {
      const x = { fn, every: ms, at: t + ms, on: true, repeat: true };
      timers.push(x);
      return x;
    },
    clearRepeat: (x) => x && (x.on = false),
    createSocket: () => {
      const s = { closed: false, close() { if (!this.closed) { this.closed = true; this.onclose?.(); } } };
      sockets.push(s);
      return s;
    },
    log: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')) },
  };
  return {
    env, sockets, logs,
    advance(ms) {
      const end = t + ms;
      for (;;) {
        const due = timers.filter((x) => x.on && x.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        t = due.at;
        if (due.repeat) due.at += due.every;
        else due.on = false;
        due.fn();
      }
      t = end;
    },
    get t() {
      return t;
    },
  };
}

test('WebSocketSource: tự nối lại với thời gian chờ tăng dần tối đa 30 giây, khôi phục thì xanh và nhận sự kiện tiếp', () => {
  const f = fakeEnv();
  const bus = new EventBus();
  const got = [];
  bus.on('*', (e) => got.push(e.type));
  const src = new WebSocketSource(bus, 'ws://x', { ...f.env });
  src.start();
  const open = (s) => {
    s.onopen();
    s.onmessage({ data: JSON.stringify({ type: 'status', state: 'connected' }) });
  };
  open(f.sockets[0]);
  f.sockets[0].onmessage({ data: JSON.stringify({ type: 'chat', userId: 'u1', nickname: 'Lan', avatarUrl: '', text: 'join' }) });
  assert.deepEqual(got, ['chat'], 'tin status không vào EventBus');
  assert.equal(src.net.color(f.t), 'green');

  // rút mạng: socket đóng, mỗi lần thử lại đều thất bại
  f.sockets[0].close();
  assert.equal(src.net.color(f.t), 'yellow');
  const waits = [];
  let count = f.sockets.length;
  for (let i = 0; i < 8; i++) {
    const before = f.t;
    while (f.sockets.length === count) f.advance(500);
    waits.push(Math.round((f.t - before) / 1000));
    count = f.sockets.length;
    f.sockets.at(-1).close(); // thử lại thất bại ngay
  }
  assert.deepEqual(waits, [1, 2, 4, 8, 16, 30, 30, 30], 'chờ tăng dần, tối đa 30 giây');
  assert.equal(src.net.color(f.t), 'red', 'đứt lâu thì đỏ');

  // cắm mạng lại: lần thử kế tiếp thành công
  while (f.sockets.length === count) f.advance(500);
  open(f.sockets.at(-1));
  assert.equal(src.net.color(f.t), 'green');
  f.sockets.at(-1).onmessage({ data: JSON.stringify({ type: 'like', userId: 'u1', nickname: 'Lan', avatarUrl: '', likeCount: 2 }) });
  assert.deepEqual(got, ['chat', 'like'], 'nhận sự kiện lại bình thường');
  src.stop();
});

test('WebSocketSource: kết nối chết ngầm (không đóng, không nhận gì) bị phát hiện và nối lại', () => {
  const f = fakeEnv();
  const src = new WebSocketSource(new EventBus(), 'ws://x', { ...f.env });
  src.start();
  f.sockets[0].onopen();
  f.advance(1000);
  assert.equal(f.sockets.length, 1);
  f.advance(CONFIG.net.staleMs + 3000); // im lặng quá lâu: watchdog đóng socket
  assert.ok(f.sockets[0].closed, 'đã chủ động đóng');
  f.advance(1500);
  assert.equal(f.sockets.length, 2, 'đã nối lại');
  src.stop();
});

test('WebSocketSource: mạng quay lại thì nối ngay, không chờ hết thời gian chờ', () => {
  const f = fakeEnv();
  const src = new WebSocketSource(new EventBus(), 'ws://x', { ...f.env });
  src.start();
  f.sockets[0].close();
  f.advance(1200);
  f.sockets[1].close(); // lần thử thứ hai cũng hỏng, sắp chờ 2 giây
  const n = f.sockets.length;
  src.reconnectNow();
  assert.equal(f.sockets.length, n + 1, 'nối ngay');
  src.stop();
});
