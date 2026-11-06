import { iconList } from '../../../art/icons.js';
import { flagSvg } from '../../../art/props.js';

// Biểu tượng SVG cho HUD (cùng nguồn vẽ với atlas). Mỗi lần gọi đổi id nội bộ để nhiều bản trong một trang không đụng nhau.

let counter = 0;
const sources = { ...iconList(), flag: flagSvg() };

export function iconSvg(name) {
  const raw = sources[name];
  if (!raw) throw new Error(`không có biểu tượng ${name}`);
  const n = ++counter;
  return raw
    .replace(/id="([^"]+)"/g, (_, id) => `id="${id}-${n}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${id}-${n})`)
    .replace(/ width="[\d.]+" height="[\d.]+"/, ''); // để CSS quyết định kích thước
}
