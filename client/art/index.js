import { CHAR_H, CHAR_W, SKINS, characterSvg } from './characters.js';
import { flagSvg, gateSvg, hammerHandleSvg, hammerHeadSvg, spikeBallSvg } from './props.js';
import { iconList } from './icons.js';
import { balloonSvg, cloudSvg, confettiSvg, dustSvg, mountainsSvg, shadowSvg } from './scenery.js';

// Danh sách mọi asset hình ảnh. Mỗi mục: tên khung trong atlas, kích thước logic (w, h), và hàm sinh SVG.
// Công cụ bake rasterize ở 2x thành PNG nền trong suốt rồi xếp vào atlas.

const dims = (svg) => {
  const m = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
  return { w: Number(m[1]), h: Number(m[2]) };
};

function entry(name, svg, extra = {}) {
  return { name, svg, ...dims(svg), ...extra };
}

export function allAssets() {
  const list = [];
  for (const skin of SKINS) list.push(entry(`char_${skin.id}`, characterSvg(skin)));
  list.push(entry('hammer_head', hammerHeadSvg()));
  list.push(entry('hammer_handle', hammerHandleSvg()));
  list.push(entry('spike_ball', spikeBallSvg()));
  list.push(entry('flag', flagSvg()));
  list.push(entry('gate', gateSvg(), { text: { value: 'ĐÍCH', x: 500, y: 82, size: 98, color: '#ffffff', stroke: '#7a1200' } }));
  for (const [name, svg] of Object.entries(iconList())) list.push(entry(`icon_${name}`, svg));
  list.push(entry('balloon_pink', balloonSvg(['#ff5fa8', '#ffe3f0'])));
  list.push(entry('balloon_blue', balloonSvg(['#5aa9ff', '#fff3a8'])));
  list.push(entry('balloon_purple', balloonSvg(['#a46bff', '#ffd0f0'])));
  list.push(entry('cloud_0', cloudSvg(0)));
  list.push(entry('cloud_1', cloudSvg(1)));
  list.push(entry('cloud_2', cloudSvg(2)));
  list.push(entry('mountains', mountainsSvg()));
  list.push(entry('shadow', shadowSvg()));
  list.push(entry('dust', dustSvg()));
  list.push(entry('confetti', confettiSvg()));
  return list;
}

export { CHAR_H, CHAR_W, SKINS };

/** Băm nội dung nguồn vẽ (SVG và chữ) để biết atlas đã bake có còn khớp nguồn không. */
export function artHash(assets = allAssets()) {
  let h = 2166136261;
  const text = assets.map((a) => `${a.name}|${a.w}x${a.h}|${a.svg}|${JSON.stringify(a.text ?? null)}`).join('\n');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
