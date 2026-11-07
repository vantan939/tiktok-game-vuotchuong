// Giữ game chạy khi tab bị ẩn / cửa sổ bị che: lúc đó trình duyệt ngừng gọi requestAnimationFrame (Phaser đứng) và
// làm chậm setInterval. Bộ đếm nhịp chạy trong Web Worker (không bị làm chậm), mỗi nhịp:
//  - onBeat(): việc cần đều nhịp (xếp lịch nhạc nền),
//  - onStale(dt): nếu khung hình đã ngừng quá staleMs thì cho logic game chạy bù dt giây (không vẽ).
// Khi khung hình chạy bình thường (frame() được gọi đều) thì onStale không bao giờ chạy.
export class BackgroundTicker {
  constructor({ onBeat = () => {}, onStale, intervalMs = 100, staleMs = 250, maxCatchUpMs = 1000, now = () => performance.now(), makeTimer = defaultTimer } = {}) {
    Object.assign(this, { onBeat, onStale, intervalMs, staleMs, maxCatchUpMs, now });
    this.lastRun = now(); // lần gần nhất logic được chạy (khung hình hoặc chạy bù)
    this.timer = makeTimer(() => this.beat(), intervalMs);
  }

  /** Gọi mỗi khung hình thật của Phaser. */
  frame() {
    this.lastRun = this.now();
  }

  beat() {
    this.onBeat();
    const t = this.now();
    const gap = t - this.lastRun;
    if (gap < this.staleMs) return;
    this.lastRun = t;
    this.onStale(Math.min(gap, this.maxCatchUpMs) / 1000);
  }

  stop() {
    this.timer?.stop();
    this.timer = null;
  }
}

// Worker tạo từ Blob; không có Worker (hoặc bị chặn) thì dùng setInterval thường
function defaultTimer(fn, ms) {
  try {
    const url = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${ms});`], { type: 'text/javascript' }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = fn;
    return { stop: () => worker.terminate() };
  } catch {
    const id = setInterval(fn, ms);
    return { stop: () => clearInterval(id) };
  }
}
