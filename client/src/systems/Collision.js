import { CONFIG } from '../config.js';
import { halfLength, hammerPhaseAt, spikeDist } from './Obstacles.js';

/** Trả về chướng ngại đang va vào nhân vật, hoặc null. Choáng, khiên, nhảy qua cầu gai thì miễn nhiễm. */
export function findHit(r, field, now, cfg = CONFIG) {
  if (r.stun > 0 || r.shield > 0) return null;
  const reach = cfg.spikeRollAmp + cfg.hammerHalfLength + cfg.runnerRadius;
  for (let i = field.indexAfter(r.dist - reach); i < field.list.length; i++) {
    const o = field.list[i];
    if (o.dist - cfg.spikeRollAmp > r.dist + reach) break;
    if (Math.abs(r.lane - o.lane) >= cfg.hitLaneWidth) continue;
    if (o.type === 'hammer') {
      if (hammerPhaseAt(o, now, cfg) !== 'impact') continue;
      if (Math.abs(r.dist - o.dist) < halfLength(o, cfg) + cfg.runnerRadius) return o;
    } else {
      if (r.jump > 0) continue; // đang nhảy thì lướt qua cầu gai
      if (Math.abs(r.dist - spikeDist(o, now, cfg)) < halfLength(o, cfg) + cfg.runnerRadius) return o;
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
