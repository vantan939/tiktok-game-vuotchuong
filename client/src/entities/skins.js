// Skin nhân vật. Hiện vẽ bằng Graphics thành texture tạm; ở Task 11A thay hàm makeSkinTexture
// bằng việc nạp ảnh asset (cùng khóa `skin.key`, cùng kích thước TEX_W x TEX_H, gốc ở giữa đáy).
// Logic game chỉ biết skinIndex nên không phải sửa.

export const TEX_W = 300;
export const TEX_H = 380;

export const SKINS = [
  { id: 'dino', type: 'dino', body: 0x2f7bff, light: 0x5c9bff, accent: 0xffc21a },
  { id: 'cow', type: 'cow', body: 0xffffff, light: 0xeceaf5, accent: 0x6b4430 },
  { id: 'robot', type: 'robot', body: 0x9aa7c4, light: 0xc9d3ea, accent: 0xff5a5a },
  { id: 'cat', type: 'ears', body: 0xff7ab8, light: 0xffb0d6, accent: 0xd63384 },
  { id: 'fox', type: 'ears', body: 0xff8a1f, light: 0xffb866, accent: 0xfff3e0 },
  { id: 'frog', type: 'frog', body: 0x35c759, light: 0x7be08f, accent: 0xffe14d },
  { id: 'grape', type: 'bobble', body: 0x8a4bff, light: 0xb18aff, accent: 0xffc21a },
  { id: 'berry', type: 'bobble', body: 0xe0243c, light: 0xff6b7d, accent: 0xffffff },
].map((s) => ({ ...s, key: `skin_${s.id}` }));

const CX = TEX_W / 2;
const BODY_Y = 210;
const BODY_R = 140;

/** Vẽ texture cho một skin (nhìn từ sau lưng). Chỉ vẽ một lần cho mỗi skin. */
export function makeSkinTexture(scene, skin) {
  if (scene.textures.exists(skin.key)) return;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(CX, TEX_H - 14, 230, 36); // bóng dưới chân

  const decorBehind = DECOR[skin.type]?.behind;
  decorBehind?.(g, skin);

  g.fillStyle(skin.accent, 1);
  g.fillEllipse(100, TEX_H - 40, 70, 46); // chân
  g.fillEllipse(200, TEX_H - 40, 70, 46);
  g.fillStyle(skin.body, 1);
  g.fillCircle(CX, BODY_Y, BODY_R); // thân
  g.fillStyle(skin.light, 1);
  g.fillCircle(CX - 40, 160, 60); // mảng sáng

  DECOR[skin.type]?.front?.(g, skin);
  g.generateTexture(skin.key, TEX_W, TEX_H);
  g.destroy();
}

const DECOR = {
  dino: {
    front(g, s) {
      g.fillStyle(s.accent, 1);
      for (const dy of [-15, 35, 85]) g.fillTriangle(CX - 24, 80 + dy, CX + 24, 80 + dy, CX, 30 + dy);
      g.fillRect(CX - 140, 250, 280, 26);
    },
  },
  cow: {
    behind(g, s) {
      g.fillStyle(s.body, 1);
      g.fillEllipse(34, 120, 70, 50); // tai
      g.fillEllipse(266, 120, 70, 50);
      g.fillStyle(0xffb3c7, 1);
      g.fillEllipse(34, 120, 36, 26);
      g.fillEllipse(266, 120, 36, 26);
    },
    front(g, s) {
      g.fillStyle(s.accent, 1);
      g.fillEllipse(110, 190, 78, 64);
      g.fillEllipse(205, 150, 70, 56);
      g.fillEllipse(190, 250, 96, 70);
      g.fillStyle(0xf3e3c4, 1);
      g.fillTriangle(CX - 62, 92, CX - 36, 92, CX - 52, 52); // sừng
      g.fillTriangle(CX + 36, 92, CX + 62, 92, CX + 52, 52);
    },
  },
  robot: {
    front(g, s) {
      g.lineStyle(8, 0x56627f, 1);
      g.lineBetween(CX, 72, CX, 28);
      g.fillStyle(s.accent, 1);
      g.fillCircle(CX, 24, 16);
      g.fillStyle(0x56627f, 1);
      g.fillRect(CX - 140, 245, 280, 14); // khe nối
      for (const x of [CX - 90, CX + 90]) g.fillCircle(x, 150, 10); // ốc vít
      g.fillStyle(s.accent, 1);
      g.fillRect(CX - 40, 170, 80, 40); // tấm lưng
    },
  },
  ears: {
    behind(g, s) {
      g.fillStyle(s.body, 1);
      g.fillTriangle(60, 120, 140, 70, 70, 20); // tai
      g.fillTriangle(240, 120, 160, 70, 230, 20);
      g.fillStyle(s.accent, 1);
      g.fillTriangle(82, 100, 124, 74, 84, 46);
      g.fillTriangle(218, 100, 176, 74, 216, 46);
    },
    front(g, s) {
      g.fillStyle(s.accent, 1);
      g.fillRect(CX - 140, 250, 280, 22);
    },
  },
  frog: {
    behind(g, s) {
      g.fillStyle(s.body, 1);
      g.fillCircle(100, 62, 38); // mắt lồi
      g.fillCircle(200, 62, 38);
      g.fillStyle(s.accent, 1);
      g.fillCircle(100, 58, 18);
      g.fillCircle(200, 58, 18);
    },
    front(g, s) {
      g.fillStyle(s.accent, 1);
      g.fillCircle(CX - 70, 220, 14);
      g.fillCircle(CX + 20, 180, 14);
      g.fillCircle(CX + 60, 240, 14);
    },
  },
  bobble: {
    front(g, s) {
      g.fillStyle(s.accent, 1);
      g.fillCircle(CX, 58, 26); // cục bông trên đầu
      g.fillRect(CX - 140, 250, 280, 22);
    },
  },
};
