import { CONFIG } from '../config.js';
import { MAIN_VIEWPORT, laneWidthPx, scaleAt, screenY } from '../systems/Projection.js';

const COLORS = {
  ground: [0x8a78f5, 0x9283f8],
  road: [0x3c58e6, 0x4a67f0],
  curb: [0xff4fa8, 0xffc21a],
  laneLine: 0xffffff,
  roadBase: 0x3c58e6,
  groundBase: 0x8a78f5,
};

export function quad(g, color, x1, y1, x2, y2, x3, y3, x4, y4) {
  g.fillStyle(color, 1);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x3, y3);
  g.lineTo(x4, y4);
  g.closePath();
  g.fillPath();
}

function checker(g, row, cx, half, sNear, sFar, yNear, yFar) {
  const cols = 12;
  const step = (half * 2) / cols;
  for (let c = 0; c < cols; c++) {
    const a = -half + c * step;
    const b = a + step;
    quad(g, (c + row) % 2 ? 0x1b1450 : 0xffffff, cx + a * sNear, yNear, cx + a * sFar, yFar, cx + b * sFar, yFar, cx + b * sNear, yNear);
  }
}

/**
 * Vẽ nền đất, mặt đường phối cảnh, dải viền hồng/vàng, vạch kẻ làn, vạch xuất phát và vạch đích vào Graphics g,
 * theo camera cam và khung vẽ vp (màn hình chính hoặc cửa sổ camera cận).
 * opts.maxSegments / opts.minScale: giới hạn độ xa khi vẽ (cửa sổ nhỏ chỉ cần vẽ gần).
 */
export function drawRoad(g, cam, vp = MAIN_VIEWPORT, { maxSegments = CONFIG.maxSegments, minScale = CONFIG.minDrawScale } = {}) {
  const { w: W, h: H, cx, horizonY, roadHalfWidth, unit } = vp;
  const curbWidth = CONFIG.curbWidth * unit;
  const seg = CONFIG.segmentLength;
  const f = cam.focal;
  const laneW = laneWidthPx(vp);
  g.clear();

  // Nền đất và mặt đường tới tận chân trời, các đoạn kẻ sọc vẽ đè lên
  g.fillStyle(COLORS.groundBase, 1);
  g.fillRect(0, horizonY, W, H - horizonY);
  const bs = 1.3;
  quad(g, COLORS.roadBase, cx - roadHalfWidth * minScale, screenY(minScale, vp), cx - roadHalfWidth * bs, screenY(bs, vp), cx + roadHalfWidth * bs, screenY(bs, vp), cx + roadHalfWidth * minScale, screenY(minScale, vp));

  const i0 = Math.floor((cam.z0 - f * 0.4) / seg);
  const finishSeg = Math.floor(CONFIG.trackLength / seg);
  const [dashOn, dashPeriod] = CONFIG.laneDashSegments;
  let sNear = scaleAt(i0 * seg - cam.z0, f);
  let yNear = screenY(sNear, vp);

  for (let n = 0, i = i0; n < maxSegments; n++, i++) {
    const sFar = scaleAt((i + 1) * seg - cam.z0, f);
    if (sFar < minScale) break;
    const yFar = screenY(sFar, vp);
    if (yFar < H + 2 && yNear > horizonY) {
      const yN = yNear + 1; // chồng 1px để không hở đường nối
      const p = i & 1;
      const rNear = roadHalfWidth * sNear;
      const rFar = roadHalfWidth * sFar;
      // Dải đất hai bên (xen kẽ hai tông)
      g.fillStyle(COLORS.ground[p], 1);
      g.fillRect(0, yFar, W, yN - yFar);
      // Mặt đường
      quad(g, COLORS.road[p], cx - rNear, yN, cx - rFar, yFar, cx + rFar, yFar, cx + rNear, yN);
      // Dải viền hồng/vàng
      const cNear = (roadHalfWidth + curbWidth) * sNear;
      const cFar = (roadHalfWidth + curbWidth) * sFar;
      quad(g, COLORS.curb[p], cx - cNear, yN, cx - cFar, yFar, cx - rFar, yFar, cx - rNear, yN);
      quad(g, COLORS.curb[p], cx + rNear, yN, cx + rFar, yFar, cx + cFar, yFar, cx + cNear, yN);
      // Vạch kẻ làn nét đứt, neo theo quãng đường nên trôi theo tốc độ
      if (((i % dashPeriod) + dashPeriod) % dashPeriod < dashOn) {
        for (let k = 1; k < CONFIG.lanes; k++) {
          const lx = (k - CONFIG.lanes / 2) * laneW;
          const tN = 7 * unit * sNear;
          const tF = 7 * unit * sFar;
          quad(g, COLORS.laneLine, cx + lx * sNear - tN, yN, cx + lx * sFar - tF, yFar, cx + lx * sFar + tF, yFar, cx + lx * sNear + tN, yN);
        }
      }
      // Vạch xuất phát và vạch đích ca-rô
      if (i === 0) quad(g, 0xffffff, cx - rNear, yN, cx - rFar, yFar, cx + rFar, yFar, cx + rNear, yN);
      if (i === finishSeg || i === finishSeg + 1) checker(g, i - finishSeg, cx, roadHalfWidth, sNear, sFar, yNear, yFar);
    }
    sNear = sFar;
    yNear = yFar;
  }
}
