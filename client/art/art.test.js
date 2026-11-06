import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { allAssets, artHash } from './index.js';
import { dark, light, mix, parseHex } from './color.js';

const ATLAS_JSON = path.resolve(import.meta.dirname, '../public/assets/atlas.json');

test('màu: pha màu, sáng và tối', () => {
  assert.deepEqual(parseHex('#ff8000'), [255, 128, 0]);
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
  assert.notEqual(light('#2f7bff', 0.3), '#2f7bff');
  assert.notEqual(dark('#2f7bff', 0.3), '#2f7bff');
});

test('asset: tên không trùng, SVG hợp lệ, mọi tham chiếu gradient/filter/clip đều có định nghĩa', () => {
  const assets = allAssets();
  const names = assets.map((a) => a.name);
  assert.equal(new Set(names).size, names.length, 'tên khung phải duy nhất');
  for (const a of assets) {
    assert.match(a.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, a.name);
    assert.match(a.svg, /<\/svg>$/, a.name);
    assert.ok(!/NaN|undefined|null/.test(a.svg), `${a.name} có giá trị lỗi`);
    const ids = new Set([...a.svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    for (const ref of a.svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.has(ref[1]), `${a.name}: thiếu định nghĩa #${ref[1]}`);
    assert.ok(a.w > 0 && a.h > 0, a.name);
  }
});

test('asset: có đủ các hình cần dùng', () => {
  const names = new Set(allAssets().map((a) => a.name));
  const need = [
    'char_dino', 'char_cow', 'char_robot', 'char_alien', 'char_cat', 'char_fox', 'char_grape', 'char_berry',
    'hammer_head', 'hammer_handle', 'spike_ball', 'flag', 'gate',
    'icon_heart', 'icon_gift', 'icon_lock', 'icon_camera', 'icon_stopwatch', 'icon_hourglass', 'icon_crown', 'icon_people', 'icon_star',
    'balloon_pink', 'cloud_0', 'mountains', 'shadow', 'dust', 'confetti',
  ];
  for (const n of need) assert.ok(names.has(n), `thiếu ${n}`);
});

test('atlas đã bake khớp nguồn vẽ, đủ khung 2x, không chồng nhau và nằm trong trang', () => {
  assert.ok(fs.existsSync(ATLAS_JSON), 'chưa có atlas.json: mở /tools/bake.html khi chạy npm run dev');
  const atlas = JSON.parse(fs.readFileSync(ATLAS_JSON, 'utf8'));
  assert.equal(atlas.sourceHash, artHash(), 'nguồn vẽ đã đổi nhưng atlas chưa bake lại: mở /tools/bake.html khi chạy npm run dev');
  const scale = atlas.scale;
  assert.equal(scale, 2);

  const frames = new Map();
  for (const page of atlas.textures) {
    // kích thước thật của PNG phải đúng như khai báo (IHDR: rộng ở byte 16, cao ở byte 20)
    const png = fs.readFileSync(path.join(path.dirname(ATLAS_JSON), page.image));
    assert.equal(png.readUInt32BE(16), page.size.w, `${page.image} rộng`);
    assert.equal(png.readUInt32BE(20), page.size.h, `${page.image} cao`);
    const boxes = [];
    for (const f of page.frames) {
      frames.set(f.filename, f);
      const { x, y, w, h } = f.frame;
      assert.ok(x >= 0 && y >= 0 && x + w <= page.size.w && y + h <= page.size.h, `${f.filename} nằm ngoài trang`);
      for (const b of boxes) assert.ok(x + w <= b.x || b.x + b.w <= x || y + h <= b.y || b.y + b.h <= y, `${f.filename} chồng ${b.name}`);
      boxes.push({ x, y, w, h, name: f.filename });
    }
  }
  for (const a of allAssets()) {
    const f = frames.get(a.name);
    assert.ok(f, `atlas thiếu ${a.name}`);
    assert.equal(f.frame.w, Math.round(a.w * scale), `${a.name} rộng`);
    assert.equal(f.frame.h, Math.round(a.h * scale), `${a.name} cao`);
  }
});
