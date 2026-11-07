import { TtsError } from './genmax.js';

const MAX_BODY = 8192;
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// Chỉ cho trang chạy trên máy này gọi (tránh trang web lạ dùng credit của bạn)
function allowOrigin(req) {
  const origin = req.headers.origin;
  return !origin || LOCAL_ORIGIN.test(origin) ? origin ?? null : false;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new TtsError(413, 'Yêu cầu quá lớn'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new TtsError(400, 'JSON không hợp lệ'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

/**
 * Các đường dẫn giọng nói cho client:
 *   GET  /tts/status    -> { enabled }   server đã cấu hình khóa genmax chưa (không lộ khóa)
 *   POST /tts           -> audio/mpeg    { text } tạo (hoặc lấy từ cache) giọng đọc
 *   POST /tts/prefetch  -> 202           { texts: [...] } tạo sẵn các câu cố định ở nền
 * Trả về true nếu đã xử lý yêu cầu, false nếu không phải đường dẫn của TTS.
 */
export function createTtsHandler(tts, { log = console.log } = {}) {
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/tts')) return false;

    const origin = allowOrigin(req);
    if (origin === false) {
      send(res, 403, 'Forbidden');
      return true;
    }
    const cors = origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    if (req.method === 'OPTIONS') {
      send(res, 204, '', { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' });
      return true;
    }

    try {
      if (req.method === 'GET' && url.pathname === '/tts/status') {
        send(res, 200, JSON.stringify({ enabled: tts.enabled }), { ...cors, 'Content-Type': 'application/json' });
      } else if (req.method === 'POST' && url.pathname === '/tts/prefetch') {
        const { texts } = await readJson(req);
        if (!Array.isArray(texts) || texts.length > 60) throw new TtsError(400, 'texts phải là mảng tối đa 60 câu');
        if (!tts.enabled) throw new TtsError(503, 'Chưa cấu hình genmax');
        send(res, 202, JSON.stringify({ queued: texts.length }), { ...cors, 'Content-Type': 'application/json' });
        tts.prefetch(texts.filter((t) => typeof t === 'string')).then((n) => log(`[tts] đã chuẩn bị sẵn ${n}/${texts.length} câu`));
      } else if (req.method === 'POST' && url.pathname === '/tts') {
        const { text } = await readJson(req);
        const audio = await tts.synthesize(text);
        send(res, 200, audio, { ...cors, 'Content-Type': 'audio/mpeg', 'Content-Length': audio.length });
      } else {
        send(res, 404, 'Not found', cors);
      }
    } catch (err) {
      const status = err instanceof TtsError ? err.status : 500;
      if (status >= 500 || status === 429) log(`[tts] lỗi ${status}: ${err.message}`);
      send(res, status, JSON.stringify({ error: err instanceof TtsError ? err.message : 'Lỗi máy chủ' }), { ...cors, 'Content-Type': 'application/json' });
    }
    return true;
  };
}

/**
 * POST /log { source, message, stack }: client báo lỗi JavaScript về terminal của server, vì cửa sổ game khi quay không có
 * Console để xem. Chỉ nhận từ trang chạy trên máy này, giới hạn độ dài. Trả về true nếu đã xử lý.
 */
export function createClientLogHandler({ log = console.log } = {}) {
  const clean = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, max);
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/log') return false;
    const origin = allowOrigin(req);
    if (origin === false) {
      send(res, 403, 'Forbidden');
      return true;
    }
    const cors = origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    if (req.method === 'OPTIONS') {
      send(res, 204, '', { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' });
      return true;
    }
    try {
      if (req.method !== 'POST') throw new TtsError(405, 'Chỉ nhận POST');
      const body = await readJson(req);
      if (body.kind === 'info') log(`[game] ${clean(body.message, 500)}`); // trạng thái game để streamer xem trong terminal
      else log(`[client] lỗi ${clean(body.source, 40)}: ${clean(body.message, 300)}${body.stack ? ` | ${clean(body.stack, 400)}` : ''}`);
      send(res, 204, '', cors);
    } catch (err) {
      send(res, err instanceof TtsError ? err.status : 500, JSON.stringify({ error: 'Lỗi' }), { ...cors, 'Content-Type': 'application/json' });
    }
    return true;
  };
}
