import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { TtsError } from './genmax.js';
import { createTtsHandler } from './routes.js';

const AUDIO = Buffer.from('mp3-giả');

async function withServer(tts, fn) {
  const handle = createTtsHandler(tts, { log: () => {} });
  const server = createServer(async (req, res) => {
    if (!(await handle(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

const fakeTts = (over = {}) => ({
  enabled: true,
  synthesize: async (text) => {
    if (text === 'lỗi') throw new TtsError(429, 'Hết hạn mức');
    return AUDIO;
  },
  prefetch: async (texts) => texts.length,
  ...over,
});

test('GET /tts/status: báo đã cấu hình hay chưa, không lộ khóa', async () => {
  await withServer(fakeTts(), async (base) => {
    const res = await fetch(`${base}/tts/status`);
    assert.deepEqual(await res.json(), { enabled: true });
  });
  await withServer(fakeTts({ enabled: false }), async (base) => {
    assert.deepEqual(await (await fetch(`${base}/tts/status`)).json(), { enabled: false });
  });
});

test('POST /tts: trả audio/mpeg, lỗi của TtsError đi kèm đúng mã', async () => {
  await withServer(fakeTts(), async (base) => {
    const ok = await fetch(`${base}/tts`, { method: 'POST', body: JSON.stringify({ text: 'xin chào' }) });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'audio/mpeg');
    assert.deepEqual(Buffer.from(await ok.arrayBuffer()), AUDIO);
    const limited = await fetch(`${base}/tts`, { method: 'POST', body: JSON.stringify({ text: 'lỗi' }) });
    assert.equal(limited.status, 429);
    assert.match((await limited.json()).error, /hạn mức/);
    const bad = await fetch(`${base}/tts`, { method: 'POST', body: '{không phải json' });
    assert.equal(bad.status, 400);
  });
});

test('chỉ nhận yêu cầu từ trang chạy trên máy này', async () => {
  await withServer(fakeTts(), async (base) => {
    const foreign = await fetch(`${base}/tts/status`, { headers: { Origin: 'https://trang-la.example' } });
    assert.equal(foreign.status, 403);
    const local = await fetch(`${base}/tts/status`, { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(local.status, 200);
    assert.equal(local.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });
});

test('POST /tts/prefetch: nhận danh sách câu, trả 202; sai định dạng hoặc chưa cấu hình thì báo lỗi', async () => {
  await withServer(fakeTts(), async (base) => {
    const ok = await fetch(`${base}/tts/prefetch`, { method: 'POST', body: JSON.stringify({ texts: ['a', 'b'] }) });
    assert.equal(ok.status, 202);
    assert.deepEqual(await ok.json(), { queued: 2 });
    assert.equal((await fetch(`${base}/tts/prefetch`, { method: 'POST', body: JSON.stringify({ texts: 'a' }) })).status, 400);
  });
  await withServer(fakeTts({ enabled: false }), async (base) => {
    assert.equal((await fetch(`${base}/tts/prefetch`, { method: 'POST', body: JSON.stringify({ texts: ['a'] }) })).status, 503);
  });
});

test('đường dẫn khác /tts không bị chặn bởi handler', async () => {
  await withServer(fakeTts(), async (base) => {
    assert.equal((await fetch(`${base}/khac`)).status, 404);
  });
});

test('POST /log: nhận báo lỗi từ client và in ra, bỏ ký tự xuống dòng, từ chối trang lạ', async () => {
  const { createClientLogHandler } = await import('./routes.js');
  const lines = [];
  const handle = createClientLogHandler({ log: (l) => lines.push(l) });
  const server = createServer(async (req, res) => {
    if (!(await handle(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const ok = await fetch(`${base}/log`, { method: 'POST', body: JSON.stringify({ source: 'game', message: 'Lỗi\ndòng hai', stack: 'a | b' }) });
    assert.equal(ok.status, 204);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^\[client\] lỗi game: Lỗi dòng hai \| a \| b$/);
    const foreign = await fetch(`${base}/log`, { method: 'POST', headers: { Origin: 'https://trang-la.example' }, body: '{}' });
    assert.equal(foreign.status, 403);
    assert.equal(lines.length, 1);
    assert.equal((await fetch(`${base}/log`)).status, 405);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
