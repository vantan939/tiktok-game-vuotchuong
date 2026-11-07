import { CONFIG } from '../config.js';
import { hammerLethalDuring, hitReach, spikeDist } from './Obstacles.js';

// Tự né thông minh. Logic thuần.
// Nhìn trước lookAheadSeconds; gặp chướng ngại trên làn mình thì tung xác suất theo dodgeSkill
// (thành công = kịp nhận ra), rồi chọn hành động: đổi làn > nhảy (cầu gai) > canh nhịp (búa).
// Mọi hành động bắt đầu sau độ trễ `reaction`.

/** Tốc độ danh nghĩa (kể cả tăng tốc), dùng để tính tầm nhìn và dự đoán thời điểm tới nơi. */
export function nominalSpeed(r) {
  return r.stats.speed * (r.boost > 0 ? r.boostMul : 1);
}

/** Xác suất kịp nhận ra chướng ngại. Đang boost bị trừ; luôn chừa tối thiểu minHitChance để dính. */
export function noticeChance(r, cfg = CONFIG) {
  const skill = r.stats.dodgeSkill - (r.boost > 0 ? cfg.boostDodgePenalty : 0);
  return Math.max(0, Math.min(1 - cfg.minHitChance, skill));
}

// Dự đoán: nếu cứ chạy thẳng với tốc độ v thì lúc băng qua vùng búa có đúng lúc búa đập không
function crossingLethal(o, r, v, now, cfg) {
  const reach = hitReach(o, cfg);
  const tEnter = Math.max(0, o.dist - reach - r.dist) / v;
  const tExit = Math.max(0, o.dist + reach - r.dist) / v;
  const margin = 0.05;
  return hammerLethalDuring(o, now + tEnter - margin, now + tExit + margin, cfg);
}

// Làn `lane` có thông thoáng để chạy qua tới hết hàng chướng ngại `row` không (cầu gai chặn hẳn, búa xét theo nhịp đập)
function laneClear(field, lane, r, v, now, row, cfg) {
  for (let i = field.indexAfter(r.dist - 1); i < field.list.length; i++) {
    const o = field.list[i];
    if (o.dist > row.dist + 10) break;
    if (o.lane !== lane) continue;
    if (o.type === 'spike' || crossingLethal(o, r, v, now, cfg)) return false;
  }
  return true;
}

// Chọn hành động khi đã nhận ra chướng ngại o trên làn mình
function decide(r, o, ctx) {
  const { field, now, cfg, rng } = ctx;
  const v = nominalSpeed(r);
  if (o.type === 'hammer' && !crossingLethal(o, r, v, now, cfg)) return null; // tới nơi lúc búa đang nâng, cứ chạy thẳng

  const options = [o.lane - 1, o.lane + 1].filter((l) => l >= 0 && l < cfg.lanes && laneClear(field, l, r, v, now, o, cfg));
  if (options.length) return { kind: 'lane', lane: options[Math.floor(rng() * options.length)], o };
  if (o.type === 'spike') return { kind: 'jump', o };
  return { kind: 'wait', o };
}

/** Nhìn trước, nhận diện chướng ngại mới trên làn mình và lập kế hoạch né (chạy mỗi frame). */
export function perceive(r, ctx) {
  if (r.plan || r.waitFor || r.jump > 0) return;
  const { field, cfg, rng } = ctx;
  const speed = nominalSpeed(r);
  const ahead = speed * cfg.lookAheadSeconds;
  for (let i = field.indexAfter(r.dist - 1); i < field.list.length; i++) {
    const o = field.list[i];
    if (o.dist - r.dist > ahead) break;
    if (o.lane !== r.targetLane || r.rolled.has(o.id)) continue;
    // Còn khiên tới lúc chạy qua hết chướng ngại này thì không cần né, cứ lao thẳng
    if (r.shield > (o.dist - r.dist + hitReach(o, cfg) + cfg.spikeRollAmp) / speed) continue;
    r.rolled.add(o.id);
    r.encounters++;
    if (rng() >= noticeChance(r, cfg)) return; // lơ đễnh, không nhận ra
    const plan = decide(r, o, ctx);
    if (plan) {
      plan.delay = r.stats.reaction;
      r.plan = plan;
    }
    return;
  }
}

/** Thực hiện kế hoạch khi hết độ trễ phản ứng. */
export function runPlan(r, dt, ctx) {
  const p = r.plan;
  if (!p) return;
  const { cfg } = ctx;
  p.delay -= dt;
  if (p.delay > 0) return;
  if (p.kind === 'lane') {
    r.dodging = p.o;
    r.targetLane = p.lane;
    r.pending = null;
    r.evading = true;
    r.plan = null;
  } else if (p.kind === 'jump') {
    // Bật nhảy sao cho đỉnh cú nhảy trùng với chỗ quả cầu sẽ lăn tới lúc đó (cầu đang lăn qua lại, không đứng yên)
    const lead = (nominalSpeed(r) * cfg.jumpSeconds) / 2;
    if (spikeDist(p.o, ctx.now + cfg.jumpSeconds / 2, cfg) - r.dist <= lead) {
      r.dodging = p.o;
      r.jump = cfg.jumpSeconds;
      r.plan = null;
    }
  } else {
    r.dodging = p.o;
    r.waitFor = p.o;
    r.plan = null;
  }
}

/**
 * Canh nhịp búa: trả về hệ số tốc độ (1 = chạy bình thường). Giảm tốc khi áp sát,
 * đứng chờ ngoài vùng búa tới khi chạy qua kịp trong lúc búa đang nâng.
 * Ghi r.waitCap: vị trí tối đa được phép tới khi đang chờ.
 */
export function waitControl(r, ctx) {
  r.waitCap = Infinity;
  const o = r.waitFor;
  if (!o) return 1;
  const { cfg, now } = ctx;
  const reach = hitReach(o, cfg);
  if (r.dist > o.dist + reach) {
    r.waitFor = null;
    return 1;
  }
  if (!crossingLethal(o, r, nominalSpeed(r), now, cfg)) {
    r.waitFor = null;
    return 1;
  }
  r.waitCap = o.dist - reach - 0.5;
  return r.dist < r.waitCap - 6 ? 0.5 : 0.2;
}
