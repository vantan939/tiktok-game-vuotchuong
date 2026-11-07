import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { genmaxFromEnv } from './tts/genmax.js';
import { createTtsHandler } from './tts/routes.js';
import { isValidEvent } from '../../shared/events.js';
import { TikTokLiveSource } from './tiktok/live.js';
import { createRecorder, loadReplay, playReplay } from './tiktok/replay.js';

// Nạp .env ở thư mục gốc dự án (khóa API, giọng...). Không có file thì dùng biến môi trường sẵn có.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  // không có .env
}

const PORT = Number(process.env.WS_PORT) || 8080;

// Tham số dòng lệnh: --replay file.json [--speed=2] [--loop] | --record file.json
const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i < 0) return undefined;
  return args[i].includes('=') ? args[i].split('=')[1] : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true);
};

// Giọng MC qua genmax: khóa chỉ nằm ở server, client gọi POST /tts. Cache mp3 ở server/.cache/tts
const tts = genmaxFromEnv(process.env, { cacheDir: fileURLToPath(new URL('../.cache/tts', import.meta.url)) });
const handleTts = createTtsHandler(tts);

// Một cổng cho cả WebSocket (sự kiện game) và HTTP (giọng nói)
const http = createServer(async (req, res) => {
  if (await handleTts(req, res)) return;
  res.writeHead(404);
  res.end('Not found');
});
const wss = new WebSocketServer({ server: http });

// Trạng thái nguồn sự kiện, gửi cho client để hiện chấm xanh/vàng/đỏ. Phát lại mỗi 5 giây làm nhịp tim:
// client im lặng quá lâu nghĩa là kết nối đã chết (ví dụ rút mạng) và tự nối lại.
const HEARTBEAT_MS = 5000;
let status = { type: 'status', state: 'disconnected', detail: 'chưa có nguồn sự kiện' };
const sendAll = (message) => {
  for (const client of wss.clients) if (client.readyState === 1) client.send(message);
};
function setStatus(state, detail = '') {
  status = { type: 'status', state, detail };
  sendAll(JSON.stringify(status));
}
setInterval(() => sendAll(JSON.stringify(status)), HEARTBEAT_MS).unref();

wss.on('connection', (socket) => {
  console.log(`[server] client kết nối (${wss.clients.size} đang mở)`);
  socket.send(JSON.stringify(status));
  socket.on('close', () => console.log(`[server] client ngắt (${wss.clients.size} đang mở)`));
});

http.listen(PORT, () => {
  console.log(`[server] WebSocket và HTTP đang chạy ở ws://localhost:${PORT}`);
  console.log(tts.enabled ? `[tts] genmax bật (${tts.provider}, model ${tts.model})` : '[tts] chưa có GENMAX_API_KEY/GENMAX_VOICE_ID trong .env, MC dùng giọng trình duyệt');
});

// Phát một sự kiện cho mọi client đang kết nối (client nhận cùng dạng GameEvent như chế độ demo)
function broadcast(event) {
  if (!isValidEvent(event)) {
    console.warn('[server] bỏ qua sự kiện sai dạng', event);
    return;
  }
  recorder?.record(event);
  sendAll(JSON.stringify(event));
}

const recordPath = argValue('--record');
const recorder = typeof recordPath === 'string' ? createRecorder(recordPath) : null;
let source = null;

const replayPath = argValue('--replay');
if (typeof replayPath === 'string') {
  // Chế độ replay: phát lại sự kiện đã ghi, không cần live thật
  const { items, skipped } = await loadReplay(replayPath);
  const speed = Number(argValue('--speed')) || 1;
  setStatus('connected', 'replay');
  console.log(`[replay] ${items.length} sự kiện từ ${replayPath}${skipped ? ` (bỏ ${skipped} sự kiện sai dạng)` : ''}, tốc độ x${speed}${args.includes('--loop') ? ', lặp lại' : ''}`);
  // Chờ client đầu tiên kết nối rồi mới phát, để không mất những sự kiện đầu
  wss.once('connection', () => {
    console.log('[replay] có client kết nối, bắt đầu phát');
    setStatus('connected', 'replay');
    source = playReplay(items, broadcast, { speed, loop: args.includes('--loop'), onEnd: () => console.log('[replay] đã phát hết') });
  });
} else if (process.env.TIKTOK_USERNAME?.trim()) {
  source = new TikTokLiveSource({
    username: process.env.TIKTOK_USERNAME.trim().replace(/^@/, ''),
    emit: broadcast,
    onStatus: setStatus,
    signApiKey: process.env.EULER_API_KEY?.trim() || undefined,
  });
  source.start().catch((err) => console.error(`[tiktok] không khởi động được: ${err.message}`));
} else {
  setStatus('disconnected', 'chưa cấu hình TIKTOK_USERNAME');
  console.log('[tiktok] chưa có TIKTOK_USERNAME trong .env (hoặc dùng --replay file.json), server chỉ phát sự kiện từ client demo');
}

// Tắt gọn: dừng nguồn, ghi file --record
async function shutdown() {
  source?.stop?.();
  if (recorder) {
    await recorder.save();
    console.log(`[record] đã ghi ${recorder.count} sự kiện vào ${recordPath}`);
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
