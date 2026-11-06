import { WebSocketServer } from 'ws';

const PORT = Number(process.env.WS_PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (socket) => {
  console.log(`[server] client kết nối (${wss.clients.size} đang mở)`);
  socket.on('close', () => console.log(`[server] client ngắt (${wss.clients.size} đang mở)`));
});

console.log(`[server] WebSocket đang chạy ở ws://localhost:${PORT}`);
