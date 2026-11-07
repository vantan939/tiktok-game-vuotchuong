import { CONFIG } from '../config.js';
import { NetStatus, backoffMs } from '../systems/NetStatus.js';

const WATCHDOG_MS = 2000;

// Nguồn sự kiện thật: nhận GameEvent (JSON) từ server qua WebSocket.
// - Tự kết nối lại với thời gian chờ tăng dần (1, 2, 4... tối đa 30 giây) và kết nối lại ngay khi mạng quay lại.
// - Phát hiện kết nối chết ngầm (rút mạng không báo đóng): server gửi tin trạng thái đều đặn, im lặng quá lâu thì nối lại.
// - Tin { type: 'status' } của server là trạng thái nguồn live (xanh/vàng/đỏ), không phải sự kiện game.
// Game không phụ thuộc vào nguồn này: mất kết nối thì game vẫn chạy với bot.
export class WebSocketSource {
  constructor(bus, url = CONFIG.serverUrl, {
    net = null, cfg = CONFIG.net, now = () => performance.now(), createSocket = (u) => new WebSocket(u),
    // Bọc hàm hẹn giờ: gọi như phương thức của object khác (this.setTimer) sẽ lỗi 'Illegal invocation' trên trình duyệt
    setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (t) => clearTimeout(t),
    setRepeat = (fn, ms) => setInterval(fn, ms), clearRepeat = (t) => clearInterval(t), log = console,
  } = {}) {
    Object.assign(this, { bus, url, cfg, now, createSocket, setTimer, clearTimer, setRepeat, clearRepeat, log });
    this.net = net ?? new NetStatus(cfg, now());
    this.socket = null;
    this.timer = null;
    this.watchdog = null;
    this.attempt = 0;
    this.stopped = false;
    this.onOnline = () => this.reconnectNow();
  }

  start() {
    this.stopped = false;
    this.connect();
    this.watchdog = this.setRepeat(() => {
      if (this.net.isStale(this.now())) {
        this.log.warn?.('[WebSocket] lâu không nhận được gì, kết nối lại');
        this.socket?.close();
      }
    }, WATCHDOG_MS);
    globalThis.addEventListener?.('online', this.onOnline);
  }

  stop() {
    this.stopped = true;
    this.clearTimer(this.timer);
    this.clearRepeat(this.watchdog);
    globalThis.removeEventListener?.('online', this.onOnline);
    this.socket?.close();
  }

  connect() {
    if (this.stopped) return;
    const socket = this.createSocket(this.url);
    this.socket = socket;
    socket.onopen = () => {
      this.attempt = 0;
      this.net.onOpen(this.now());
      this.log.log?.('[WebSocket] đã kết nối', this.url);
    };
    socket.onmessage = (msg) => {
      this.net.onMessage(this.now());
      let data;
      try {
        data = JSON.parse(msg.data);
      } catch {
        this.log.warn?.('[WebSocket] tin nhắn không phải JSON', msg.data);
        return;
      }
      if (data?.type === 'status') this.net.onServerStatus(data);
      else this.bus.emit(data);
    };
    socket.onclose = () => {
      if (socket !== this.socket) return; // socket cũ đã được thay
      this.net.onClose(this.now());
      if (this.stopped) return;
      const wait = backoffMs(this.attempt++, this.cfg);
      this.log.log?.(`[WebSocket] mất kết nối, thử lại sau ${Math.round(wait / 1000)} giây`);
      this.timer = this.setTimer(() => this.connect(), wait);
    };
    socket.onerror = () => socket.close();
  }

  /** Mạng vừa quay lại: không chờ hết thời gian chờ nữa, nối ngay. */
  reconnectNow() {
    if (this.stopped || this.net.open) return;
    this.clearTimer(this.timer);
    this.attempt = 0;
    this.socket?.close?.();
    this.connect();
  }
}
