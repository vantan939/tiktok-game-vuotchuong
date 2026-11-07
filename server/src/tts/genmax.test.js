import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GenmaxTts, TtsError, genmaxFromEnv, languageFor } from './genmax.js';

const AUDIO = Buffer.from('ID3-giả-lập');

// genmax giả: nhận yêu cầu tạo giọng, trả id; hỏi trạng thái thì "processing" rồi "completed"; tải file trả mp3
function fakeGenmax({ failTask = false, pollsBeforeDone = 1, status = 202 } = {}) {
  const calls = [];
  let polls = 0;
  const fetchFn = async (url, init = {}) => {
    calls.push({ url, init });
    const json = (body, st = 200) => ({ ok: st < 400, status: st, json: async () => body });
    if (url.includes('/v1/text-to-speech/')) return json({ id: 'task1', status: 'pending' }, status);
    if (url.includes('/v1/history/')) {
      polls++;
      if (failTask) return json({ id: 'task1', status: 'failed', error: 'hết credit' });
      if (polls <= pollsBeforeDone) return json({ id: 'task1', status: 'processing' });
      return json({ id: 'task1', status: 'completed', result: { audio_url: 'https://api.genmax.io/audio/task1.mp3' } });
    }
    if (url.endsWith('.mp3')) return { ok: true, status: 200, arrayBuffer: async () => AUDIO };
    throw new Error(`gọi lạ: ${url}`);
  };
  return { fetchFn, calls };
}

const make = (opts = {}, fake = fakeGenmax()) => ({
  tts: new GenmaxTts({ apiKey: 'KHOA', voiceId: 'GIONG', sleep: async () => {}, fetchFn: fake.fetchFn, ...opts }),
  fake,
});

test('languageFor: MiniMax dùng tên ngôn ngữ đầy đủ, nhà cung cấp khác dùng mã', () => {
  assert.equal(languageFor('minimax', 'vi'), 'Vietnamese');
  assert.equal(languageFor('elevenlabs', 'vi'), 'vi');
  assert.equal(languageFor('capcut', 'vi'), 'vi');
});

test('tạo giọng: gửi đúng yêu cầu, hỏi trạng thái tới khi xong rồi tải mp3', async () => {
  const { tts, fake } = make({ provider: 'elevenlabs', speed: 1.1 });
  const audio = await tts.synthesize('Xuất phát!');
  assert.deepEqual(audio, AUDIO);
  const post = fake.calls[0];
  assert.equal(post.url, 'https://api.genmax.io/v1/text-to-speech/GIONG');
  assert.equal(post.init.method, 'POST');
  assert.equal(post.init.headers['xi-api-key'], 'KHOA');
  const body = JSON.parse(post.init.body);
  assert.deepEqual(body, {
    text: 'Xuất phát!', provider: 'elevenlabs', model_id: 'eleven_flash_v2_5', language_code: 'vi', voice_settings: { speed: 1.1 },
  });
  assert.equal(fake.calls.filter((c) => c.url.includes('/v1/history/')).length, 2, 'một lần đang xử lý, một lần xong');
});

test('MiniMax: model và ngôn ngữ riêng, có pitch', async () => {
  const { tts, fake } = make({ provider: 'minimax', pitch: 2 });
  await tts.synthesize('Chào');
  const body = JSON.parse(fake.calls[0].init.body);
  assert.equal(body.model_id, 'speech-2.8-turbo');
  assert.equal(body.language_code, 'Vietnamese');
  assert.deepEqual(body.voice_settings, { speed: 1, pitch: 2 });
});

test('cache: cùng câu không gọi API lần hai, kể cả khi hai yêu cầu cùng lúc; ghi ra thư mục cache', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tts-'));
  const { tts, fake } = make({ cacheDir: dir });
  const [a, b] = await Promise.all([tts.synthesize('Né đẹp quá!'), tts.synthesize('Né đẹp quá!')]);
  assert.deepEqual(a, b);
  assert.equal(fake.calls.filter((c) => c.url.includes('/text-to-speech/')).length, 1, 'chỉ một lần tạo');
  await tts.synthesize('Né đẹp quá!');
  assert.equal(fake.calls.filter((c) => c.url.includes('/text-to-speech/')).length, 1, 'lần sau lấy từ cache');
  assert.equal((await readdir(dir)).length, 1);
  // máy chủ khởi động lại: đọc được từ đĩa, vẫn không gọi API
  const { tts: again, fake: fake2 } = make({ cacheDir: dir });
  assert.deepEqual(await again.synthesize('Né đẹp quá!'), AUDIO);
  assert.equal(fake2.calls.length, 0);
  // đổi giọng thì phải tạo lại
  const { tts: other, fake: fake3 } = make({ cacheDir: dir, voiceId: 'GIONG_KHAC' });
  await other.synthesize('Né đẹp quá!');
  assert.ok(fake3.calls.length > 0);
});

test('hạn mức ký tự mỗi giờ: vượt thì từ chối (429), qua khung giờ thì dùng lại được; câu trong cache không tính', async () => {
  let t = 0;
  const { tts } = make({ budgetChars: 20, now: () => t });
  await tts.synthesize('1234567890'); // 10 ký tự
  await tts.synthesize('abcdefghij'); // 10 ký tự, vừa đủ
  await assert.rejects(tts.synthesize('thêm một câu'), (e) => e instanceof TtsError && e.status === 429);
  await tts.synthesize('1234567890'); // đã có trong cache, không tính
  t = 3600001;
  await tts.synthesize('thêm một câu'); // hết khung giờ cũ
});

test('lỗi: chưa cấu hình (503), văn bản trống hoặc quá dài (400), tác vụ thất bại, hết thời gian, lỗi mạng', async () => {
  const none = new GenmaxTts({ apiKey: '', voiceId: '' });
  assert.equal(none.enabled, false);
  await assert.rejects(none.synthesize('xin chào'), { status: 503 });
  const { tts } = make({ maxChars: 10 });
  await assert.rejects(tts.synthesize('  '), { status: 400 });
  await assert.rejects(tts.synthesize('câu này dài hơn mười ký tự'), { status: 400 });
  await assert.rejects(make({}, fakeGenmax({ failTask: true })).tts.synthesize('thử'), (e) => e.status === 502 && /hết credit/.test(e.message));
  let t = 0;
  const slow = fakeGenmax({ pollsBeforeDone: 999 });
  const timeoutTts = make({ timeoutMs: 1000, now: () => t, sleep: async () => { t += 600; } }, slow).tts;
  await assert.rejects(timeoutTts.synthesize('chậm quá'), { status: 504 });
  const broken = new GenmaxTts({ apiKey: 'K', voiceId: 'V', fetchFn: async () => { throw new Error('mất mạng'); } });
  await assert.rejects(broken.synthesize('thử'), { status: 502 });
});

test('thông báo lỗi không bao giờ chứa khóa API', async () => {
  const fetchFn = async () => ({ ok: false, status: 401, json: async () => ({}) });
  const tts = new GenmaxTts({ apiKey: 'KHOA_BI_MAT', voiceId: 'V', fetchFn });
  await assert.rejects(tts.synthesize('thử'), (e) => !e.message.includes('KHOA_BI_MAT') && /GENMAX_API_KEY/.test(e.message));
});

test('chỉ gửi khóa API tới đúng máy chủ genmax khi tải file âm thanh', async () => {
  const seen = [];
  const fetchFn = async (url, init) => {
    seen.push({ url, init });
    if (url.includes('/text-to-speech/')) return { ok: true, status: 202, json: async () => ({ id: 'x' }) };
    if (url.includes('/history/')) return { ok: true, status: 200, json: async () => ({ status: 'completed', result: { audio_url: 'https://cdn.khac.example/a.mp3' } }) };
    return { ok: true, status: 200, arrayBuffer: async () => AUDIO };
  };
  await new GenmaxTts({ apiKey: 'K', voiceId: 'V', fetchFn }).synthesize('thử');
  const dl = seen.at(-1);
  assert.equal(dl.url, 'https://cdn.khac.example/a.mp3');
  assert.equal(dl.init, undefined, 'không gửi header khóa tới máy chủ khác');
});

test('prefetch: tạo sẵn các câu cố định, dừng khi hết hạn mức', async () => {
  const { tts } = make({ budgetChars: 25 });
  assert.equal(await tts.prefetch(['1234567890', 'abcdefghij', 'quá hạn mức rồi']), 2);
});

test('genmaxFromEnv: đọc cấu hình từ biến môi trường, có giá trị mặc định', () => {
  const t = genmaxFromEnv({ GENMAX_API_KEY: ' k ', GENMAX_VOICE_ID: 'v', GENMAX_PROVIDER: 'capcut', GENMAX_SPEED: '1.2' });
  assert.equal(t.apiKey, 'k');
  assert.equal(t.provider, 'capcut');
  assert.equal(t.model, 'capcut');
  assert.equal(t.speed, 1.2);
  assert.equal(t.language, 'vi');
  assert.equal(genmaxFromEnv({}).enabled, false);
});
