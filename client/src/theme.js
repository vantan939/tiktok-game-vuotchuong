// Bảng thiết kế (design tokens): nguồn duy nhất cho màu, font, bo góc, viền, bóng và vầng sáng.
// Màu trích từ docs/mockup.png. HUD (HTML/CSS) lấy qua applyTheme(), phần Phaser và công cụ bake asset import trực tiếp.

export const THEME = {
  font: {
    family: '"Baloo 2", "Segoe UI", system-ui, sans-serif',
    heavy: 800, // tiêu đề, số lớn
    bold: 700, // chữ thường trong khung
    // Chữ phụ nhỏ nhất trên khung 1080 để đọc được trên điện thoại
    minPx: 28,
  },

  colors: {
    skyTop: '#1d6bff',
    skyMid: '#4aa6ff',
    skyLow: '#a6d8ff',
    purple: '#8a4bff',
    violet: '#5b2fd0',
    pink: '#ff3da6',
    magenta: '#d62d86',
    yellow: '#ffc21a',
    yellowLight: '#fff0a0',
    orange: '#ff8a1f',
    navy: '#0b2268', // nền khung xanh
    navyDeep: '#061656',
    plum: '#2a0f6e', // nền khung tím
    plumDeep: '#1a0852',
    cyan: '#35e0ff',
    green: '#22d14f',
    red: '#ff3b4e',
    white: '#ffffff',
    ink: '#1b1450', // viền chữ tối
  },

  // Bo góc (px trên khung 1080x1920)
  radius: { sm: 18, md: 28, lg: 38, pill: 999 },

  // Độ dày viền
  border: { thin: 3, normal: 5, thick: 7 },

  // Bóng đổ và vầng sáng
  shadow: {
    drop: '0 10px 22px rgba(8, 4, 60, 0.5)', // bóng mềm bên dưới
    inner: 'inset 0 3px 8px rgba(255,255,255,0.20), inset 0 -12px 24px rgba(4,6,50,0.5)', // sáng viền trên, tối đáy
    text: '0 3px 0 rgba(10,6,70,0.85), 0 6px 14px rgba(5,3,50,0.55)',
  },

  // Kiểu khung dùng chung: nền bán trong suốt, viền gradient sáng, vầng sáng ngoài
  frames: {
    blue: {
      top: 'rgba(18, 56, 156, 0.90)',
      bottom: 'rgba(5, 22, 88, 0.94)',
      border: ['#aee6ff', '#3f84ff', '#7a5cff'],
      glow: 'rgba(72, 156, 255, 0.60)',
    },
    purple: {
      top: 'rgba(70, 26, 148, 0.90)',
      bottom: 'rgba(28, 8, 88, 0.94)',
      border: ['#ffb0ee', '#b14dff', '#6a3dff'],
      glow: 'rgba(192, 84, 255, 0.60)',
    },
    gold: {
      top: 'rgba(255, 222, 70, 1)',
      bottom: 'rgba(255, 162, 24, 1)',
      border: ['#fff6b0', '#ffb81f', '#ff7a1a'],
      glow: 'rgba(255, 192, 40, 0.70)',
    },
    // Tấm nền tiêu đề: tím đậm, viền hồng neon, vầng sáng hồng
    title: {
      top: 'rgba(92, 30, 178, 0.96)',
      bottom: 'rgba(38, 10, 110, 0.98)',
      border: ['#ffe0f6', '#ff3da6', '#c24dff'],
      glow: 'rgba(255, 61, 166, 0.78)',
    },
    // Chỉ viền và vầng sáng, nền trong (cửa sổ camera cận phủ lên canvas)
    clear: {
      top: 'rgba(0,0,0,0)',
      bottom: 'rgba(0,0,0,0)',
      border: ['#fff6b0', '#ffc21a', '#ff9a1a'],
      glow: 'rgba(255, 192, 40, 0.65)',
    },
  },
};

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

/** Màu số (0xRRGGBB) cho Phaser từ chuỗi '#rrggbb' của token. */
export const num = (css) => parseInt(css.slice(1), 16);
export { hex };

/**
 * Đưa token vào CSS: biến :root và các lớp .frame--<kiểu>. Gọi một lần khi khởi động.
 * Khung viền gradient dùng hai lớp nền (padding-box cho nền, border-box cho viền) để vẫn bo góc được.
 */
export function applyTheme() {
  const { colors, radius, border, shadow, font, frames } = THEME;
  const vars = Object.entries(colors).map(([k, v]) => `--c-${k}: ${v};`).join('');
  // Viền gradient vẽ bằng ::before có mask (chỉ lộ vành viền), nên phần nền bên trong thật sự bán trong suốt
  const frameRules = Object.entries(frames)
    .map(([name, f]) => {
      const clear = name === 'clear';
      return `
.frame--${name} {
  --ring: linear-gradient(140deg, ${f.border[0]} 0%, ${f.border[1]} 52%, ${f.border[2]} 100%);
  background: linear-gradient(180deg, ${f.top}, ${f.bottom});
  background-clip: padding-box;
  box-shadow: ${clear ? '' : `${shadow.inner}, `}0 0 22px ${f.glow}${clear ? '' : `, ${shadow.drop}`};
}`;
    })
    .join('');
  const style = document.createElement('style');
  style.id = 'theme-tokens';
  style.textContent = `
:root {
  ${vars}
  --font: ${font.family};
  --font-heavy: ${font.heavy};
  --font-bold: ${font.bold};
  --min-text: ${font.minPx}px;
  --r-sm: ${radius.sm}px; --r-md: ${radius.md}px; --r-lg: ${radius.lg}px;
  --b-thin: ${border.thin}px; --b-normal: ${border.normal}px; --b-thick: ${border.thick}px;
  --text-shadow: ${shadow.text};
}
.frame { position: relative; border: var(--b-normal) solid transparent; border-radius: var(--r-md); box-sizing: border-box; }
.frame::before {
  content: ''; position: absolute; inset: calc(-1 * var(--b-normal)); border-radius: inherit; padding: var(--b-normal);
  background: var(--ring); pointer-events: none;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}
${frameRules}`;
  document.head.append(style);
}
