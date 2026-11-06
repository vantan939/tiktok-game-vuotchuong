import { CONFIG } from '../config.js';

/** Phần trăm quãng đường đã chạy, 0 đến 100. */
export function progressPercent(r, cfg = CONFIG) {
  return Math.max(0, Math.min(100, (r.dist / cfg.trackLength) * 100));
}

/**
 * Xếp hạng: người về đích xếp trước (theo thời điểm về), còn lại theo quãng đường giảm dần.
 * Ghi r.rank (1 là nhất) và trả về mảng đã xếp (dùng lại `out` để khỏi tạo mảng mới mỗi frame).
 */
export function rankRacers(racers, out = []) {
  out.length = 0;
  for (const r of racers) out.push(r);
  out.sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished) return a.finishTime - b.finishTime;
    return b.dist - a.dist;
  });
  out.forEach((r, i) => {
    r.rank = i + 1;
  });
  return out;
}
