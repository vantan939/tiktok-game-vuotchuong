import { CONFIG } from '../config.js';
import { scaleAt, screenY, laneWidthPx } from '../systems/Projection.js';
import { FinishGate } from './FinishGate.js';

const COLORS = {
  ground: [0x8a78f5, 0x9283f8],
  road: [0x3c58e6, 0x4a67f0],
  curb: [0xff4fa8, 0xffc21a],
  laneLine: 0xffffff,
  roadBase: 0x3c58e6,
  groundBase: 0x8a78f5,
};

// Vẽ nền trời, núi, mặt đường phối cảnh, vạch kẻ làn, dải viền và cổng đích.
// Phần tĩnh (trời, núi, mây) vẽ một lần; phần động (đường, viền, cổng) vẽ lại mỗi frame.
export class TrackView {
  constructor(scene) {
    this.scene = scene;
    this.makeSky();
    this.makeFarScenery();
    this.road = scene.add.graphics().setDepth(1);
    this.gateG = scene.add.graphics().setDepth(2);
    this.gate = new FinishGate(scene, this.gateG);
  }

  makeSky() {
    const { width, horizonY } = CONFIG;
    if (!this.scene.textures.exists('sky')) {
      const tex = this.scene.textures.createCanvas('sky', 4, horizonY);
      const ctx = tex.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
      grad.addColorStop(0, '#2f6bff');
      grad.addColorStop(0.7, '#5aa4ff');
      grad.addColorStop(1, '#9bd4ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 4, horizonY);
      tex.refresh();
    }
    this.scene.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(width, horizonY + 2).setDepth(-10);
  }

  makeFarScenery() {
    const { width, horizonY } = CONFIG;
    const g = this.scene.add.graphics().setDepth(-9);
    // Mây
    g.fillStyle(0xffffff, 0.85);
    for (const [x, y, r] of [[120, 520, 46], [190, 505, 62], [270, 525, 44], [820, 470, 50], [900, 455, 66], [985, 480, 46]]) {
      g.fillCircle(x, y, r);
    }
    // Núi hai lớp, sinh theo công thức cố định để mỗi lần chạy giống nhau
    const layers = [
      { color: 0x7e96ff, base: 70, amp: 140, step: 150, phase: 0.3 },
      { color: 0x8f7df0, base: 30, amp: 90, step: 110, phase: 1.7 },
    ];
    for (const { color, base, amp, step, phase } of layers) {
      g.fillStyle(color, 1);
      for (let x = -step; x < width + step; x += step) {
        const h = base + amp * (0.5 + 0.5 * Math.sin(x * 0.013 + phase));
        g.fillTriangle(x - step * 0.9, horizonY + 6, x + step * 0.9, horizonY + 6, x, horizonY - h);
      }
    }
  }

  draw(cam) {
    const g = this.road;
    const { width: W, height: H, horizonY, roadHalfWidth, curbWidth, segmentLength: seg } = CONFIG;
    const cx = W / 2;
    const f = cam.focal;
    const laneW = laneWidthPx();
    g.clear();
    this.gateG.clear();

    // Nền đất và mặt đường tới tận chân trời, các đoạn kẻ sọc vẽ đè lên
    g.fillStyle(COLORS.groundBase, 1);
    g.fillRect(0, horizonY, W, H - horizonY);
    const bs = 1.3;
    g.fillStyle(COLORS.roadBase, 1);
    const sMin = CONFIG.minDrawScale;
    this.quad(g, COLORS.roadBase, cx - roadHalfWidth * sMin, screenY(sMin), cx - roadHalfWidth * bs, screenY(bs), cx + roadHalfWidth * bs, screenY(bs), cx + roadHalfWidth * sMin, screenY(sMin));

    const i0 = Math.floor((cam.z0 - f * 0.4) / seg);
    const finishSeg = Math.floor(CONFIG.trackLength / seg);
    const [dashOn, dashPeriod] = CONFIG.laneDashSegments;
    let sNear = scaleAt(i0 * seg - cam.z0, f);
    let yNear = screenY(sNear);

    for (let n = 0, i = i0; n < CONFIG.maxSegments; n++, i++) {
      const sFar = scaleAt((i + 1) * seg - cam.z0, f);
      if (sFar < CONFIG.minDrawScale) break;
      const yFar = screenY(sFar);
      if (yFar < H + 2 && yNear > horizonY) {
        const yN = yNear + 1; // chồng 1px để không hở đường nối
        const p = i & 1;
        const rNear = roadHalfWidth * sNear;
        const rFar = roadHalfWidth * sFar;
        // Dải đất hai bên (xen kẽ hai tông)
        g.fillStyle(COLORS.ground[p], 1);
        g.fillRect(0, yFar, W, yN - yFar);
        // Mặt đường
        this.quad(g, COLORS.road[p], cx - rNear, yN, cx - rFar, yFar, cx + rFar, yFar, cx + rNear, yN);
        // Dải viền hồng/vàng
        const cNear = (roadHalfWidth + curbWidth) * sNear;
        const cFar = (roadHalfWidth + curbWidth) * sFar;
        this.quad(g, COLORS.curb[p], cx - cNear, yN, cx - cFar, yFar, cx - rFar, yFar, cx - rNear, yN);
        this.quad(g, COLORS.curb[p], cx + rNear, yN, cx + rFar, yFar, cx + cFar, yFar, cx + cNear, yN);
        // Vạch kẻ làn nét đứt, neo theo quãng đường nên trôi theo tốc độ
        if (((i % dashPeriod) + dashPeriod) % dashPeriod < dashOn) {
          for (let k = 1; k < CONFIG.lanes; k++) {
            const lx = (k - CONFIG.lanes / 2) * laneW;
            const tN = 7 * sNear;
            const tF = 7 * sFar;
            this.quad(g, COLORS.laneLine, cx + lx * sNear - tN, yN, cx + lx * sFar - tF, yFar, cx + lx * sFar + tF, yFar, cx + lx * sNear + tN, yN);
          }
        }
        // Vạch xuất phát và vạch đích ca-rô
        if (i === 0) this.quad(g, 0xffffff, cx - rNear, yN, cx - rFar, yFar, cx + rFar, yFar, cx + rNear, yN);
        if (i === finishSeg || i === finishSeg + 1) this.checker(g, i - finishSeg, cx, roadHalfWidth, sNear, sFar, yNear, yFar);
      }
      sNear = sFar;
      yNear = yFar;
    }

    this.gate.draw(cam);
  }

  quad(g, color, x1, y1, x2, y2, x3, y3, x4, y4) {
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
    g.lineTo(x4, y4);
    g.closePath();
    g.fillPath();
  }

  checker(g, row, cx, half, sNear, sFar, yNear, yFar) {
    const cols = 12;
    const step = (half * 2) / cols;
    for (let c = 0; c < cols; c++) {
      const a = -half + c * step;
      const b = a + step;
      this.quad(g, (c + row) % 2 ? 0x1b1450 : 0xffffff, cx + a * sNear, yNear, cx + a * sFar, yFar, cx + b * sFar, yFar, cx + b * sNear, yNear);
    }
  }
}
