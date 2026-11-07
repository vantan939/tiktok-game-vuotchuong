import { CONFIG } from '../config.js';

/** Thời gian chờ trước lần kết nối lại thứ attempt (0, 1, 2...): 1, 2, 4, 8, 16, 30, 30... giây, tối đa reconnectMaxMs. */
export function backoffMs(attempt, cfg = CONFIG.net) {
  return Math.min(cfg.reconnectMaxMs, cfg.reconnectBaseMs * 2 ** attempt);
}

/**
 * Trạng thái kết nối để hiện chấm ở góc màn hình (logic thuần, test được):
 *  xanh: đang nhận sự kiện (WebSocket mở và server báo đã nối được nguồn live/replay)
 *  vàng: đang kết nối lại (WebSocket vừa đứt chưa lâu, hoặc server đang nối lại TikTok)
 *  đỏ: mất kết nối (đứt quá redAfterMs, hoặc server báo mất hẳn: chưa live, chưa cấu hình...)
 * Cũng phát hiện kết nối "chết ngầm" (mở nhưng không nhận được gì, ví dụ rút mạng): isStale.
 */
export class NetStatus {
  constructor(cfg = CONFIG.net, now = 0) {
    this.cfg = cfg;
    this.open = false;
    this.since = now; // thời điểm bắt đầu ở trạng thái hiện tại (mở hoặc đứt)
    this.lastMessageAt = now;
    this.server = { state: 'connected', detail: '' }; // trước khi server báo gì thì coi là bình thường
  }

  onOpen(now) {
    this.open = true;
    this.since = now;
    this.lastMessageAt = now;
  }

  onClose(now) {
    if (this.open || this.since === undefined) this.since = now;
    this.open = false;
  }

  onMessage(now) {
    this.lastMessageAt = now;
  }

  /** Tin trạng thái từ server: { state: 'connected' | 'reconnecting' | 'disconnected', detail }. */
  onServerStatus(status) {
    if (['connected', 'reconnecting', 'disconnected'].includes(status?.state)) this.server = { state: status.state, detail: String(status.detail ?? '') };
  }

  /** Kết nối đang mở nhưng quá lâu không nhận được gì (server gửi nhịp tim đều đặn nên im lặng nghĩa là đã chết). */
  isStale(now) {
    return this.open && now - this.lastMessageAt > this.cfg.staleMs;
  }

  color(now) {
    if (!this.open) return now - this.since >= this.cfg.redAfterMs ? 'red' : 'yellow';
    if (this.server.state === 'connected') return 'green';
    return this.server.state === 'reconnecting' ? 'yellow' : 'red';
  }

  label(now) {
    const c = this.color(now);
    if (c === 'green') return 'Đang nhận sự kiện';
    if (c === 'yellow') return 'Đang kết nối lại...';
    return `Mất kết nối${this.open && this.server.detail ? `: ${this.server.detail}` : ''}`;
  }
}
