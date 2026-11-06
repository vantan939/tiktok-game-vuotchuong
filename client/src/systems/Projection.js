import { CONFIG } from '../config.js';

// Phối cảnh đường đua nhìn từ phía sau. Logic thuần, không phụ thuộc Phaser.
// cam = { z0, focal }: z0 là quãng đường tại mép dưới màn hình, focal quyết định độ zoom xa.
// Với z = dist - z0 (đơn vị phía trước camera): s = focal / (focal + z), s = 1 ở mép dưới, s -> 0 ở chân trời.

export function scaleAt(z, focal) {
  return focal / (focal + z);
}

export function screenY(s) {
  return CONFIG.horizonY + (CONFIG.height - CONFIG.horizonY) * s;
}

/** Bề rộng một làn tại s = 1 (px). */
export function laneWidthPx() {
  return (CONFIG.roadHalfWidth * 2) / CONFIG.lanes;
}

/** Tọa độ ngang (đơn vị làn, 0 = giữa đường) của tâm làn thứ index (0 là trái nhất). */
export function laneCenter(index) {
  return index - (CONFIG.lanes - 1) / 2;
}

export function screenX(laneX, s) {
  return CONFIG.width / 2 + laneX * laneWidthPx() * s;
}

/** Chiếu một điểm (laneX, dist) lên màn hình. Ghi vào out để khỏi tạo object mỗi frame. */
export function project(laneX, dist, cam, out = { x: 0, y: 0, s: 0 }) {
  const s = scaleAt(dist - cam.z0, cam.focal);
  out.s = s;
  out.x = screenX(laneX, s);
  out.y = screenY(s);
  return out;
}
