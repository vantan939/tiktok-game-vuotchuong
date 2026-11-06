import { CONFIG } from '../config.js';

// Camera chính: luôn zoom xa, ôm cả đoàn đua. Logic thuần.
// Người cuối luôn ở tỉ lệ cameraBackScale; khi đoàn dàn ra thì tăng focal (zoom xa hơn)
// để người đầu vẫn nằm trong khung ở tỉ lệ cameraFarScale. Mọi thay đổi được làm mượt.
export class RaceCamera {
  constructor(cfg = CONFIG) {
    this.cfg = cfg;
    this.z0 = 0;
    this.focal = cfg.cameraMinFocal;
    this.last = 0; // vị trí người cuối đã làm mượt
    this.ready = false;
  }

  /** Giá trị mục tiêu theo vị trí các nhân vật. */
  target(distances) {
    const { cameraBackScale: sBack, cameraFarScale: sFar, cameraMinFocal } = this.cfg;
    let min = Infinity;
    let max = -Infinity;
    for (const d of distances) {
      if (d < min) min = d;
      if (d > max) max = d;
    }
    const spread = max - min;
    // spread = focal * (1/sFar - 1/sBack)
    const focal = Math.max(cameraMinFocal, spread / (1 / sFar - 1 / sBack));
    return { last: min, focal };
  }

  /** Đặt camera ngay vào vị trí đúng, không làm mượt (dùng khi bắt đầu lượt). */
  snap(distances) {
    if (!distances.length) return;
    const t = this.target(distances);
    this.last = t.last;
    this.focal = t.focal;
    this.refresh();
    this.ready = true;
  }

  update(distances, dt) {
    if (!distances.length) return;
    if (!this.ready) return this.snap(distances);
    const t = this.target(distances);
    const a = 1 - Math.exp(-this.cfg.cameraSmooth * dt);
    this.last += (t.last - this.last) * a;
    this.focal += (t.focal - this.focal) * a;
    this.refresh();
  }

  refresh() {
    // Người cuối nằm ở z = focal * (1/sBack - 1) phía trước mép dưới màn hình
    this.z0 = this.last - this.focal * (1 / this.cfg.cameraBackScale - 1);
  }
}
