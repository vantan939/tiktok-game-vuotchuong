import { dark, light } from './color.js';
import { blur, hGrad, r2, rimGrad, sphereGrad, svgDoc, vGrad } from './svg.js';

// Biểu tượng 3D bóng bẩy: tim, hộp quà, khóa, camera, đồng hồ bấm giờ, đồng hồ cát, vương miện, nhóm người, sao.

/** Tim hồng bóng. 128x118. */
export function heartSvg() {
  const defs = `${sphereGrad('h', '#ff4f9a', { fx: 0.3, fy: 0.25, hi: 0.5 })}${blur('b3', 3)}`;
  const path = 'M64 112 C14 78 6 40 26 22 C42 8 58 14 64 30 C70 14 86 8 102 22 C122 40 114 78 64 112Z';
  const body = `<path d="${path}" fill="${dark('#ff4f9a', 0.5)}" transform="translate(0 4)"/>
    <path d="${path}" fill="url(#h)"/>
    <ellipse cx="38" cy="36" rx="16" ry="9" transform="rotate(-38 38 36)" fill="#fff" opacity="0.7" filter="url(#b3)"/>
    <circle cx="30" cy="28" r="4.5" fill="#fff"/>`;
  return svgDoc(128, 118, body, defs);
}

/** Hộp quà cam, ruy băng và nơ vàng. 128x128. */
export function giftSvg() {
  const defs = `${vGrad('box', '#ffa53a', '#e85d10')}${vGrad('lid', '#ffc15f', '#f07a1c')}${hGrad('rib', light('#ffd43a', 0.5), dark('#ffd43a', 0.25), '#ffd43a')}${sphereGrad('bow', '#ffd43a')}`;
  const body = `
    <rect x="16" y="54" width="96" height="66" rx="12" fill="url(#box)"/>
    <rect x="10" y="38" width="108" height="30" rx="10" fill="url(#lid)"/>
    <rect x="54" y="38" width="20" height="82" fill="url(#rib)"/>
    <path d="M64 38 C40 4 8 18 28 34 C40 42 56 40 64 38Z" fill="url(#bow)"/>
    <path d="M64 38 C88 4 120 18 100 34 C88 42 72 40 64 38Z" fill="url(#bow)"/>
    <ellipse cx="62" cy="40" rx="11" ry="9" fill="#ffb81f"/>
    <rect x="20" y="60" width="6" height="52" rx="3" fill="#fff" opacity="0.35"/>
    <ellipse cx="34" cy="46" rx="12" ry="4" fill="#fff" opacity="0.5"/>`;
  return svgDoc(128, 128, body, defs);
}

/** Ổ khóa vàng. 110x128. */
export function lockSvg() {
  const defs = `${vGrad('lb', '#ffd84a', '#f0900f')}${hGrad('sh', '#ffffff', '#8c93b0', '#cfd5ea')}`;
  const body = `
    <path d="M30 60 V40 A25 25 0 0 1 80 40 V60" stroke="url(#sh)" stroke-width="13" fill="none" stroke-linecap="round"/>
    <rect x="12" y="56" width="86" height="64" rx="16" fill="url(#lb)"/>
    <rect x="12" y="56" width="86" height="14" rx="7" fill="#fff" opacity="0.3"/>
    <circle cx="55" cy="84" r="9" fill="#7a4a0b"/><rect x="51" y="86" width="8" height="18" rx="4" fill="#7a4a0b"/>
    <rect x="20" y="64" width="5" height="44" rx="2.5" fill="#fff" opacity="0.4"/>`;
  return svgDoc(110, 128, body, defs);
}

/** Camera: thân trắng bạc, ống kính xanh. 128x110. */
export function cameraSvg() {
  const defs = `${vGrad('cb', '#ffffff', '#b8c4ee')}${sphereGrad('lens', '#2f7bff', { hi: 0.55 })}`;
  const body = `
    <rect x="34" y="6" width="44" height="22" rx="8" fill="url(#cb)"/>
    <rect x="8" y="20" width="112" height="82" rx="20" fill="url(#cb)"/>
    <circle cx="64" cy="62" r="32" fill="#25336e"/>
    <circle cx="64" cy="62" r="25" fill="url(#lens)"/>
    <ellipse cx="55" cy="52" rx="9" ry="5" transform="rotate(-35 55 52)" fill="#fff" opacity="0.8"/>
    <circle cx="102" cy="36" r="5" fill="#ff4d5e"/>`;
  return svgDoc(128, 110, body, defs);
}

/** Đồng hồ bấm giờ bạc, mặt trắng, kim xanh. 128x136. */
export function stopwatchSvg() {
  const defs = `${sphereGrad('ring', '#dfe6ff', { hi: 0.6, lo: 0.45 })}${sphereGrad('face', '#ffffff', { hi: 0.1, lo: 0.2 })}`;
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const r1 = 40;
    const rr = i % 3 === 0 ? 33 : 36;
    return `<line x1="${r2(64 + Math.sin(a) * r1)}" y1="${r2(78 - Math.cos(a) * r1)}" x2="${r2(64 + Math.sin(a) * rr)}" y2="${r2(78 - Math.cos(a) * rr)}" stroke="#4a5fb8" stroke-width="3" stroke-linecap="round"/>`;
  }).join('');
  const body = `
    <rect x="52" y="4" width="24" height="16" rx="6" fill="url(#ring)"/>
    <rect x="58" y="16" width="12" height="12" fill="#aab3d6"/>
    <circle cx="64" cy="78" r="54" fill="url(#ring)"/>
    <circle cx="64" cy="78" r="45" fill="url(#face)"/>
    ${ticks}
    <line x1="64" y1="78" x2="64" y2="50" stroke="#2f7bff" stroke-width="5" stroke-linecap="round"/>
    <line x1="64" y1="78" x2="82" y2="86" stroke="#ff4d5e" stroke-width="4" stroke-linecap="round"/>
    <circle cx="64" cy="78" r="6" fill="#2f7bff"/>
    <path d="M30 50 A44 44 0 0 1 56 36" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  return svgDoc(128, 136, body, defs);
}

/** Đồng hồ cát: khung vàng, cát vàng. 96x128. */
export function hourglassSvg() {
  const defs = `${vGrad('cap', '#ffe27a', '#d98a14')}${vGrad('sand', '#ffe68a', '#f0a720')}`;
  const body = `
    <path d="M22 18 H74 C74 56 58 58 52 64 C58 70 74 74 74 110 H22 C22 74 38 70 44 64 C38 58 22 56 22 18Z" fill="#dff3ff" opacity="0.8" stroke="#9ec6f0" stroke-width="3"/>
    <path d="M30 22 H66 C64 40 54 46 48 50 C42 46 32 40 30 22Z" fill="url(#sand)"/>
    <path d="M30 108 H66 C64 92 56 84 48 78 C40 84 32 92 30 108Z" fill="url(#sand)"/>
    <rect x="10" y="4" width="76" height="16" rx="8" fill="url(#cap)"/>
    <rect x="10" y="108" width="76" height="16" rx="8" fill="url(#cap)"/>
    <path d="M30 26 C28 44 34 52 40 58" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8"/>`;
  return svgDoc(96, 128, body, defs);
}

/** Vương miện vàng, ngọc đỏ, ngọc trai trắng. 150x110. */
export function crownSvg() {
  const defs = `${vGrad('gold', '#fff0a0', '#e88c0e', '#ffc21a')}${sphereGrad('gem', '#e8243c', { hi: 0.6 })}${sphereGrad('pearl', '#ffffff', { hi: 0.0, lo: 0.25 })}`;
  const path = 'M14 100 L8 38 L46 66 L75 10 L104 66 L142 38 L136 100Z';
  const body = `
    <path d="${path}" fill="${dark('#e88c0e', 0.4)}" transform="translate(0 4)" stroke="${dark('#e88c0e', 0.4)}" stroke-width="10" stroke-linejoin="round"/>
    <path d="${path}" fill="url(#gold)" stroke="#ffd45a" stroke-width="8" stroke-linejoin="round"/>
    <rect x="14" y="84" width="122" height="18" rx="9" fill="#d97a0b" opacity="0.7"/>
    <path d="M26 60 L36 52 L40 84" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.6"/>
    <circle cx="75" cy="68" r="12" fill="url(#gem)"/>
    <circle cx="71" cy="63" r="4" fill="#fff" opacity="0.9"/>
    <circle cx="8" cy="36" r="9" fill="url(#pearl)"/><circle cx="75" cy="10" r="10" fill="url(#pearl)"/><circle cx="142" cy="36" r="9" fill="url(#pearl)"/>`;
  return svgDoc(150, 110, body, defs);
}

/** Nhóm ba người màu trắng xanh nhạt. 140x100. */
export function peopleSvg() {
  const defs = `${vGrad('pg', '#ffffff', '#a8c8ff')}`;
  const person = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-30" r="17" fill="url(#pg)"/><path d="M-30 30 Q-30 -6 0 -6 Q30 -6 30 30Z" fill="url(#pg)"/></g>`;
  const body = `${person(30, 48, 0.78)}${person(110, 48, 0.78)}${person(70, 50, 1)}`;
  return svgDoc(140, 100, body, defs);
}

/** Sao 3D vàng. 64x64. */
export function starSvg() {
  const defs = `${sphereGrad('s', '#ffd23a', { hi: 0.6 })}`;
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 14 : 30;
    return `${r2(32 + Math.cos(a) * r)},${r2(33 + Math.sin(a) * r)}`;
  }).join(' ');
  const body = `<polygon points="${pts}" fill="${dark('#ff9a1a', 0.2)}" stroke="${dark('#ff9a1a', 0.2)}" stroke-width="6" stroke-linejoin="round" transform="translate(0 2)"/>
    <polygon points="${pts}" fill="url(#s)" stroke="#ffe27a" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="25" cy="22" rx="6" ry="3" transform="rotate(-40 25 22)" fill="#fff" opacity="0.8"/>`;
  return svgDoc(64, 64, body, defs);
}

export function iconList() {
  return {
    heart: heartSvg(),
    gift: giftSvg(),
    lock: lockSvg(),
    camera: cameraSvg(),
    stopwatch: stopwatchSvg(),
    hourglass: hourglassSvg(),
    crown: crownSvg(),
    people: peopleSvg(),
    star: starSvg(),
  };
}

export { rimGrad };
