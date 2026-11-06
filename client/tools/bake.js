import { allAssets, artHash } from '/art/index.js';

// Bake: rasterize từng asset SVG ở 2x thành PNG nền trong suốt, xếp vào atlas (nhiều trang tối đa 4096x4096),
// rồi gửi PNG + atlas.json (định dạng multiatlas của Phaser) về server dev để lưu vào public/assets/.
// Chạy: npm run dev rồi mở http://localhost:5173/tools/bake.html

const SCALE = 2;
const PAGE = 4096;
const PAD = 4;
const log = document.getElementById('log');
const say = (t) => {
  log.textContent += `\n${t}`;
};

function loadImage(svg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('không rasterize được SVG'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

async function rasterize(asset) {
  const img = await loadImage(asset.svg);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(asset.w * SCALE);
  canvas.height = Math.round(asset.h * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (asset.text) {
    // Chữ vẽ bằng canvas để dùng được font Google đã tải (SVG trong <img> không thấy font của trang)
    const t = asset.text;
    ctx.font = `800 ${t.size * SCALE}px "Baloo 2", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12 * SCALE;
    ctx.strokeStyle = t.stroke;
    ctx.strokeText(t.value, t.x * SCALE, t.y * SCALE);
    ctx.fillStyle = t.color;
    ctx.fillText(t.value, t.x * SCALE, t.y * SCALE);
  }
  return canvas;
}

// Xếp theo hàng (shelf): sắp cao giảm dần, mỗi trang tối đa PAGE x PAGE
function pack(items) {
  const sorted = [...items].sort((a, b) => b.canvas.height - a.canvas.height);
  const pages = [];
  let page = null;
  const newPage = () => {
    page = { x: PAD, y: PAD, rowH: 0, w: PAGE, items: [] };
    pages.push(page);
  };
  newPage();
  for (const it of sorted) {
    const w = it.canvas.width + PAD;
    const h = it.canvas.height + PAD;
    if (page.x + w > PAGE) {
      page.x = PAD;
      page.y += page.rowH;
      page.rowH = 0;
    }
    if (page.y + h > PAGE) {
      newPage();
    }
    it.px = page.x;
    it.py = page.y;
    page.items.push(it);
    page.x += w;
    page.rowH = Math.max(page.rowH, h);
  }
  return pages;
}

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

async function save(name, body) {
  const res = await fetch(`/__save?name=${name}`, { method: 'POST', body });
  if (!res.ok) throw new Error(`lưu ${name} lỗi: ${await res.text()}`);
}

async function main() {
  await document.fonts.load('800 40px "Baloo 2"', 'ĐÍCH');
  say(`Font Baloo 2: ${document.fonts.check('800 40px "Baloo 2"') ? 'đã tải' : 'KHÔNG tải được (chữ trên cổng sẽ dùng font dự phòng)'}`);

  const assets = allAssets();
  const items = [];
  for (const a of assets) items.push({ asset: a, canvas: await rasterize(a) });
  say(`Đã rasterize ${items.length} asset ở ${SCALE}x`);

  const pages = pack(items);
  const textures = [];
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const height = Math.min(PAGE, Math.ceil(Math.max(...p.items.map((it) => it.py + it.canvas.height)) + PAD));
    const canvas = document.createElement('canvas');
    canvas.width = PAGE;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    for (const it of p.items) ctx.drawImage(it.canvas, it.px, it.py);
    document.getElementById('pages').append(canvas);
    await save(`atlas${i}.png`, await toBlob(canvas));
    textures.push({
      image: `atlas${i}.png`,
      format: 'RGBA8888',
      size: { w: PAGE, h: height },
      scale: 1,
      frames: p.items.map((it) => ({
        filename: it.asset.name,
        rotated: false,
        trimmed: false,
        sourceSize: { w: it.canvas.width, h: it.canvas.height },
        spriteSourceSize: { x: 0, y: 0, w: it.canvas.width, h: it.canvas.height },
        frame: { x: it.px, y: it.py, w: it.canvas.width, h: it.canvas.height },
      })),
    });
    say(`Trang ${i}: ${PAGE}x${height}, ${p.items.length} khung`);
  }
  await save('atlas.json', JSON.stringify({ scale: SCALE, sourceHash: artHash(assets), textures }, null, 1));
  say('Xong: đã ghi public/assets/atlas.json và các trang atlas*.png');
}

main().catch((e) => say(`LỖI: ${e.message}`));
