import { ART, ATLAS } from './art.js';

const POOL_SIZE = 48;
const LIFE_SECONDS = 1.1;

// Trái tim nhỏ bay lên khi nhân vật nhận tim. Pool sprite cố định, tự cập nhật bằng tay.
export class Hearts {
  constructor(scene, depth = 600) {
    this.items = Array.from({ length: POOL_SIZE }, () => ({
      img: scene.add.image(0, 0, ATLAS, 'icon_heart').setDepth(depth).setVisible(false),
      active: false, age: 0, x0: 0, y0: 0, rise: 0, sway: 0, seed: 0, size: 1,
    }));
    this.next = 0;
  }

  /** Thả count trái tim bay lên từ (x, y) màn hình; s là tỉ lệ phối cảnh để co kích thước. */
  spawn(x, y, s, count = 1) {
    for (let i = 0; i < count; i++) {
      const p = this.items[this.next++ % POOL_SIZE];
      p.active = true;
      p.age = -i * 0.12; // các trái tim lần lượt bay lên
      p.x0 = x + (Math.random() - 0.5) * 90 * s;
      p.y0 = y;
      p.rise = (190 + Math.random() * 90) * Math.max(0.5, s);
      p.sway = 18 + Math.random() * 20;
      p.seed = Math.random() * 6;
      p.size = ART * Math.max(0.35, s * 1.1) * (0.8 + Math.random() * 0.4);
      p.img.setVisible(false);
    }
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age < 0) continue;
      const t = p.age / LIFE_SECONDS;
      if (t >= 1) {
        p.active = false;
        p.img.setVisible(false);
        continue;
      }
      const pop = Math.min(1, t * 6); // phình ra lúc đầu
      p.img
        .setVisible(true)
        .setPosition(p.x0 + Math.sin(t * 7 + p.seed) * p.sway, p.y0 - p.rise * (1 - (1 - t) ** 2))
        .setScale(p.size * pop)
        .setAlpha(t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35);
    }
  }
}
