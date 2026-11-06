import { CONFIG } from '../config.js';
import { light, dark } from '../../art/color.js';
import { MAIN_VIEWPORT, scaleAt, screenY } from '../systems/Projection.js';

// Trang trí hai bên đường: các khối màu xếp bậc (hồng, ngọc, tím, xanh, vàng) và ống hồng có khớp vàng, như mockup.
// Vẽ bằng Graphics theo phối cảnh (mỗi khối 3 mặt: sườn hướng vào đường, mặt gần, mặt trên), từ xa tới gần.
// Mọi thứ sinh theo công thức từ chỉ số đoạn nên cố định, không tốn bộ nhớ và không nhấp nháy khi camera chạy.

const PALETTE = ['#ff4fa8', '#d94bff', '#8a5cff', '#3fe0e8', '#5aa9ff', '#ff6fb8'].map((c) => ({
  base: parseInt(c.slice(1), 16),
  top: parseInt(light(c, 0.38).slice(1), 16),
  side: parseInt(dark(c, 0.28).slice(1), 16),
  rim: parseInt(light(c, 0.7).slice(1), 16),
}));
const PIPE = { base: 0xff3f95, light: 0xff9ccb, dark: 0xb81f69, ring: 0xffc21a, ringDark: 0xd98a0a };

const STEP = 3; // một khối mỗi STEP đoạn
const PIPE_EVERY = 4; // một ống mỗi PIPE_EVERY khối
const BLOCK_SEGMENTS = 2; // chiều dài khối (số đoạn)

function rand(n) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function face(g, color, x1, y1, x2, y2, x3, y3, x4, y4, alpha = 1) {
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x3, y3);
  g.lineTo(x4, y4);
  g.closePath();
  g.fillPath();
}

/** Vẽ khối và ống hai bên đường vào Graphics g (gọi sau drawRoad). */
export function drawRoadside(g, cam, vp = MAIN_VIEWPORT, { maxSegments = CONFIG.maxSegments, minScale = CONFIG.minDrawScale } = {}) {
  const seg = CONFIG.segmentLength;
  const f = cam.focal;
  const { cx, unit } = vp;
  const inner0 = vp.roadHalfWidth + CONFIG.curbWidth * unit;
  const jNear = Math.floor((cam.z0 - f * 0.3) / (seg * STEP));
  const jFar = jNear + Math.ceil(maxSegments / STEP);

  for (let j = jFar; j >= jNear; j--) {
    const d0 = j * STEP * seg;
    const d1 = d0 + BLOCK_SEGMENTS * seg;
    const sFar = scaleAt(d1 - cam.z0, f);
    const sNear = scaleAt(d0 - cam.z0, f);
    if (sFar < minScale || d1 - cam.z0 < -f * 0.3 || sNear > 2.5) continue;
    const yNearG = screenY(sNear, vp);
    const yFarG = screenY(sFar, vp);

    for (const side of [-1, 1]) {
      const r = (k) => rand(j * 7919 + (side + 2) * 104729 + k * 1301);
      const color = PALETTE[Math.floor(r(1) * PALETTE.length)];
      const gap = (14 + r(2) * 46) * unit;
      const width = (150 + r(3) * 190) * unit;
      const height = (28 + r(4) * 110) * unit;
      const xi = inner0 + gap;
      const xo = xi + width;
      const X = (a, s) => cx + side * a * s;
      const topN = yNearG - height * sNear;
      const topF = yFarG - height * sFar;

      // sườn hướng vào đường, mặt gần, mặt trên (xếp cho đúng thứ tự che)
      face(g, color.side, X(xi, sNear), yNearG, X(xi, sNear), topN, X(xi, sFar), topF, X(xi, sFar), yFarG);
      face(g, color.base, X(xi, sNear), yNearG, X(xo, sNear), yNearG, X(xo, sNear), topN, X(xi, sNear), topN);
      face(g, color.top, X(xi, sNear), topN, X(xo, sNear), topN, X(xo, sFar), topF, X(xi, sFar), topF);
      // viền sáng mép trên mặt gần cho bóng bẩy
      face(g, color.rim, X(xi, sNear), topN, X(xo, sNear), topN, X(xo, sNear), topN + 6 * unit * sNear, X(xi, sNear), topN + 6 * unit * sNear, 0.55);

      // Khối nhỏ xếp bậc trên khối lớn cho một số khối
      if (r(5) > 0.55) {
        const color2 = PALETTE[Math.floor(r(6) * PALETTE.length)];
        const xi2 = xi + width * 0.12;
        const xo2 = xi + width * (0.5 + 0.2 * r(7));
        const h2 = height + (40 + r(8) * 90) * unit;
        const top2N = yNearG - h2 * sNear;
        const top2F = yFarG - h2 * sFar;
        face(g, color2.side, X(xi2, sNear), topN, X(xi2, sNear), top2N, X(xi2, sFar), top2F, X(xi2, sFar), topF);
        face(g, color2.base, X(xi2, sNear), topN, X(xo2, sNear), topN, X(xo2, sNear), top2N, X(xi2, sNear), top2N);
        face(g, color2.top, X(xi2, sNear), top2N, X(xo2, sNear), top2N, X(xo2, sFar), top2F, X(xi2, sFar), top2F);
      }

      // Ống hồng có khớp vàng, đứng phía ngoài các khối
      if (j % PIPE_EVERY === 0) drawPipe(g, side, sNear, yNearG, unit, cx, inner0 + (330 + r(9) * 120) * unit, r(10));
    }
  }
}

function drawPipe(g, side, s, yG, unit, cx, xCenter, tall) {
  const x = cx + side * xCenter * s;
  const w = 54 * unit * s;
  const h = (330 + tall * 260) * unit * s;
  const top = yG - h;
  // thân ống: sáng bên trong, tối bên ngoài
  face(g, PIPE.base, x - w / 2, yG, x + w / 2, yG, x + w / 2, top, x - w / 2, top);
  face(g, PIPE.light, x - w / 2, yG, x - w / 6, yG, x - w / 6, top, x - w / 2, top);
  face(g, PIPE.dark, x + w / 4, yG, x + w / 2, yG, x + w / 2, top, x + w / 4, top);
  // hai vòng khớp vàng và quả cầu đỉnh
  for (const t of [0.28, 0.72]) {
    const y = yG - h * t;
    face(g, PIPE.ring, x - w * 0.62, y, x + w * 0.62, y, x + w * 0.62, y - 16 * unit * s, x - w * 0.62, y - 16 * unit * s);
    face(g, PIPE.ringDark, x - w * 0.62, y, x + w * 0.62, y, x + w * 0.62, y + 5 * unit * s, x - w * 0.62, y + 5 * unit * s);
  }
  g.fillStyle(PIPE.ring, 1);
  g.fillCircle(x, top, w * 0.72);
  g.fillStyle(0xfff3b0, 0.7);
  g.fillCircle(x - w * 0.2, top - w * 0.22, w * 0.2);
}
