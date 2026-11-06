import { CONFIG } from '../config.js';
import { STR } from '../strings.js';
import { scaleAt, screenY } from '../systems/Projection.js';

const PINK = 0xff4fa8;
const DARK_PINK = 0xd62d86;
const YELLOW = 0xffc21a;
const ARC_STEPS = 18;

// Cổng đích hình vòm chữ ĐÍCH, hai lá cờ ca-rô hai bên. Hiện ra khi gần cuối đường
// (xa hơn minDrawScale thì tự ẩn). Vẽ bằng Graphics, chữ ĐÍCH là một Text co giãn theo phối cảnh.
export class FinishGate {
  constructor(scene, graphics) {
    this.g = graphics;
    this.label = scene.add
      .text(0, 0, STR.finish, {
        fontFamily: '"Segoe UI", Arial, sans-serif',
        fontStyle: 'bold',
        fontSize: '110px',
        color: '#ffffff',
        stroke: '#7a1200',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(graphics.depth)
      .setVisible(false);
  }

  draw(cam) {
    const f = cam.focal;
    const s = scaleAt(CONFIG.trackLength - cam.z0, f);
    if (s < CONFIG.minDrawScale) {
      this.label.setVisible(false);
      return;
    }
    const g = this.g;
    const cx = CONFIG.width / 2;
    const y0 = screenY(s); // chân cổng
    const roadHalf = CONFIG.roadHalfWidth;
    const outer = (roadHalf + 105) * s;
    const inner = (roadHalf - 25) * s;
    const yTop = y0 - CONFIG.gatePillarHeight * s; // chỗ vòm bắt đầu cong
    const rise = CONFIG.gateArcHeight * s;
    const thick = 80 * s;

    // Cờ ca-rô hai bên: cột hồng + cờ 3x2 ô
    for (const side of [-1, 1]) {
      this.flag(cx + side * (roadHalf + 230) * s, y0, s, side);
    }

    // Hai trụ
    g.fillStyle(PINK, 1);
    g.fillRect(cx - outer, yTop, outer - inner, y0 - yTop);
    g.fillRect(cx + inner, yTop, outer - inner, y0 - yTop);
    // Hoa văn thoi vàng trên trụ
    g.fillStyle(YELLOW, 1);
    for (let k = 0; k < 3; k++) {
      const dy = y0 - (80 + k * 110) * s;
      for (const side of [-1, 1]) {
        const mx = cx + side * ((outer + inner) / 2);
        const r = 38 * s;
        g.fillTriangle(mx, dy - r, mx + r, dy, mx, dy + r);
        g.fillTriangle(mx, dy - r, mx - r, dy, mx, dy + r);
      }
    }

    // Vòm: dải cung giữa elip ngoài và elip trong
    g.fillStyle(PINK, 1);
    g.beginPath();
    for (let i = 0; i <= ARC_STEPS; i++) {
      const a = Math.PI + (Math.PI * i) / ARC_STEPS;
      g.lineTo(cx + Math.cos(a) * outer, yTop + Math.sin(a) * rise);
    }
    for (let i = ARC_STEPS; i >= 0; i--) {
      const a = Math.PI + (Math.PI * i) / ARC_STEPS;
      g.lineTo(cx + Math.cos(a) * inner, yTop + Math.sin(a) * (rise - thick));
    }
    g.closePath();
    g.fillPath();
    // Viền vàng trong của vòm
    g.lineStyle(Math.max(2, 10 * s), YELLOW, 1);
    g.beginPath();
    for (let i = 0; i <= ARC_STEPS; i++) {
      const a = Math.PI + (Math.PI * i) / ARC_STEPS;
      g.lineTo(cx + Math.cos(a) * inner, yTop + Math.sin(a) * (rise - thick));
    }
    g.strokePath();

    // Bảng ĐÍCH ở đỉnh vòm + vương miện vàng
    const signY = yTop - rise + thick * 0.5;
    const signW = 380 * s;
    const signH = 130 * s;
    g.fillStyle(DARK_PINK, 1);
    g.fillRoundedRect(cx - signW / 2 - 8 * s, signY - signH / 2 - 8 * s, signW + 16 * s, signH + 16 * s, 24 * s);
    g.fillStyle(0xff3b1f, 1);
    g.fillRoundedRect(cx - signW / 2, signY - signH / 2, signW, signH, 20 * s);
    this.crown(cx, signY - signH / 2 - 8 * s, s);
    this.label.setPosition(cx, signY).setScale(s).setVisible(true);
  }

  crown(x, y, s) {
    const g = this.g;
    const w = 110 * s;
    const h = 70 * s;
    g.fillStyle(YELLOW, 1);
    g.beginPath();
    g.moveTo(x - w / 2, y);
    g.lineTo(x - w / 2, y - h * 0.6);
    g.lineTo(x - w / 4, y - h * 0.3);
    g.lineTo(x, y - h);
    g.lineTo(x + w / 4, y - h * 0.3);
    g.lineTo(x + w / 2, y - h * 0.6);
    g.lineTo(x + w / 2, y);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xe0121f, 1);
    g.fillCircle(x, y - h * 0.32, 9 * s);
  }

  flag(x, y0, s, side) {
    const g = this.g;
    const poleH = 360 * s;
    const poleW = Math.max(2, 14 * s);
    g.fillStyle(PINK, 1);
    g.fillRect(x - poleW / 2, y0 - poleH, poleW, poleH);
    g.fillCircle(x, y0 - poleH, 14 * s);
    // Cờ ca-rô 4x3 ô hướng vào đường
    const cell = 34 * s;
    const left = side < 0 ? x + poleW / 2 : x - poleW / 2 - cell * 4;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        g.fillStyle((r + c) % 2 ? 0x1b1450 : 0xffffff, 1);
        g.fillRect(left + c * cell, y0 - poleH + 10 * s + r * cell, cell, cell);
      }
    }
  }
}
