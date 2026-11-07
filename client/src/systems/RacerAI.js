import { CONFIG } from '../config.js';
import { applyHit, findHit } from './Collision.js';
import { nominalSpeed, perceive, runPlan, waitControl } from './DodgeAI.js';
import { halfLength } from './Obstacles.js';

const noObstacles = () => false;

/**
 * Một bước của nhân vật: tiến về trước, tự né chướng ngại, va chạm, thỉnh thoảng tự đổi làn nhẹ.
 * ctx: { now, rng, cfg, field?, onHit?(racer, obstacle) }
 * field là ObstacleField (không có thì đường trống).
 */
export function stepRacer(r, dt, ctx) {
  if (r.finished) return;
  // Scene và mô phỏng truyền đủ cfg, rng; chỉ tạo bản mới khi thiếu (tránh rác mỗi frame)
  const c = ctx.cfg && ctx.rng ? ctx : { ...ctx, cfg: ctx.cfg ?? CONFIG, rng: ctx.rng ?? Math.random };
  const { cfg } = c;
  const field = ctx.field ?? null;

  r.shield = Math.max(0, r.shield - dt);
  r.boost = Math.max(0, r.boost - dt);
  r.jump = Math.max(0, r.jump - dt);
  if (r.shield <= 0) r.gift = null;

  if (r.stun > 0) {
    r.stun = Math.max(0, r.stun - dt); // choáng: đứng yên, không né được
    smoothLane(r, dt, cfg);
    return;
  }

  let speedMul = 1;
  if (field) {
    perceive(r, c);
    runPlan(r, dt, c);
    speedMul = waitControl(r, c);
  }
  r.dist = Math.min(cfg.trackLength, r.dist + nominalSpeed(r) * speedMul * dt);
  if (r.dist > r.waitCap) r.dist = r.waitCap;

  const isBlocked = ctx.isBlocked ?? (field ? (lane, from, to) => field.hasObstacle(lane, from, to) : noObstacles);
  wander(r, dt, c, isBlocked);

  if (field) {
    const hit = findHit(r, field, ctx.now, cfg);
    if (hit) {
      applyHit(r, cfg);
      ctx.onHit?.(r, hit);
    }
  }

  // Đã chạy qua hết chướng ngại đang né mà không dính: né hoàn hảo
  if (r.dodging && r.dist > r.dodging.dist + halfLength(r.dodging, cfg) + cfg.runnerRadius + cfg.spikeRollAmp) {
    const o = r.dodging;
    r.dodging = null;
    ctx.onDodge?.(r, o);
  }

  smoothLane(r, dt, cfg);
  if (r.dist >= cfg.trackLength) {
    r.finished = true;
    r.finishTime = ctx.now;
  }
}

function smoothLane(r, dt, cfg) {
  const rate = r.evading ? cfg.dodgeLaneSmooth : cfg.laneChangeSmooth;
  r.lane += (r.targetLane - r.lane) * (1 - Math.exp(-rate * dt));
  if (r.evading && Math.abs(r.targetLane - r.lane) < 0.05) r.evading = false;
}

// Tự đổi làn nhẹ cho sinh động, chỉ khi không đang né và đường thoáng
function wander(r, dt, ctx, isBlocked) {
  const { cfg, rng } = ctx;
  const ahead = nominalSpeed(r) * cfg.lookAheadSeconds;
  if (r.pending) {
    // Đã quyết định đổi làn, chờ hết độ trễ phản ứng rồi mới làm (đoàn không đổi làn cùng nhịp)
    r.pending.delay -= dt;
    if (r.pending.delay <= 0) {
      // Kiểm tra lại: lúc thực hiện làn đó phải còn trống
      if (!isBlocked(r.pending.lane, r.dist, r.dist + ahead)) r.targetLane = r.pending.lane;
      r.pending = null;
    }
    return;
  }
  r.wanderTimer -= dt;
  if (r.wanderTimer > 0) return;
  r.wanderTimer = cfg.wanderInterval[0] + rng() * (cfg.wanderInterval[1] - cfg.wanderInterval[0]);
  if (r.plan || r.waitFor || r.jump > 0 || r.evading) return;
  considerWander(r, ahead, rng, cfg, isBlocked);
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
