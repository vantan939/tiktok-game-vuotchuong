import { CONFIG } from '../config.js';
import { MAIN_VIEWPORT, laneWidthPx, scaleAt, screenY } from '../systems/Projection.js';

const COLORS = {
  ground: [0xb24df0, 0xc05cf6],
  road: [0x3a62f2, 0x4872ff],
  curb: [0xff4fa8, 0xffc21a],
  laneLine: 0xffffff,
  roadBase: 0x3a62f2,
  groundBase: 0xb24df0,
};

export function quad(g, color, x1, y1, x2, y2, x3, y3, x4, y4, alpha = 1) {
  g.fillStyle(color, alpha);
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
      // Độ bóng nhẹ: dải sáng ở giữa đường, sáng dần về phía gần
      const sheenW = 0.62;
      quad(g, 0xffffff, cx - rNear * sheenW, yN, cx - rFar * sheenW, yFar, cx + rFar * sheenW, yFar, cx + rNear * sheenW, yN, 0.025 + 0.03 * sNear);
      // Vệt sáng sát mép đường (phản chiếu viền neon)
      quad(g, 0xbfe6ff, cx - rNear, yN, cx - rFar, yFar, cx - rFar + (rFar * 0.03), yFar, cx - rNear + (rNear * 0.03), yN, 0.22);
      quad(g, 0xbfe6ff, cx + rNear - (rNear * 0.03), yN, cx + rFar - (rFar * 0.03), yFar, cx + rFar, yFar, cx + rNear, yN, 0.22);
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
          const hN = 16 * unit * sNear; // quầng sáng mềm quanh vạch
          const hF = 16 * unit * sFar;
          quad(g, 0xcfe4ff, cx + lx * sNear - hN, yN, cx + lx * sFar - hF, yFar, cx + lx * sFar + hF, yFar, cx + lx * sNear + hN, yN, 0.16);
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
