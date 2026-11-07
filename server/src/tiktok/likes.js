/**
 * Gộp tim theo người dùng trong một cửa sổ thời gian để giảm nhiễu: một người thả liên tục chỉ phát ra một sự kiện
 * like (tổng số lần chạm) mỗi windowMs. Cửa sổ tính từ lần thả đầu tiên; hết cửa sổ thì phát và bắt đầu lại.
 * Người nghe nhận (event) qua emit. Có thể truyền setTimeout/clearTimeout giả để test.
 */
export class LikeAggregator {
  constructor(emit, { windowMs = 1000, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (t) => clearTimeout(t) } = {}) {
    this.emit = emit;
    this.windowMs = windowMs;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.pending = new Map(); // userId -> { event, timer }
  }

  /** Nhận một sự kiện like đã chuyển đổi ({ type: 'like', userId, likeCount, ... }). */
  add(event) {
    const cur = this.pending.get(event.userId);
    if (cur) {
      cur.event.likeCount += event.likeCount;
      return;
    }
    const entry = { event: { ...event }, timer: null };
    entry.timer = this.setTimer(() => this.flushUser(event.userId), this.windowMs);
    this.pending.set(event.userId, entry);
  }

  flushUser(userId) {
    const entry = this.pending.get(userId);
    if (!entry) return;
    this.pending.delete(userId);
    this.emit(entry.event);
  }

  /** Phát hết những gì còn chờ (khi tắt server hoặc mất kết nối). */
  flushAll() {
    for (const [userId, entry] of [...this.pending]) {
      this.clearTimer(entry.timer);
      this.flushUser(userId);
    }
  }
}
