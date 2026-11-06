import { CONFIG } from '../config.js';
import { ATLAS } from './art.js';

const POOL_SIZE = 220;
const COLORS = [0xffc21a, 0xff4fa8, 0x35e0ff, 0x7be08f, 0xffffff, 0xb18aff, 0xff8a1f];
const GRAVITY = 900;

// Pháo hoa giấy: pool sprite cố định, tự cập nhật bằng tay (không tạo tween hay đối tượng mới giữa trận).
export class Confetti {
  constructor(scene, depth = 1100) {
    this.items = Array.from({ length: POOL_SIZE }, () => ({
      img: scene.add.image(0, 0, ATLAS, 'confetti').setDepth(depth).setVisible(false),
      active: false, vx: 0, vy: 0, vr: 0, age: 0, seed: 0,
    }));
    this.next = 0;
  }

  spawn(x, y, vx, vy) {
    const p = this.items[this.next++ % POOL_SIZE];
    p.active = true;
    p.vx = vx;
    p.vy = vy;
    p.vr = (Math.random() - 0.5) * 14;
    p.age = 0;
    p.seed = Math.random() * 10;
    p.img.setVisible(true).setPosition(x, y).setTint(COLORS[Math.floor(Math.random() * COLORS.length)]).setRotation(Math.random() * 6).setScale(0.6 + Math.random() * 0.5);
  }

  /** Bắn từ hai bên màn hình vào giữa. */
  burst(count = 70) {
    for (let i = 0; i < count; i++) {
      const left = i % 2 === 0;
      const x = left ? 0 : CONFIG.width;
      this.spawn(x, CONFIG.height * 0.55, (left ? 1 : -1) * (350 + Math.random() * 700), -(900 + Math.random() * 900));
    }
  }

  /** Rải nhẹ từ phía trên. */
  rain(count = 2) {
    for (let i = 0; i < count; i++) this.spawn(Math.random() * CONFIG.width, -40, (Math.random() - 0.5) * 120, 150 + Math.random() * 300);
  }

  /** Xóa hết giấy còn bay (khi sang lượt mới). */
  clear() {
    for (const p of this.items) {
      p.active = false;
      p.img.setVisible(false);
    }
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.active) continue;
      p.age += dt;
      p.vy += GRAVITY * dt;
      p.vx *= 1 - 0.7 * dt;
      p.vy *= 1 - 0.35 * dt;
      const img = p.img;
      img.x += (p.vx + Math.sin(p.age * 5 + p.seed) * 60) * dt;
      img.y += p.vy * dt;
      img.rotation += p.vr * dt;
      img.scaleY = Math.cos(p.age * 9 + p.seed) * 0.7 + 0.1 * Math.sign(Math.cos(p.age * 9 + p.seed)); // lật lật như giấy thật
      if (img.y > CONFIG.height + 60) {
        p.active = false;
        img.setVisible(false);
      }
    }
  }
}
