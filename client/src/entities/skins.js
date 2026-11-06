import { CHAR_H, CHAR_W, SKINS as ART_SKINS } from '../../art/characters.js';

// Skin nhân vật: dữ liệu màu và kiểu nằm ở art/characters.js (nguồn vẽ SVG). Hình thật là khung `char_<id>` trong atlas
// (bake bằng tools/bake.html). Thay bằng asset khác chỉ cần giữ đúng tên khung và kích thước 300x380, gốc ở giữa đáy.
// Logic game chỉ biết skinIndex nên không phải sửa.

export const TEX_W = CHAR_W;
export const TEX_H = CHAR_H;

export const SKINS = ART_SKINS.map((s) => ({ ...s, frame: `char_${s.id}` }));
