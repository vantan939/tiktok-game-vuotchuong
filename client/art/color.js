// Hàm màu cho phần vẽ asset (SVG). Thuần chuỗi, chạy được cả trong trình duyệt lẫn Node.

export function parseHex(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

export function toHex([r, g, b]) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

export function mix(a, b, t) {
  const A = parseHex(a);
  const B = parseHex(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
}

/** Sáng lên (pha với trắng ấm). */
export const light = (hex, t) => mix(hex, '#fffbe8', t);

/** Tối đi nhưng ngả tím xanh cho đúng chất hoạt hình 3D (không dùng đen thuần). */
export const dark = (hex, t) => mix(hex, '#1b0f5c', t);
