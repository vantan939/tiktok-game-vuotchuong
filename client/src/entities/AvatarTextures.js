import { hashString } from '../systems/Racer.js';

const SIZE = 128;
const DEFAULT_COLORS = ['#ff8a1f', '#35c759', '#8a4bff', '#ff4fa8', '#1e9bff', '#e0243c'];

// Cầu nối giữa AvatarCache và texture Phaser: avatar được cắt tròn thành texture canvas.
// Luôn có ảnh mặc định để dùng ngay; tải xong mới thay.
export class AvatarTextures {
  constructor(scene, cache) {
    this.scene = scene;
    this.cache = cache;
    DEFAULT_COLORS.forEach((color, i) => this.makeDefault(`avatar_default_${i}`, color));
  }

  makeDefault(key, color) {
    if (this.scene.textures.exists(key)) return;
    const tex = this.scene.textures.createCanvas(key, SIZE, SIZE);
    const ctx = tex.getContext();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE * 0.4, SIZE * 0.2, 0, Math.PI * 2); // đầu
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(SIZE / 2, SIZE * 0.95, SIZE * 0.36, SIZE * 0.3, 0, 0, Math.PI * 2); // vai
    ctx.fill();
    this.circleCrop(tex);
    tex.refresh();
  }

  /** Trả về khóa texture dùng ngay (ảnh mặc định); tải xong gọi onReady(khóaMới). */
  request(userId, url, onReady) {
    const fallback = `avatar_default_${hashString(userId) % DEFAULT_COLORS.length}`;
    if (!url) return fallback;
    const key = `avatar_${hashString(url)}`;
    if (this.scene.textures.exists(key)) return key;
    this.cache.request(url).then((img) => {
      if (!img || !this.scene.sys.isActive()) return;
      if (!this.scene.textures.exists(key)) {
        const tex = this.scene.textures.createCanvas(key, SIZE, SIZE);
        const side = Math.min(img.width, img.height);
        tex.getContext().drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
        this.circleCrop(tex);
        tex.refresh();
      }
      onReady(key);
    });
    return fallback;
  }

  // Cắt tròn và thêm viền trắng
  circleCrop(tex) {
    const ctx = tex.getContext();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}
