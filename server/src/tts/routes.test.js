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

test('POST /log kind=info: in trạng thái game ra terminal với tiền tố [game]', async () => {
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
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/log`, { method: 'POST', body: JSON.stringify({ kind: 'info', message: 'lượt 1 (race) | hàng đợi 1: Nam' }) });
    assert.equal(res.status, 204);
    assert.deepEqual(lines, ['[game] lượt 1 (race) | hàng đợi 1: Nam']);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('POST /memlog: ghi tiêu đề một lần rồi nối từng dòng; từ chối dòng có ký tự lạ', async () => {
  const { createMemLogHandler } = await import('./routes.js');
  const writes = [];
  let has = false;
  const handle = createMemLogHandler({
    file: 'x.csv', log: () => {},
    exists: async () => has,
    append: async (f, t) => { writes.push([f, t]); has = true; },
  });
  const server = createServer(async (req, res) => { if (!(await handle(req, res))) { res.writeHead(404); res.end(); } });
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/memlog`;
  const post = (body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await post({ header: 'a,b', line: '1,2' })).status, 204);
    assert.equal((await post({ header: 'a,b', line: '3,4' })).status, 204);
    assert.deepEqual(writes.map((w) => w[1]), ['a,b\n1,2\n', '3,4\n']);
    assert.equal((await post({ line: '1,2\n=cmd|x' })).status, 400);
    assert.equal(writes.length, 2);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
