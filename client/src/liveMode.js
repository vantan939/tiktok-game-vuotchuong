import { CONFIG } from './config.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Tham số URL cho chế độ quay (TikTok Live Studio): ?live=1 [&scale=0.5] [&fps=30]
 *  live=1   ẩn panel debug và con trỏ chuột, cố định kích thước 1080x1920 (px CSS) ở góc trên trái cửa sổ
 *  scale    thu nhỏ khung hiển thị (0.25 đến 2, mặc định 1) khi màn hình không đủ cao; tỉ lệ 9:16 giữ nguyên
 *  fps      giới hạn tốc độ khung hình (15 đến 60); bỏ trống thì theo CONFIG.targetFps
 * Logic thuần, test được.
 */
export function parseLive(search = '', cfg = CONFIG) {
  const p = new URLSearchParams(search);
  const live = p.get('live') === '1';
  const rawScale = Number(p.get('scale'));
  const rawFps = Number(p.get('fps'));
  return {
    live,
    scale: live && rawScale > 0 ? clamp(rawScale, cfg.live.minScale, cfg.live.maxScale) : 1,
    fps: rawFps > 0 ? clamp(Math.round(rawFps), 15, 60) : cfg.targetFps,
  };
}

/** Kích thước canvas hiển thị (px CSS) của chế độ quay. */
export function liveSize(mode, cfg = CONFIG) {
  return { width: Math.round(cfg.width * mode.scale), height: Math.round(cfg.height * mode.scale) };
}
