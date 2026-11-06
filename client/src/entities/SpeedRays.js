import Phaser from 'phaser';
import { CONFIG } from '../config.js';

const RAYS = 21;
const COLORS = [0xffc23a, 0xfff2b0, 0xff6ad0, 0xff9a2a, 0xffd86a];

// Tia tốc độ tỏa xuống dưới từ chân người đang boost mạnh và gần camera nhất (như mockup): vàng, trắng, hồng,
// cộng sáng, dài tới mép dưới màn hình. Một Graphics dùng chung, vẽ lại mỗi frame.
export class SpeedRays {
  constructor(scene) {
    this.g = scene.add.graphics().setDepth(9.6);
    this.burst = scene.add.image(0, 0, 'glow').setDepth(9.7).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd070).setVisible(false);
  }

  /** target: { x, y, s, power } hoặc null. clock là giây của game. */
  update(target, clock) {
    const g = this.g;
    g.clear();
    this.burst.setVisible(false);
    if (!target) return;
    const { x, y, s, power } = target;
    // Quầng sáng chói ở chân
    this.burst.setPosition(x, y - 30 * s).setScale(5.2 * s + 0.6).setAlpha(0.85 * power).setVisible(true);
    const ox = x;
    const oy = y - 30 * s;
    const reach = CONFIG.height - oy + 40; // tới hết mép dưới
    for (let i = 0; i < RAYS; i++) {
      const t = i / (RAYS - 1) - 0.5; // -0.5 đến 0.5
      const angle = Math.PI / 2 + t * 2.0; // quạt xuống dưới
      const flick = 0.72 + 0.28 * Math.sin(clock * 11 + i * 1.7);
      const len = (reach / Math.max(0.35, Math.sin(angle))) * (0.55 + 0.45 * (1 - Math.abs(t) * 1.2)) * flick;
      const half = (6 + 20 * (1 - Math.abs(t))) * (0.6 + s);
      const nx = Math.cos(angle + Math.PI / 2);
      const ny = Math.sin(angle + Math.PI / 2);
      const ex = ox + Math.cos(angle) * len;
      const ey = oy + Math.sin(angle) * len;
      // ba lớp chồng nhau, ngắn dần và sáng dần về gốc, để tia mờ dần về phía xa
      for (const [frac, alpha] of [[1, 0.38], [0.62, 0.46], [0.3, 0.56]]) {
        const lx = ox + Math.cos(angle) * len * frac;
        const ly = oy + Math.sin(angle) * len * frac;
        const w = half * (0.45 + 0.55 * frac);
        g.fillStyle(COLORS[i % COLORS.length], alpha * power * (0.6 + 0.4 * (1 - Math.abs(t))));
        g.fillTriangle(ox + nx * 2, oy + ny * 2, ox - nx * 2, oy - ny * 2, lx + nx * w, ly + ny * w);
        g.fillTriangle(ox - nx * 2, oy - ny * 2, lx + nx * w, ly + ny * w, lx - nx * w, ly - ny * w);
      }
    }
  }
}
