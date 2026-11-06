import { dark, light } from './color.js';
import { blur, gloss, hGrad, r2, rimGrad, sphereGrad, svgDoc, vGrad } from './svg.js';

// Chướng ngại, cổng đích và cờ: vẽ SVG kiểu 3D hoạt hình, hồng và vàng như mockup.

const PINK = '#ff3f95';
const YELLOW = '#ffc21a';

/** Đầu búa: hình trụ nằm ngang, thân hồng bóng, hai đầu vàng, vòng vàng, vệt sáng. 300x150. */
export function hammerHeadSvg() {
  const defs = `
    ${vGrad('tube', light(PINK, 0.55), dark(PINK, 0.42), PINK)}
    ${vGrad('capG', light(YELLOW, 0.5), dark(YELLOW, 0.4), YELLOW)}
    ${vGrad('band', light(YELLOW, 0.4), dark(YELLOW, 0.3))}
    ${sphereGrad('face', YELLOW, { fx: 0.4, fy: 0.3 })}
    ${blur('b4', 4)}`;
  const body = `
    <rect x="24" y="14" width="252" height="122" rx="40" fill="url(#tube)"/>
    <rect x="58" y="14" width="22" height="122" fill="url(#band)"/>
    <rect x="220" y="14" width="22" height="122" fill="url(#band)"/>
    <rect x="30" y="22" width="240" height="22" rx="11" fill="#fff" opacity="0.42" filter="url(#b4)"/>
    <rect x="30" y="108" width="240" height="22" rx="11" fill="#7a0a50" opacity="0.32" filter="url(#b4)"/>
    <ellipse cx="34" cy="75" rx="30" ry="62" fill="url(#face)"/>
    <ellipse cx="266" cy="75" rx="30" ry="62" fill="url(#face)"/>
    <ellipse cx="28" cy="75" rx="12" ry="46" fill="${dark(YELLOW, 0.2)}" opacity="0.5"/>
    <ellipse cx="272" cy="75" rx="12" ry="46" fill="${dark(YELLOW, 0.2)}" opacity="0.5"/>
    <ellipse cx="24" cy="46" rx="9" ry="16" fill="#fff" opacity="0.6"/>`;
  return svgDoc(300, 150, body, defs);
}

/** Cán búa vàng dựng đứng, có vòng hồng. 60x600. */
export function hammerHandleSvg() {
  const defs = `${hGrad('hG', light(YELLOW, 0.5), dark(YELLOW, 0.38), YELLOW)}${hGrad('rG', light(PINK, 0.5), dark(PINK, 0.4), PINK)}`;
  const rings = [60, 190, 320, 450]
    .map((y) => `<rect x="0" y="${y}" width="60" height="30" rx="8" fill="url(#rG)"/>`)
    .join('');
  const body = `<rect x="8" y="0" width="44" height="600" rx="14" fill="url(#hG)"/>${rings}
    <rect x="16" y="0" width="7" height="600" rx="3" fill="#fff" opacity="0.5"/>`;
  return svgDoc(60, 600, body, defs);
}

/** Quả cầu gai đỏ hồng, gai kem. 230x230. */
export function spikeBallSvg() {
  const C = 115;
  const defs = `
    ${sphereGrad('ball', '#e8244f', { hi: 0.48, lo: 0.55 })}
    ${sphereGrad('bump', '#d41d47', { hi: 0.5 })}
    ${rimGrad('rim', '#ffc0d4', 0.6)}
    ${vGrad('spk', '#fffaf0', '#e6cfc0')}
    ${blur('b3', 3)}`;
  const outer = Array.from({ length: 14 }, (_, i) => {
    const a = (i * Math.PI * 2) / 14 + 0.12;
    const len = 112 + (i % 2) * 4;
    const x1 = r2(C + Math.cos(a - 0.2) * 70);
    const y1 = r2(C + Math.sin(a - 0.2) * 70);
    const x2 = r2(C + Math.cos(a + 0.2) * 70);
    const y2 = r2(C + Math.sin(a + 0.2) * 70);
    const tx = r2(C + Math.cos(a) * len);
    const ty = r2(C + Math.sin(a) * len);
    return `<path d="M${x1} ${y1} L${tx} ${ty} L${x2} ${y2}Z" fill="url(#spk)" stroke="#d9bfae" stroke-width="2" stroke-linejoin="round"/>`;
  }).join('');
  const front = [
    [78, 70, 15], [150, 66, 14], [112, 112, 17], [160, 128, 15], [74, 148, 13], [128, 160, 13], [182, 98, 12],
  ]
    .map(
      ([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#bump)"/>
      <path d="M${x - r * 0.55} ${y} L${x} ${y - r * 1.7} L${x + r * 0.55} ${y}Z" fill="url(#spk)" stroke="#d9bfae" stroke-width="1.5" stroke-linejoin="round" transform="translate(${-r * 0.1} ${r * 0.2})"/>`,
    )
    .join('');
  const body = `${outer}
    <circle cx="${C}" cy="${C}" r="78" fill="url(#ball)"/>
    <circle cx="${C}" cy="${C}" r="78" fill="url(#rim)"/>
    ${front}
    ${gloss(86, 82, 28, 14, -35, 'b3')}`;
  return svgDoc(230, 230, body, defs);
}

/** Cờ ca-rô trên cột hồng, hướng sang phải. 150x260. */
export function flagSvg() {
  const defs = `${hGrad('pole', light(PINK, 0.55), dark(PINK, 0.4), PINK)}${sphereGrad('knob', YELLOW)}`;
  let squares = '';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const x = 22 + c * 28;
      const y = 22 + r * 26 - c * 3; // hơi cong như đang bay
      squares += `<path d="M${x} ${y} h28 v26 h-28Z" fill="${(r + c) % 2 ? '#241a6e' : '#ffffff'}" transform="skewY(-4)" />`;
    }
  }
  const body = `
    <rect x="6" y="20" width="14" height="236" rx="7" fill="url(#pole)"/>
    <circle cx="13" cy="16" r="14" fill="url(#knob)"/>
    <g>${squares}</g>
    <path d="M22 18 h112 v78 h-112Z" fill="none" stroke="#fff" stroke-width="0" />
    <rect x="9" y="26" width="4" height="220" rx="2" fill="#fff" opacity="0.5"/>`;
  return svgDoc(150, 260, body, defs);
}

/** Cổng đích hình vòm hồng, hoa văn thoi vàng, bảng ĐÍCH (chữ vẽ thêm bằng canvas khi bake). 1000x660. */
export function gateSvg() {
  const W = 1000;
  const defs = `
    ${vGrad('plate', '#ff6a4a', '#d61f2f')}
    ${vGrad('dia', light(YELLOW, 0.55), dark(YELLOW, 0.3), YELLOW)}
    ${blur('b6', 6)}`;
  const arch = 'M72 640 L72 330 A428 286 0 0 1 928 330 L928 640';
  const diamonds = [0, 1, 2]
    .flatMap((i) =>
      [72, 928].map((x) => {
        const y = 520 + i * 0 - i * 90 + 90; // 610, 520, 430
        const cy = 610 - i * 90;
        return `<path d="M${x} ${cy - 36} L${x + 28} ${cy} L${x} ${cy + 36} L${x - 28} ${cy}Z" fill="url(#dia)" stroke="${dark(YELLOW, 0.4)}" stroke-width="3"/>`;
      }),
    )
    .join('');
  const body = `
    <path d="${arch}" stroke="${dark(PINK, 0.55)}" stroke-width="112" fill="none" transform="translate(0 6)"/>
    <path d="${arch}" stroke="${dark(PINK, 0.25)}" stroke-width="104" fill="none"/>
    <path d="${arch}" stroke="${PINK}" stroke-width="92" fill="none"/>
    <path d="${arch}" stroke="${light(PINK, 0.35)}" stroke-width="46" fill="none" transform="translate(-6 -8)"/>
    <path d="${arch}" stroke="#fff" stroke-width="9" fill="none" opacity="0.55" transform="translate(-14 -22)" filter="url(#b6)"/>
    <path d="M118 640 L118 330 A382 240 0 0 1 882 330 L882 640" stroke="${YELLOW}" stroke-width="10" fill="none" opacity="0.9"/>
    ${diamonds}
    <rect x="330" y="12" width="340" height="134" rx="34" fill="${dark('#d61f2f', 0.4)}"/>
    <rect x="338" y="18" width="324" height="122" rx="30" fill="url(#plate)"/>
    <rect x="352" y="26" width="296" height="26" rx="13" fill="#fff" opacity="0.38" filter="url(#b6)"/>`;
  return svgDoc(W, 660, body, defs);
}
