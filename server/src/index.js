import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { genmaxFromEnv } from './tts/genmax.js';
import { createTtsHandler } from './tts/routes.js';

// Nạp .env ở thư mục gốc dự án (khóa API, giọng...). Không có file thì dùng biến môi trường sẵn có.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url)));
} catch {
  // không có .env
}

const PORT = Number(process.env.WS_PORT) || 8080;

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

wss.on('connection', (socket) => {
  console.log(`[server] client kết nối (${wss.clients.size} đang mở)`);
  socket.on('close', () => console.log(`[server] client ngắt (${wss.clients.size} đang mở)`));
});

http.listen(PORT, () => {
  console.log(`[server] WebSocket và HTTP đang chạy ở ws://localhost:${PORT}`);
  console.log(tts.enabled ? `[tts] genmax bật (${tts.provider}, model ${tts.model})` : '[tts] chưa có GENMAX_API_KEY/GENMAX_VOICE_ID trong .env, MC dùng giọng trình duyệt');
});
