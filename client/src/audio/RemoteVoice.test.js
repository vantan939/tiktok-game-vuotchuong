import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RemoteVoice } from './RemoteVoice.js';
import { staticLines } from './Mc.js';

class FakeAudio {
  constructor(url) {
    this.url = url;
    this.volume = 1;
    FakeAudio.all.push(this);
  }
  play() {
    this.played = true;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  end() {
    this.onended?.();
  }
}
FakeAudio.all = [];

function make(handler) {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  const voice = new RemoteVoice({ baseUrl: 'http://s', fetchFn, makeAudio: (u) => new FakeAudio(u), timeoutMs: 500 });
  return { voice, calls };
}
const ok = (body) => ({ ok: true, status: 200, json: async () => body, blob: async () => new Blob(['mp3']) });
const tick = () => new Promise((r) => setTimeout(r, 5));

test('init: bật khi server đã cấu hình genmax và nhờ tạo sẵn câu cố định; tắt khi server không chạy hoặc chưa cấu hình', async () => {
  const a = make(() => ok({ enabled: true }));
  assert.equal(await a.voice.init(['Xuất phát!']), true);
  assert.equal(a.calls[1].url, 'http://s/tts/prefetch');
  assert.deepEqual(JSON.parse(a.calls[1].init.body), { texts: ['Xuất phát!'] });
  assert.equal(await make(() => ok({ enabled: false })).voice.init(['x']), false);
  const down = new RemoteVoice({ baseUrl: 'http://s', fetchFn: async () => { throw new Error('refused'); } });
  assert.equal(await down.init([]), false);
});

test('speak: tải mp3 từ server rồi phát, xong thì báo onDone; cùng câu lần sau không tải lại', async () => {
  const { voice, calls } = make(() => ok({}));
  let done = 0;
  voice.speak('Né đẹp quá!', () => done++, () => assert.fail('không được lỗi'));
  await tick();
  const audio = FakeAudio.all.at(-1);
  assert.ok(audio.played);
  audio.end();
  assert.equal(done, 1);
  voice.speak('Né đẹp quá!', () => done++, () => {});
  await tick();
  assert.equal(calls.length, 1, 'lấy từ cache phía client');
});

test('speak: câu mới cắt câu cũ; kết quả của câu cũ về trễ bị bỏ', async () => {
  let release;
  const slow = new Promise((r) => (release = r));
  const { voice } = make((url, init) => (JSON.parse(init.body).text === 'cũ' ? slow.then(() => ok({})) : ok({})));
  const before = FakeAudio.all.length;
  let oldDone = 0;
  voice.speak('cũ', () => oldDone++, () => {});
  voice.speak('mới', () => {}, () => {});
  await tick();
  release();
  await tick();
  assert.equal(FakeAudio.all.length - before, 1, 'chỉ phát câu mới');
  assert.equal(oldDone, 0);
});

test('speak: server lỗi (hết hạn mức, mạng) thì gọi onFail để chuyển sang giọng khác', async () => {
  const { voice } = make(() => ({ ok: false, status: 429, json: async () => ({}) }));
  let failed = 0;
  voice.speak('thử', () => {}, () => failed++);
  await tick();
  assert.equal(failed, 1);
});

test('staticLines: chỉ lấy các câu không chèn tên, không trùng', () => {
  const lines = staticLines();
  assert.ok(lines.includes('Xuất phát!'));
  assert.ok(lines.length >= 8);
  assert.equal(new Set(lines).size, lines.length);
  assert.ok(lines.every((l) => !/undefined/.test(l)));
});

test('route: tiếng được đưa qua bộ giới hạn đỉnh trước khi phát; route lỗi thì vẫn phát bình thường', async () => {
  const routed = [];
  const mk = (route) => new RemoteVoice({ baseUrl: 'http://s', fetchFn: async () => ok({}), makeAudio: (u) => new FakeAudio(u), route });
  const a = mk((audio) => routed.push(audio));
  a.speak('Xin chào', () => {}, () => {});
  await tick();
  assert.equal(routed.length, 1);
  assert.equal(routed[0].played, true);

  const b = mk(() => { throw new Error('không định tuyến được'); });
  let failed = false;
  b.speak('Xin chào 2', () => {}, () => { failed = true; });
  await tick();
  assert.equal(failed, false);
  assert.equal(FakeAudio.all.at(-1).played, true);
});
