/**
 * Gộp tim theo người dùng để giảm nhiễu mà vẫn phản hồi ngay: lần thả đầu của một người được phát NGAY (người xem thấy
 * nhân vật tăng tốc liền, không chờ), các lần thả tiếp theo trong windowMs được cộng dồn và phát một lần khi hết cửa sổ.
 * Cửa sổ chỉ bắt đầu lại sau khi hết (người thả liên tục sẽ có tối đa một sự kiện mỗi windowMs sau sự kiện đầu).
 * Người nghe nhận (event) qua emit. Có thể truyền setTimeout/clearTimeout giả để test.
 */
export class LikeAggregator {
  constructor(emit, { windowMs = 1000, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (t) => clearTimeout(t) } = {}) {
    this.emit = emit;
    this.windowMs = windowMs;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.pending = new Map(); // userId -> { base, sum, timer }: sum là số lần chạm đã gom mà chưa phát
  }

  /** Nhận một sự kiện like đã chuyển đổi ({ type: 'like', userId, likeCount, ... }). */
  add(event) {
    const cur = this.pending.get(event.userId);
    if (cur) {
      cur.sum += event.likeCount;
      return;
    }
    this.emit({ ...event }); // lần đầu: báo ngay
    const entry = { base: event, sum: 0, timer: null };
    entry.timer = this.setTimer(() => this.flushUser(event.userId), this.windowMs);
    this.pending.set(event.userId, entry);
  }

  flushUser(userId) {
    const entry = this.pending.get(userId);
    if (!entry) return;
    this.pending.delete(userId);
    if (entry.sum > 0) this.emit({ ...entry.base, likeCount: entry.sum });
  }

  /** Phát hết những gì còn chờ (khi tắt server hoặc mất kết nối). */
  flushAll() {
    for (const [userId, entry] of [...this.pending]) {
      this.clearTimer(entry.timer);
      this.flushUser(userId);
    }
  }
}
