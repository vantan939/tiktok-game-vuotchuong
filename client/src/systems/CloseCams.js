import { CONFIG } from '../config.js';

/**
 * Camera cận riêng (lệnh s), logic thuần. Ai gõ s thì bật cửa sổ cận cảnh cho nhân vật của mình,
 * gõ lần nữa thì tắt; không ảnh hưởng người khác. Tối đa maxCloseCams cửa sổ cùng lúc.
 * Tự tắt sau closeCamSeconds và khi hết lượt.
 */
export class CloseCams {
  constructor(manager, cfg = CONFIG) {
    this.manager = manager;
    this.cfg = cfg;
    this.cams = []; // theo thứ tự bật: { racer, since }
    manager.addListener((e) => {
      if ((e.type === 'state' && e.state === 'result') || e.type === 'round') this.clear();
    });
  }

  /**
   * Người xem gõ s. Trả về { status }:
   * 'on' | 'off' | 'full' (đủ cửa sổ) | 'not-joined' (chưa join hoặc đang ở hàng đợi)
   * | 'next-round' (đã giữ suất nhưng lượt này chưa có mặt) | 'idle' (đang ở màn kết quả).
   */
  press(user) {
    const m = this.manager;
    const racer = m.racerOf(user.userId);
    if (!racer) return { status: m.lobby.inQueue(user.userId) ? 'next-round' : 'not-joined' };
    if (m.state === 'result') return { status: 'idle' };

    const at = this.cams.findIndex((c) => c.racer === racer);
    if (at >= 0) {
      this.cams.splice(at, 1);
      return { status: 'off' };
    }
    if (this.cams.length >= this.cfg.maxCloseCams) return { status: 'full' };
    this.cams.push({ racer, since: m.now });
    return { status: 'on' };
  }

  /** Tắt các cửa sổ đã bật quá closeCamSeconds. */
  update(now) {
    const limit = this.cfg.closeCamSeconds;
    if (limit > 0) this.cams = this.cams.filter((c) => now - c.since < limit);
  }

  clear() {
    this.cams = [];
  }

  /** Số giây còn lại trước khi tự tắt (Infinity nếu không giới hạn). */
  secondsLeft(cam, now) {
    return this.cfg.closeCamSeconds > 0 ? Math.max(0, this.cfg.closeCamSeconds - (now - cam.since)) : Infinity;
  }
}
