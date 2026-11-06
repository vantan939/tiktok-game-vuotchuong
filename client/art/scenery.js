import { dark, light } from './color.js';
import { blur, hGrad, r2, sphereGrad, svgDoc, vGrad } from './svg.js';

// Cảnh nền và hiệu ứng mềm: khinh khí cầu, mây, núi sương mờ, bóng đổ, bụi, giấy pháo.

/** Khinh khí cầu sọc. 200x300. colors: [màu sọc 1, màu sọc 2]. */
export function balloonSvg([c1, c2]) {
  const defs = `
    ${sphereGrad('env', '#ffffff', { fx: 0.32, fy: 0.25, hi: 0.2, lo: 0.3 })}
    ${hGrad('basket', '#c98a4b', '#7a4a22', '#b57a3c')}
    <clipPath id="envClip"><ellipse cx="100" cy="104" rx="82" ry="96"/></clipPath>
    <radialGradient id="shade" cx="0.5" cy="0.5" r="0.62" fx="0.32" fy="0.25">
      <stop offset="0.4" stop-color="#fff" stop-opacity="0.38"/><stop offset="0.75" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#1b0f5c" stop-opacity="0.38"/>
    </radialGradient>
    ${blur('b4', 4)}`;
  // Các múi dọc: elip hẹp dần ở giữa tạo cảm giác cong
  const gores = [82, 58, 34, 10]
    .map((rx, i) => `<ellipse cx="100" cy="104" rx="${rx}" ry="96" fill="${i % 2 ? c2 : c1}"/>`)
    .join('');
  const body = `
    <g clip-path="url(#envClip)">
      <rect x="0" y="0" width="200" height="220" fill="${c2}"/>
      ${gores}
      <ellipse cx="100" cy="104" rx="82" ry="96" fill="url(#shade)"/>
    </g>
    <path d="M44 168 L84 232" stroke="#8a6a4a" stroke-width="3"/><path d="M156 168 L116 232" stroke="#8a6a4a" stroke-width="3"/>
    <path d="M84 232 L116 232 L110 262 H90Z" fill="url(#basket)" stroke="#6a3c18" stroke-width="3" stroke-linejoin="round"/>
    <line x1="92" y1="244" x2="108" y2="244" stroke="#6a3c18" stroke-width="2"/><line x1="92" y1="254" x2="108" y2="254" stroke="#6a3c18" stroke-width="2"/>
    <ellipse cx="66" cy="62" rx="22" ry="12" transform="rotate(-40 66 62)" fill="#fff" opacity="0.65" filter="url(#b4)"/>`;
  return svgDoc(200, 270, body, defs);
}

/** Mây phồng: bóng nhẹ ngả xanh ở đáy, viền sáng ở trên. 360x190. */
export function cloudSvg(variant = 0) {
  const defs = `${vGrad('cg', '#ffffff', '#c9e2ff')}${blur('b6', 6)}`;
  const puffs = [
    [
      [70, 120, 56], [140, 92, 70], [220, 108, 62], [290, 128, 48], [180, 134, 60],
    ],
    [
      [60, 128, 48], [130, 100, 62], [205, 84, 58], [270, 112, 56], [320, 136, 40], [170, 138, 56],
    ],
    [
      [90, 118, 60], [170, 96, 66], [250, 120, 56], [140, 140, 52], [220, 144, 52],
    ],
  ][variant % 3];
  const circles = puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#cg)"/>`).join('');
  const hi = puffs
    .slice(0, 3)
    .map(([x, y, r]) => `<ellipse cx="${x - r * 0.25}" cy="${y - r * 0.45}" rx="${r * 0.5}" ry="${r * 0.22}" fill="#fff" opacity="0.85" filter="url(#b6)"/>`)
    .join('');
  const body = `<g opacity="0.97">${circles}</g>
    <ellipse cx="180" cy="168" rx="150" ry="14" fill="#8fb8f0" opacity="0.35" filter="url(#b6)"/>${hi}`;
  return svgDoc(360, 190, body, defs);
}

/** Dãy núi tím xanh nhiều lớp, sương mờ chân núi. 1080x420. */
export function mountainsSvg() {
  const defs = `
    ${vGrad('far', '#7fb0ff', '#bcd9ff')}
    ${vGrad('mid', '#6f9bff', '#a8c4ff')}
    ${vGrad('near', '#6a8cf5', '#9db6ff')}
    <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#afd4ff" stop-opacity="0"/><stop offset="1" stop-color="#b9dcff" stop-opacity="0.95"/>
    </linearGradient>
    ${blur('b8', 8)}`;
  const peaks = (seed, base, amp, step) => {
    let d = `M-20 420 L-20 ${base}`;
    for (let x = -20; x <= 1100; x += step) {
      const h = r2(base - amp * (0.45 + 0.55 * Math.abs(Math.sin(x * 0.011 + seed))));
      d += ` Q${x + step * 0.5} ${r2(h - amp * 0.18)} ${x + step} ${r2(base - amp * 0.2 * Math.abs(Math.sin(x * 0.02 + seed)))}`;
    }
    return `${d} L1100 420Z`;
  };
  const body = `
    <path d="${peaks(0.4, 340, 230, 150)}" fill="url(#far)"/>
    <path d="${peaks(1.9, 360, 170, 120)}" fill="url(#mid)"/>
    <path d="${peaks(3.1, 386, 110, 96)}" fill="url(#near)"/>
    <g fill="#fff" opacity="0.28" filter="url(#b8)"><ellipse cx="260" cy="210" rx="70" ry="20"/><ellipse cx="760" cy="190" rx="90" ry="22"/></g>
    <rect x="0" y="300" width="1080" height="120" fill="url(#mist)"/>`;
  return svgDoc(1080, 420, body, defs);
}

/** Bóng đổ mềm dưới chân (gradient tròn trong suốt dần). 240x48. */
export function shadowSvg() {
  const defs = `<radialGradient id="sh" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#140a50" stop-opacity="0.6"/><stop offset="0.6" stop-color="#140a50" stop-opacity="0.28"/><stop offset="1" stop-color="#140a50" stop-opacity="0"/></radialGradient>`;
  return svgDoc(240, 48, '<ellipse cx="120" cy="24" rx="120" ry="24" fill="url(#sh)"/>', defs);
}

/** Cụm bụi mềm. 96x96. */
export function dustSvg() {
  const defs = `<radialGradient id="d" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.55" stop-color="#e9e2ff" stop-opacity="0.6"/><stop offset="1" stop-color="#cfc4ff" stop-opacity="0"/></radialGradient>`;
  return svgDoc(96, 96, '<circle cx="48" cy="48" r="48" fill="url(#d)"/>', defs);
}

/** Mảnh giấy pháo, trắng có đổ bóng để tô màu bằng tint. 18x30. */
export function confettiSvg() {
  const defs = `<linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c7c2e6"/></linearGradient>`;
  return svgDoc(18, 30, '<rect x="1" y="1" width="16" height="28" rx="4" fill="url(#c)"/><rect x="3" y="3" width="4" height="24" rx="2" fill="#fff" opacity="0.7"/>', defs);
}

export { dark, light };
