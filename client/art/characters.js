import { dark, light, mix } from './color.js';
import { blur, gloss, rimGrad, sphereGrad, svgDoc, vGrad } from './svg.js';

// Nhân vật hoạt hình 3D bóng bẩy nhìn từ sau lưng, khung 300x380 (chân chạm đáy).
// Mỗi skin là dữ liệu màu + kiểu phụ kiện; hình vẽ bằng SVG với gradient cầu, ánh sáng viền và điểm sáng bóng loáng.

export const CHAR_W = 300;
export const CHAR_H = 380;

export const SKINS = [
  { id: 'dino', type: 'dino', body: '#2f7bff', accent: '#ffc21a', foot: '#ff9a2a' },
  { id: 'cow', type: 'cow', body: '#f6f2ff', accent: '#6b4430', foot: '#6b4430' },
  { id: 'robot', type: 'robot', body: '#a9b8dc', accent: '#ff4d5e', foot: '#ffb02e' },
  { id: 'alien', type: 'alien', body: '#46d86c', accent: '#ffe14d', foot: '#a05cff' },
  { id: 'cat', type: 'cat', body: '#ff79b9', accent: '#ffd0ea', foot: '#ffb347' },
  { id: 'fox', type: 'fox', body: '#ff8a1f', accent: '#fff4e0', foot: '#6b3a1c' },
  { id: 'grape', type: 'bobble', body: '#8a4bff', accent: '#ffc21a', foot: '#ffc21a' },
  { id: 'berry', type: 'bobble', body: '#e8334a', accent: '#ffffff', foot: '#ffd166' },
];

const CX = 150;
const CY = 207;
const R = 128;

// Chi tiết riêng từng kiểu. behind: vẽ sau thân (tai, đuôi); front: vẽ đè lên thân (gai lưng, đốm, mũ...).
const DECOR = {
  dino: {
    behind: ({ foot }) =>
      `<path d="M215 300 Q268 318 252 350 Q222 352 205 322Z" fill="url(#bodyG)"/>`,
    front: ({ accent }) => {
      const spike = (x, y, w, h, id) => `
        <g>
          <path d="M${x - w / 2} ${y} Q${x - w * 0.52} ${y - h * 0.55} ${x} ${y - h} Q${x + w * 0.52} ${y - h * 0.55} ${x + w / 2} ${y} Q${x} ${y + h * 0.16} ${x - w / 2} ${y}Z" fill="url(#${id})"/>
          <path d="M${x - w * 0.22} ${y - h * 0.2} Q${x - w * 0.18} ${y - h * 0.62} ${x - w * 0.02} ${y - h * 0.8}" stroke="#fff" stroke-width="${Math.max(3, w * 0.07)}" stroke-linecap="round" fill="none" opacity="0.6"/>
        </g>`;
      return `${spike(150, 124, 40, 52, 'accG')}${spike(150, 178, 52, 62, 'accG')}${spike(150, 240, 64, 72, 'accG')}`;
    },
    belt: true,
  },
  cow: {
    behind: ({ body }) => `
      <g>
        <ellipse cx="34" cy="118" rx="42" ry="28" transform="rotate(-24 34 118)" fill="url(#bodyG)"/>
        <ellipse cx="36" cy="120" rx="25" ry="15" transform="rotate(-24 36 120)" fill="#ffb4cb"/>
        <ellipse cx="266" cy="118" rx="42" ry="28" transform="rotate(24 266 118)" fill="url(#bodyG)"/>
        <ellipse cx="264" cy="120" rx="25" ry="15" transform="rotate(24 264 120)" fill="#ffb4cb"/>
        <path d="M104 92 Q92 52 112 40 Q122 62 128 90Z" fill="url(#hornG)"/>
        <path d="M196 92 Q208 52 188 40 Q178 62 172 90Z" fill="url(#hornG)"/>
      </g>`,
    front: ({ accent }) => `
      <g fill="url(#patchG)">
        <path d="M60 160 Q88 120 126 150 Q132 190 98 206 Q64 204 60 160Z"/>
        <path d="M190 118 Q232 112 248 150 Q244 186 208 188 Q180 164 190 118Z"/>
        <path d="M168 236 Q212 222 236 252 Q226 290 186 292 Q158 268 168 236Z"/>
        <path d="M70 250 Q104 236 126 262 Q116 296 84 292 Q60 276 70 250Z"/>
      </g>`,
    belt: false,
    extraDefs: ({ accent }) =>
      `${sphereGrad('patchG', accent, { hi: 0.35 })}${sphereGrad('hornG', '#f3e1b8', { hi: 0.4 })}`,
  },
  robot: {
    behind: () => `
      <g>
        <rect x="143" y="14" width="14" height="70" rx="7" fill="url(#steelG)"/>
        <circle cx="150" cy="18" r="30" fill="url(#glowG)" opacity="0.85" filter="url(#blur10)"/>
        <circle cx="150" cy="18" r="17" fill="url(#accG)"/>
        <circle cx="144" cy="11" r="5" fill="#fff" opacity="0.9"/>
        <circle cx="20" cy="190" r="24" fill="url(#steelG)"/>
        <circle cx="280" cy="190" r="24" fill="url(#steelG)"/>
      </g>`,
    front: ({ accent }) => `
      <g>
        <rect x="104" y="150" width="92" height="76" rx="20" fill="#56627f" opacity="0.9"/>
        <rect x="110" y="154" width="80" height="66" rx="16" fill="none" stroke="#b9c8ee" stroke-width="3" opacity="0.8"/>
        <circle cx="128" cy="178" r="10" fill="url(#accG)"/><circle cx="172" cy="178" r="10" fill="#ffd34d"/>
        <rect x="124" y="200" width="52" height="8" rx="4" fill="#2c3652"/>
        <path d="M30 238 Q150 262 270 238" stroke="#56627f" stroke-width="7" fill="none"/>
        <circle cx="52" cy="152" r="7" fill="#e7efff"/><circle cx="248" cy="152" r="7" fill="#e7efff"/>
      </g>`,
    belt: false,
    extraDefs: ({ accent }) =>
      `${sphereGrad('steelG', '#8190b8')}<radialGradient id="glowG"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>${blur('blur10', 8)}`,
  },
  alien: {
    behind: ({ accent }) => `
      <g>
        <path d="M118 96 Q96 56 78 30" stroke="url(#alienStem)" stroke-width="10" stroke-linecap="round" fill="none"/>
        <path d="M182 96 Q204 56 222 30" stroke="url(#alienStem)" stroke-width="10" stroke-linecap="round" fill="none"/>
        <circle cx="76" cy="28" r="26" fill="${accent}" opacity="0.5" filter="url(#blur10)"/>
        <circle cx="224" cy="28" r="26" fill="${accent}" opacity="0.5" filter="url(#blur10)"/>
        <circle cx="76" cy="28" r="17" fill="url(#accG)"/><circle cx="224" cy="28" r="17" fill="url(#accG)"/>
        <circle cx="70" cy="21" r="5" fill="#fff" opacity="0.9"/><circle cx="218" cy="21" r="5" fill="#fff" opacity="0.9"/>
      </g>`,
    front: () => `
      <g fill="#2fae52" opacity="0.8">
        <ellipse cx="104" cy="170" rx="12" ry="9"/><ellipse cx="198" cy="150" rx="9" ry="7"/>
        <ellipse cx="178" cy="222" rx="13" ry="9"/><ellipse cx="108" cy="250" rx="9" ry="7"/>
      </g>`,
    belt: true,
    extraDefs: () => `${vGrad('alienStem', '#5fe083', '#2fae52')}${blur('blur10', 8)}`,
  },
  cat: {
    behind: ({ body, accent }) => `
      <g>
        <path d="M62 112 L80 20 L142 80Z" fill="url(#bodyG)" stroke="${body}" stroke-width="14" stroke-linejoin="round"/>
        <path d="M238 112 L220 20 L158 80Z" fill="url(#bodyG)" stroke="${body}" stroke-width="14" stroke-linejoin="round"/>
        <path d="M84 96 L92 44 L124 78Z" fill="${accent}" stroke="${accent}" stroke-width="8" stroke-linejoin="round"/>
        <path d="M216 96 L208 44 L176 78Z" fill="${accent}" stroke="${accent}" stroke-width="8" stroke-linejoin="round"/>
        <path d="M222 300 Q288 290 280 238 Q272 214 252 226" stroke="url(#bodyG)" stroke-width="26" stroke-linecap="round" fill="none"/>
      </g>`,
    front: ({ accent }) => `
      <g fill="${dark('#ff79b9', 0.18)}" opacity="0.8">
        <path d="M140 92 L152 92 L150 122Z"/><path d="M112 100 L122 102 L124 128Z"/><path d="M178 100 L188 102 L176 128Z"/>
      </g>`,
    belt: true,
  },
  fox: {
    behind: ({ body, accent }) => `
      <g>
        <path d="M60 116 L72 22 L140 82Z" fill="url(#bodyG)" stroke="${body}" stroke-width="14" stroke-linejoin="round"/>
        <path d="M240 116 L228 22 L160 82Z" fill="url(#bodyG)" stroke="${body}" stroke-width="14" stroke-linejoin="round"/>
        <path d="M80 100 L84 52 L120 82Z" fill="#6b3a1c" stroke="#6b3a1c" stroke-width="8" stroke-linejoin="round"/>
        <path d="M220 100 L216 52 L180 82Z" fill="#6b3a1c" stroke="#6b3a1c" stroke-width="8" stroke-linejoin="round"/>
        <path d="M210 312 Q300 320 288 232 Q268 196 236 226 Q246 262 210 282Z" fill="url(#bodyG)"/>
        <path d="M288 232 Q268 196 244 214 Q262 232 262 262 Q286 262 288 232Z" fill="${accent}"/>
      </g>`,
    front: ({ accent }) => `
      <path d="M96 150 Q150 190 204 150 Q196 232 150 252 Q104 232 96 150Z" fill="${accent}" opacity="0.92"/>`,
    belt: false,
  },
  bobble: {
    behind: () => '',
    front: ({ accent, body }) => `
      <g>
        <path d="M30 122 Q150 -6 270 122 Q150 92 30 122Z" fill="url(#accG)"/>
        <path d="M34 118 Q150 12 266 118" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.5"/>
        <g stroke="${dark(accent, 0.22)}" stroke-width="5" opacity="0.55">
          <path d="M72 70 L82 118"/><path d="M110 46 L116 110"/><path d="M150 38 L150 106"/><path d="M190 46 L184 110"/><path d="M228 70 L218 118"/>
        </g>
        <path d="M30 122 Q150 92 270 122 Q150 138 30 122Z" fill="${dark(accent, 0.2)}" opacity="0.8"/>
        <circle cx="150" cy="30" r="32" fill="url(#pomG)"/>
        <ellipse cx="138" cy="18" rx="12" ry="7" transform="rotate(-30 138 18)" fill="#fff" opacity="0.7"/>
      </g>`,
    belt: true,
    extraDefs: ({ body }) => `${sphereGrad('pomG', mix('#ffffff', body, 0.15), { hi: 0.2, lo: 0.35 })}`,
  },
};

/** Tài liệu SVG cho một skin (300x380). */
export function characterSvg(skin) {
  const { body, accent, foot, type } = skin;
  const d = DECOR[type];
  const defs = `
    ${sphereGrad('bodyG', body)}
    ${sphereGrad('accG', accent, { hi: 0.55 })}
    ${sphereGrad('footG', foot, { hi: 0.5 })}
    ${rimGrad('rimG', '#bfe8ff', 0.4)}
    ${vGrad('aoG', dark(body, 0.5) + '00', dark(body, 0.55))}
    ${blur('blur5', 5)}
    <linearGradient id="aoV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.45" stop-color="#14084a" stop-opacity="0"/><stop offset="1" stop-color="#14084a" stop-opacity="0.42"/>
    </linearGradient>
    <linearGradient id="beltG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${light(accent, 0.35)}"/><stop offset="0.5" stop-color="${accent}"/><stop offset="1" stop-color="${dark(accent, 0.35)}"/>
    </linearGradient>
    <clipPath id="bc"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
    ${d.extraDefs ? d.extraDefs(skin) : ''}`;

  const arm = (x, flip) => `
    <g transform="translate(${x} 244) scale(${flip}, 1) rotate(${flip < 0 ? -18 : 18})">
      <ellipse cx="0" cy="0" rx="27" ry="46" fill="url(#bodyG)"/>
      <ellipse cx="2" cy="38" rx="20" ry="17" fill="url(#footG)"/>
      <ellipse cx="-8" cy="-14" rx="8" ry="20" fill="#fff" opacity="0.3" filter="url(#blur5)"/>
    </g>`;

  const foot_ = (x) => `
    <g>
      <ellipse cx="${x}" cy="346" rx="48" ry="30" fill="url(#footG)"/>
      <ellipse cx="${x - 12}" cy="336" rx="20" ry="9" fill="#fff" opacity="0.38" filter="url(#blur5)"/>
    </g>`;

  const belt = d.belt
    ? `<g clip-path="url(#bc)"><path d="M10 232 Q150 270 290 232 L290 276 Q150 316 10 276Z" fill="url(#beltG)"/>
        <path d="M10 234 Q150 272 290 234" stroke="#fff" stroke-width="4" fill="none" opacity="0.55"/></g>`
    : '';

  const body_ = `
    ${d.behind ? d.behind(skin) : ''}
    ${foot_(104)}${foot_(196)}
    ${arm(22, 1)}${arm(278, -1)}
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#bodyG)"/>
    ${belt}
    <g clip-path="url(#bc)">
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#aoV)"/>
      ${d.front ? d.front(skin) : ''}
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#rimG)"/>
    </g>
    ${gloss(104, 132, 54, 28, -34, 'blur5')}`;

  return svgDoc(CHAR_W, CHAR_H, body_, defs);
}
