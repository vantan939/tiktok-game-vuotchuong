import { dark, light } from './color.js';

/** Làm tròn 2 chữ số thập phân: Math.sin/cos lệch bit cuối giữa trình duyệt và Node, làm tròn để SVG sinh ra giống hệt nhau. */
export const r2 = (x) => Math.round(x * 100) / 100;

/** Bọc phần thân thành một tài liệu SVG kích thước w x h (đơn vị logic, bake ở 2x khi xuất PNG). */
export function svgDoc(w, h, body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
}

/** Gradient hình cầu: sáng ở góc trên trái, tối dần ra mép dưới phải, kèm ánh ngả tím ở bóng đổ. */
export function sphereGrad(id, base, { fx = 0.34, fy = 0.28, hi = 0.5, lo = 0.5 } = {}) {
  return `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.62" fx="${fx}" fy="${fy}">
    <stop offset="0" stop-color="${light(base, hi)}"/>
    <stop offset="0.32" stop-color="${light(base, hi * 0.38)}"/>
    <stop offset="0.68" stop-color="${base}"/>
    <stop offset="0.9" stop-color="${dark(base, lo * 0.55)}"/>
    <stop offset="1" stop-color="${dark(base, lo)}"/>
  </radialGradient>`;
}

/** Gradient dọc đơn giản từ màu trên xuống màu dưới. */
export function vGrad(id, top, bottom, mid = null) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${top}"/>${mid ? `<stop offset="0.5" stop-color="${mid}"/>` : ''}
    <stop offset="1" stop-color="${bottom}"/>
  </linearGradient>`;
}

/** Gradient ngang. */
export function hGrad(id, left, right, mid = null) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${left}"/>${mid ? `<stop offset="0.45" stop-color="${mid}"/>` : ''}
    <stop offset="1" stop-color="${right}"/>
  </linearGradient>`;
}

/** Ánh sáng viền (rim light): trong suốt ở giữa, sáng dần ở mép phía dưới phải. */
export function rimGrad(id, color, alpha = 0.55) {
  return `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.5" fx="0.3" fy="0.25">
    <stop offset="0.72" stop-color="${color}" stop-opacity="0"/>
    <stop offset="1" stop-color="${color}" stop-opacity="${alpha}"/>
  </radialGradient>`;
}

/** Làm mờ (cho bóng, ánh sáng, điểm sáng). */
export function blur(id, std) {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${std}"/></filter>`;
}

/** Điểm sáng bóng loáng (specular): elip trắng mờ + chấm sáng nhỏ. */
export function gloss(cx, cy, rx, ry, rot = -30, blurId = null) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#fff" opacity="0.6"${blurId ? ` filter="url(#${blurId})"` : ''}/>
  <circle cx="${cx - rx * 0.35}" cy="${cy - ry * 0.55}" r="${Math.max(3, rx * 0.18)}" fill="#fff" opacity="0.9"/>`;
}
