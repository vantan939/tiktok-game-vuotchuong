import { CONFIG } from '../config.js';
import { hammerPhaseAt, hitReach, spikeDist } from './Obstacles.js';

/** Độ cao nhảy hiện tại, 0 (chạm đất) đến 1 (đỉnh). Cũng dùng để vẽ. */
export function jumpArc(r, cfg = CONFIG) {
  return r.jump > 0 ? Math.sin(Math.PI * (1 - r.jump / cfg.jumpSeconds)) : 0;
}

/**
 * Trả về chướng ngại đang va vào nhân vật, hoặc null. Choáng, khiên, nhảy qua cầu gai thì miễn nhiễm.
 * prevDist là vị trí bước trước: xét cả đoạn đường vừa chạy qua [prevDist, r.dist] để không bao giờ chui lọt
 * qua vùng nguy hiểm khi một bước đi dài (tốc độ cao hoặc khung hình thấp).
 */
export function findHit(r, field, now, cfg = CONFIG, prevDist = r.dist) {
  if (r.stun > 0 || r.shield > 0) return null;
  const lo = Math.min(prevDist, r.dist);
  const hi = Math.max(prevDist, r.dist);
  const reachMax = cfg.spikeRollAmp + cfg.hammerHalfLength + cfg.runnerRadius;
  for (let i = field.indexAfter(lo - reachMax); i < field.list.length; i++) {
    const o = field.list[i];
    if (o.dist - cfg.spikeRollAmp > hi + reachMax) break;
    if (Math.abs(r.lane - o.lane) >= cfg.hitLaneWidth) continue;
    const reach = hitReach(o, cfg);
    if (o.type === 'hammer') {
      if (hammerPhaseAt(o, now, cfg) !== 'impact') continue;
      if (hi > o.dist - reach && lo < o.dist + reach) return o;
    } else {
      if (jumpArc(r, cfg) >= cfg.jumpClearFraction) continue; // chân đã cao hơn quả cầu thì lướt qua (mới cất cánh hoặc sắp hạ cánh thì vẫn dính)
      const at = spikeDist(o, now, cfg);
      if (hi > at - reach && lo < at + reach) return o;
    }
  }
  return null;
}

/** Dính chướng ngại: choáng, bị đẩy lùi, hủy kế hoạch né đang dở và cho nhận diện lại từ đầu. */
export function applyHit(r, cfg = CONFIG) {
  r.stun = cfg.stunSeconds;
  r.dist -= cfg.knockback;
  r.hits++;
  r.plan = null;
  r.waitFor = null;
  r.dodging = null;
  r.jump = 0;
  r.pending = null;
  r.rolled.clear();
}
