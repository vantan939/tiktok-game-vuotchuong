import { CONFIG } from '../config.js';

// Phối cảnh đường đua nhìn từ phía sau. Logic thuần, không phụ thuộc Phaser.
// cam = { z0, focal }: z0 là quãng đường tại mép dưới màn hình, focal quyết định độ zoom xa.
// Với z = dist - z0 (đơn vị phía trước camera): s = focal / (focal + z), s = 1 ở mép dưới, s -> 0 ở chân trời.
//
// Viewport mô tả khung vẽ: màn hình chính (1080x1920) hoặc một cửa sổ camera cận nhỏ.
// unit là hệ số so với màn hình chính, dùng để co kích thước nhân vật, chướng ngại, nét vẽ cho vừa khung.

export function makeViewport({ w, h, horizonY, roadHalfWidth }) {
  return { w, h, cx: w / 2, horizonY, roadHalfWidth, unit: roadHalfWidth / CONFIG.roadHalfWidth };
}

export const MAIN_VIEWPORT = makeViewport({
  w: CONFIG.width,
  h: CONFIG.height,
  horizonY: CONFIG.horizonY,
  roadHalfWidth: CONFIG.roadHalfWidth,
});

export function scaleAt(z, focal) {
  return focal / (focal + z);
}

export function screenY(s, vp = MAIN_VIEWPORT) {
  return vp.horizonY + (vp.h - vp.horizonY) * s;
}

/** Bề rộng một làn tại s = 1 (px). */
export function laneWidthPx(vp = MAIN_VIEWPORT) {
  return (vp.roadHalfWidth * 2) / CONFIG.lanes;
}

/** Tọa độ ngang (đơn vị làn, 0 = giữa đường) của tâm làn thứ index (0 là trái nhất). */
export function laneCenter(index) {
  return index - (CONFIG.lanes - 1) / 2;
}

export function screenX(laneX, s, vp = MAIN_VIEWPORT) {
  return vp.cx + laneX * laneWidthPx(vp) * s;
}

/** Chiếu một điểm (laneX, dist) lên khung vẽ. Ghi vào out để khỏi tạo object mỗi frame. */
export function project(laneX, dist, cam, out = { x: 0, y: 0, s: 0 }, vp = MAIN_VIEWPORT) {
  const s = scaleAt(dist - cam.z0, cam.focal);
  out.s = s;
  out.x = screenX(laneX, s, vp);
  out.y = screenY(s, vp);
  return out;
}
