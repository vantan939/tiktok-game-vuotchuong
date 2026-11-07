import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEvent } from '../../../shared/events.js';
import { fromChat, fromGift, fromLike, fromMember, userOf } from './adapt.js';
import { LikeAggregator } from './likes.js';
import { parseReplay, playReplay } from './replay.js';
import { TikTokLiveSource } from './live.js';

const U = { userId: '123', uniqueId: 'lan_vn', nickname: 'Lan', profilePicture: { url: ['https://cdn/a.jpg', 'https://cdn/b.jpg'] } };

test('userOf: lấy id, tên, avatar; chịu được tên trường khác phiên bản (id/displayId/avatarThumb.urlList)', () => {
  assert.deepEqual(userOf(U), { userId: '123', nickname: 'Lan', avatarUrl: 'https://cdn/a.jpg' });
  assert.deepEqual(
    userOf({ id: '9', displayId: 'minh', avatarThumb: { urlList: ['https://x/y.png'] } }),
    { userId: '9', nickname: 'minh', avatarUrl: 'https://x/y.png' },
  );
  assert.equal(userOf({}), null);
  assert.equal(userOf(undefined), null);
});

test('chat: ra GameEvent hợp lệ, hỗ trợ comment hoặc content, bỏ bình luận trống', () => {
  const e = fromChat({ user: U, comment: 'join' });
  assert.deepEqual(e, { type: 'chat', userId: '123', nickname: 'Lan', avatarUrl: 'https://cdn/a.jpg', text: 'join' });
  assert.ok(isValidEvent(e));
  assert.equal(fromChat({ user: U, content: 'S' }).text, 'S');
  assert.equal(fromChat({ user: U, comment: '   ' }), null);
  assert.equal(fromChat({ comment: 'join' }), null, 'không có người dùng');
});

test('like: lấy số lần chạm từ likeCount hoặc count; bỏ qua khi không hợp lệ', () => {
  assert.equal(fromLike({ user: U, likeCount: 5, totalLikeCount: 900 }).likeCount, 5);
  assert.equal(fromLike({ user: U, count: 2 }).likeCount, 2);
  assert.equal(fromLike({ user: U, likeCount: 0 }), null);
  assert.ok(isValidEvent(fromLike({ user: U, likeCount: 1 })));
});

test('member: thành sự kiện join (người vào phòng)', () => {
  const e = fromMember({ user: U });
  assert.equal(e.type, 'join');
  assert.ok(isValidEvent(e));
});

test('gift: quà liên hoàn chỉ tính khi kết thúc chuỗi, quà thường tính ngay; kim cương = đơn giá x số lần', () => {
  const streak = { giftType: 1, giftName: 'Hoa hồng', diamondCount: 1 };
  assert.equal(fromGift({ user: U, giftDetails: streak, repeatCount: 3, repeatEnd: 0 }), null, 'chuỗi đang chạy');
  assert.equal(fromGift({ user: U, giftDetails: streak, repeatCount: 7, repeatEnd: false }), null);
  const end = fromGift({ user: U, giftDetails: streak, repeatCount: 7, repeatEnd: true });
  assert.deepEqual(end, { type: 'gift', userId: '123', nickname: 'Lan', avatarUrl: 'https://cdn/a.jpg', giftName: 'Hoa hồng', diamonds: 7 });
  assert.ok(isValidEvent(end));
  const single = { giftType: 2, giftName: 'Sư tử', diamondCount: 29999 };
  const lion = fromGift({ user: U, giftDetails: single, repeatCount: 1, repeatEnd: 0 });
  assert.equal(lion.giftName, 'Sư tử');
  assert.equal(lion.diamonds, 29999);
  // tên trường kiểu proto v3 (gift.name, gift.type)
  const v3 = fromGift({ user: U, gift: { name: 'Kem', type: 1, diamondCount: 10 }, repeatCount: 2, repeatEnd: 1 });
  assert.equal(v3.giftName, 'Kem');
  assert.equal(v3.diamonds, 20);
  // thiếu thông tin vẫn ra sự kiện hợp lệ với giá trị 0
  const bare = fromGift({ user: U, giftId: 5 });
  assert.ok(isValidEvent(bare));
  assert.equal(bare.diamonds, 0);
});

function fakeTimers() {
  const timers = [];
  let now = 0;
  return {
    setTimer: (fn, ms) => {
      const t = { fn, at: now + ms, active: true };
      timers.push(t);
      return t;
    },
    clearTimer: (t) => t && (t.active = false),
    advance(ms) {
      now += ms;
      for (const t of timers.filter((x) => x.active && x.at <= now).sort((a, b) => a.at - b.at)) {
        t.active = false;
        t.fn();
      }
    },
    get now() {
      return now;
    },
  };
}

test('LikeAggregator: gộp tim của cùng người trong 1 giây, người khác tách riêng, cửa sổ mới sau khi phát', () => {
  const tm = fakeTimers();
  const out = [];
  const agg = new LikeAggregator((e) => out.push(e), { windowMs: 1000, setTimer: tm.setTimer, clearTimer: tm.clearTimer });
  const like = (userId, n) => ({ type: 'like', userId, nickname: userId, avatarUrl: '', likeCount: n });
  agg.add(like('a', 1));
  tm.advance(300);
  agg.add(like('a', 3));
  agg.add(like('b', 2));
  tm.advance(600);
  assert.deepEqual(out, [], 'chưa hết cửa sổ');
  tm.advance(200); // a hết cửa sổ (1000 ms từ lần đầu)
  assert.deepEqual(out.map((e) => [e.userId, e.likeCount]), [['a', 4]]);
  tm.advance(400); // b hết cửa sổ (từ 300)
  assert.deepEqual(out.map((e) => [e.userId, e.likeCount]), [['a', 4], ['b', 2]]);
  agg.add(like('a', 5)); // cửa sổ mới
  tm.advance(1000);
  assert.equal(out.at(-1).likeCount, 5);
  agg.add(like('c', 1));
  agg.flushAll();
  assert.equal(out.at(-1).userId, 'c', 'flushAll phát hết phần còn chờ');
});

test('parseReplay: nhận định dạng ghi ({t, event}) và mảng sự kiện thẳng, bỏ sự kiện sai dạng, xếp theo thời gian', () => {
  const base = { userId: 'u1', nickname: 'A', avatarUrl: '' };
  const { items, skipped } = parseReplay([
    { t: 2000, event: { type: 'like', likeCount: 2, ...base } },
    { t: 500, event: { type: 'chat', text: 'join', ...base } },
    { event: { type: 'khac' } },
    { type: 'gift', giftName: 'Kem', diamonds: 10, ...base },
  ]);
  assert.equal(skipped, 1);
  assert.deepEqual(items.map((i) => [i.t, i.event.type]), [[500, 'chat'], [2000, 'like'], [2500, 'gift']]);  // mục không có t nối tiếp sau mục trước
  assert.throws(() => parseReplay({ khong: 'phai mang' }), /mảng/);
});

test('playReplay: phát đúng thứ tự và nhịp, chạy nhanh theo speed, lặp lại, dừng được', () => {
  const tm = fakeTimers();
  const items = [
    { t: 0, event: { type: 'a' } },
    { t: 1000, event: { type: 'b' } },
    { t: 3000, event: { type: 'c' } },
  ];
  const out = [];
  let ended = 0;
  playReplay(items, (e) => out.push(`${e.type}@${tm.now}`), { speed: 2, setTimer: tm.setTimer, clearTimer: tm.clearTimer, onEnd: () => ended++ });
  tm.advance(0);
  tm.advance(500);
  tm.advance(1000);
  assert.deepEqual(out, ['a@0', 'b@500', 'c@1500']);
  assert.equal(ended, 1);

  const tm2 = fakeTimers();
  const loop = [];
  const handle = playReplay([{ t: 0, event: { type: 'a' } }], (e) => loop.push(e.type), { loop: true, setTimer: tm2.setTimer, clearTimer: tm2.clearTimer });
  tm2.advance(0);
  tm2.advance(1000);
  tm2.advance(0);
  assert.ok(loop.length >= 2, 'lặp lại');
  handle.stop();
  const n = loop.length;
  tm2.advance(5000);
  assert.equal(loop.length, n, 'đã dừng');
});

// Kết nối giả: ghi lại các sự kiện đăng ký, cho test bắn dữ liệu vào
function fakeConnector({ failFirst = 0, offline = false } = {}) {
  const made = [];
  class Connection {
    constructor(username, options) {
      this.username = username;
      this.options = options;
      this.handlers = {};
      this.connects = 0;
      made.push(this);
    }
    on(name, fn) {
      this.handlers[name] = fn;
    }
    async connect() {
      this.connects++;
      if (made.length <= failFirst) {
        const err = new Error(offline ? 'User is offline' : 'sign server lỗi');
        err.name = offline ? 'UserOfflineError' : 'Error';
        throw err;
      }
      return { roomId: 'R1' };
    }
    disconnect() {
      this.disconnected = true;
    }
    fire(name, data) {
      this.handlers[name](data);
    }
  }
  return { lib: { TikTokLiveConnection: Connection, WebcastEvent: { CHAT: 'chat', LIKE: 'like', GIFT: 'gift', MEMBER: 'member' }, ControlEvent: { DISCONNECTED: 'disconnected', ERROR: 'error' } }, made };
}

test('TikTokLiveSource: chuyển chat, quà, người vào phòng, gộp tim, bỏ quà giữa chuỗi; log rõ ràng', async () => {
  const tm = fakeTimers();
  const { lib, made } = fakeConnector();
  const out = [];
  const logs = [];
  const src = new TikTokLiveSource({ username: 'streamer', emit: (e) => out.push(e), log: (m) => logs.push(m), loadConnector: async () => lib, setTimer: tm.setTimer, clearTimer: tm.clearTimer, now: () => tm.now, signApiKey: 'K' });
  await src.start();
  const c = made[0];
  assert.equal(c.username, 'streamer');
  assert.deepEqual(c.options, { signApiKey: 'K' });
  assert.ok(logs.some((l) => /đã kết nối @streamer/.test(l)));

  c.fire('chat', { user: U, comment: 'join' });
  c.fire('member', { user: U });
  c.fire('member', { user: U }); // vào lại ngay: không phát lặp
  c.fire('like', { user: U, likeCount: 1 });
  c.fire('like', { user: U, likeCount: 4 });
  c.fire('gift', { user: U, giftDetails: { giftType: 1, giftName: 'Hoa', diamondCount: 1 }, repeatCount: 2, repeatEnd: 0 });
  c.fire('gift', { user: U, giftDetails: { giftType: 1, giftName: 'Hoa', diamondCount: 1 }, repeatCount: 5, repeatEnd: 1 });
  c.fire('chat', { user: {}, comment: 'lỗi người dùng' }); // bị bỏ, không làm hỏng gì
  tm.advance(1000);
  assert.deepEqual(out.map((e) => e.type), ['chat', 'join', 'gift', 'like']);
  assert.equal(out.find((e) => e.type === 'like').likeCount, 5);
  assert.equal(out.find((e) => e.type === 'gift').diamonds, 5);
  assert.ok(out.every(isValidEvent));
  src.stop();
  assert.ok(c.disconnected);
});

test('TikTokLiveSource: mất kết nối thì thử lại với thời gian chờ tăng dần; chưa live thì thử lại sau 30 giây', async () => {
  const tm = fakeTimers();
  const { lib, made } = fakeConnector({ failFirst: 2 });
  const logs = [];
  const states = [];
  const src = new TikTokLiveSource({ username: 's', emit: () => {}, onStatus: (st) => states.push(st), log: (m) => logs.push(m), loadConnector: async () => lib, setTimer: tm.setTimer, clearTimer: tm.clearTimer, now: () => tm.now });
  await src.start();
  assert.equal(made.length, 1);
  assert.ok(logs.some((l) => /kết nối thất bại/.test(l)));
  tm.advance(2000);
  await Promise.resolve();
  await new Promise((r) => setImmediate(r));
  assert.equal(made.length, 2, 'thử lại sau 2 giây');
  tm.advance(4000); // lần sau chờ 4 giây
  await new Promise((r) => setImmediate(r));
  assert.equal(made.length, 3);
  assert.ok(logs.some((l) => /đã kết nối/.test(l)));
  // bị ngắt sau khi đã kết nối: kết nối lại
  assert.equal(states.at(-1), 'connected');
  made[2].fire('disconnected', { code: 1006, reason: 'mất mạng' });
  assert.equal(states.at(-1), 'reconnecting', 'ngắt thì báo đang kết nối lại');
  assert.ok(logs.some((l) => /bị ngắt kết nối \(mã 1006\): mất mạng/.test(l)));
  tm.advance(2000);
  await new Promise((r) => setImmediate(r));
  assert.equal(made.length, 4);
  assert.equal(states.at(-1), 'connected', 'nối lại được thì xanh');
  src.stop();

  const tm2 = fakeTimers();
  const off = fakeConnector({ failFirst: 1, offline: true });
  const logs2 = [];
  const src2 = new TikTokLiveSource({ username: 's', emit: () => {}, log: (m) => logs2.push(m), loadConnector: async () => off.lib, setTimer: tm2.setTimer, clearTimer: tm2.clearTimer });
  await src2.start();
  assert.ok(logs2.some((l) => /chưa live, thử lại sau 30 giây/.test(l)));
  src2.stop();
});

test('TikTokLiveSource: thời gian chờ kết nối lại tăng dần nhưng không quá 30 giây; thất bại nhiều lần thì báo mất kết nối', async () => {
  const tm = fakeTimers();
  const { lib, made } = fakeConnector({ failFirst: 99 });
  const states = [];
  const waits = [];
  const src = new TikTokLiveSource({
    username: 's',
    emit: () => {},
    onStatus: (st) => states.push(st),
    log: (m) => {
      const w = /sẽ kết nối lại sau (\d+) giây/.exec(m);
      if (w) waits.push(Number(w[1]));
    },
    loadConnector: async () => lib,
    setTimer: tm.setTimer,
    clearTimer: tm.clearTimer,
    now: () => tm.now,
  });
  await src.start();
  for (let i = 0; i < 7; i++) {
    tm.advance(30000);
    await new Promise((r) => setImmediate(r));
  }
  assert.deepEqual(waits.slice(0, 7), [2, 4, 8, 16, 30, 30, 30]);
  assert.ok(Math.max(...waits) <= 30);
  assert.equal(states.at(-1), 'disconnected', 'thất bại liên tiếp thì đỏ');
  assert.ok(made.length >= 7);
  src.stop();
});
