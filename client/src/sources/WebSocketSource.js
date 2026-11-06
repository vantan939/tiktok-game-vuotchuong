import { CONFIG } from '../config.js';

// Nguồn sự kiện thật: nhận GameEvent (JSON) từ server qua WebSocket, tự kết nối lại.
export class WebSocketSource {
  constructor(bus, url = CONFIG.serverUrl) {
    this.bus = bus;
    this.url = url;
    this.socket = null;
    this.timer = null;
    this.stopped = false;
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.socket?.close();
  }

  connect() {
    this.socket = new WebSocket(this.url);
    this.socket.onopen = () => console.log('[WebSocket] đã kết nối', this.url);
    this.socket.onmessage = (msg) => {
      try {
        this.bus.emit(JSON.parse(msg.data));
      } catch {
        console.warn('[WebSocket] tin nhắn không phải JSON', msg.data);
      }
    };
    this.socket.onclose = () => {
      if (this.stopped) return;
      this.timer = setTimeout(() => this.connect(), CONFIG.reconnectSeconds * 1000);
    };
    this.socket.onerror = () => this.socket.close();
  }
}
