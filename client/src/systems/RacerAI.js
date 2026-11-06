import { CONFIG } from '../config.js';

const noObstacles = () => false;

/**
 * Một bước chạy của nhân vật: tiến về trước và thỉnh thoảng tự đổi làn nhẹ.
 * ctx: { now, rng, cfg, isBlocked(lane, fromDist, toDist) }
 * isBlocked cho biết làn có chướng ngại trong đoạn đường đó không (Task 6 sẽ cấp hàm thật).
 */
export function stepRacer(r, dt, ctx) {
  if (r.finished) return;
  const cfg = ctx.cfg ?? CONFIG;
  const rng = ctx.rng ?? Math.random;
  const isBlocked = ctx.isBlocked ?? noObstacles;

  r.dist = Math.min(cfg.trackLength, r.dist + r.stats.speed * dt);
  const ahead = r.stats.speed * cfg.lookAheadSeconds;

  if (r.pending) {
    // Đã quyết định đổi làn, chờ hết độ trễ phản ứng rồi mới làm (đoàn không đổi làn cùng nhịp)
    r.pending.delay -= dt;
    if (r.pending.delay <= 0) {
      // Kiểm tra lại: lúc thực hiện làn đó phải còn trống
      if (!isBlocked(r.pending.lane, r.dist, r.dist + ahead)) r.targetLane = r.pending.lane;
      r.pending = null;
    }
  } else {
    r.wanderTimer -= dt;
    if (r.wanderTimer <= 0) {
      r.wanderTimer = cfg.wanderInterval[0] + rng() * (cfg.wanderInterval[1] - cfg.wanderInterval[0]);
      considerWander(r, ahead, rng, cfg, isBlocked);
    }
  }

  r.lane += (r.targetLane - r.lane) * (1 - Math.exp(-cfg.laneChangeSmooth * dt));
  if (r.dist >= cfg.trackLength) {
    r.finished = true;
    r.finishTime = ctx.now;
  }
}

// Chỉ đổi làn khi làn hiện tại thoáng phía trước; chỉ sang làn kề cũng thoáng
function considerWander(r, ahead, rng, cfg, isBlocked) {
  if (isBlocked(r.targetLane, r.dist, r.dist + ahead)) return;
  const options = [];
  for (const lane of [r.targetLane - 1, r.targetLane + 1]) {
    if (lane < 0 || lane >= cfg.lanes) continue;
    if (!isBlocked(lane, r.dist, r.dist + ahead)) options.push(lane);
  }
  if (!options.length) return;
  r.pending = { lane: options[Math.floor(rng() * options.length)], delay: r.stats.reaction };
}
