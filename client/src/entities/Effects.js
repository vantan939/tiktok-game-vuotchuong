import { ART, ATLAS } from './art.js';

const POOL_SIZE = 96;
const PUFFS_PER_BURST = 7;

// Hiệu ứng bụi khi va chạm. Dùng pool sprite, không tạo đối tượng mới giữa trận.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.pool = Array.from({ length: POOL_SIZE }, () => scene.add.image(0, 0, ATLAS, 'dust').setVisible(false).setActive(false));
    this.next = 0;
  }

  /** Bụi tung lên tại (x, y) màn hình, kích thước theo phối cảnh s. depth để xếp trước nhân vật. */
  dust(x, y, s, depth = 500) {
    for (let i = 0; i < PUFFS_PER_BURST; i++) {
      const p = this.pool[this.next++ % POOL_SIZE];
      const dir = (i / PUFFS_PER_BURST) * Math.PI * 2 + Math.random() * 0.6;
      const base = 1.5 * s * ART;
      this.scene.tweens.killTweensOf(p);
      p.setActive(true).setVisible(true).setDepth(depth).setPosition(x, y).setAlpha(0.9).setScale(0.4 * base);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(dir) * 140 * s,
        y: y + Math.sin(dir) * 60 * s - 50 * s,
        scale: base,
        alpha: 0,
        duration: 520,
        ease: 'Cubic.easeOut',
        onComplete: () => p.setVisible(false).setActive(false),
      });
    }
  }
}
