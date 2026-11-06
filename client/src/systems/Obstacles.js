import { CONFIG } from '../config.js';

// Chướng ngại vật: sinh theo mẫu có kiểm soát và các hàm trạng thái của búa, cầu gai.
// Logic thuần, thời gian `now` (giây) truyền vào.

/** Vị trí cầu gai tại thời điểm now: lăn qua lại quanh vị trí gốc. */
export function spikeDist(o, now, cfg = CONFIG) {
  return o.dist + cfg.spikeRollAmp * Math.sin((2 * Math.PI * now) / cfg.spikeRollPeriod + o.phase);
}

// Giây trong chu kỳ của búa (0 đến chu kỳ)
function hammerTime(o, now, cfg) {
  const c = cfg.hammerCycleSeconds;
  return (((now + o.phase) % c) + c) % c;
}

/** 'up' búa đang nâng, 'warn' đang hiện vùng đỏ, 'impact' búa nằm dưới sàn (gây choáng). */
export function hammerPhaseAt(o, now, cfg = CONFIG) {
  const u = hammerTime(o, now, cfg);
  if (u >= cfg.hammerImpactAt && u < cfg.hammerImpactAt + cfg.hammerImpactSeconds) return 'impact';
  if (u >= cfg.hammerImpactAt - o.warn && u < cfg.hammerImpactAt) return 'warn';
  return 'up';
}

/** Độ nâng của búa: 1 là nâng cao nhất, 0 là chạm sàn. Dùng để vẽ. */
export function hammerLift(o, now, cfg = CONFIG) {
  const u = hammerTime(o, now, cfg);
  const { hammerImpactAt: at, hammerImpactSeconds: dur, hammerFallSeconds: fall, hammerCycleSeconds: c } = cfg;
  if (u >= at + dur) return (u - at - dur) / (c - at - dur); // đang nâng lên
  if (u >= at) return 0; // nằm dưới sàn
  if (u >= at - fall) return 1 - (u - (at - fall)) / fall; // giáng xuống
  return 1;
}

/** Trong khoảng thời gian [t0, t1] búa có lúc nào đang ở trạng thái gây choáng không. */
export function hammerLethalDuring(o, t0, t1, cfg = CONFIG) {
  const c = cfg.hammerCycleSeconds;
  const a = t0 + o.phase;
  const b = t1 + o.phase;
  for (let k = Math.floor((a - cfg.hammerImpactAt - cfg.hammerImpactSeconds) / c); ; k++) {
    const start = k * c + cfg.hammerImpactAt;
    if (start > b) return false;
    if (start + cfg.hammerImpactSeconds >= a) return true;
  }
}

/** Nửa chiều dài vùng nguy hiểm của chướng ngại (đơn vị đường đua). */
export function halfLength(o, cfg = CONFIG) {
  return o.type === 'hammer' ? cfg.hammerHalfLength : cfg.spikeHalfLength;
}

function shuffled(n, rng) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sinh toàn bộ chướng ngại cho một lượt. Mỗi hàng cách hàng trước 55 đến 90 đơn vị,
 * đôi khi 2 làn cùng lúc, luôn chừa ít nhất 1 làn trống.
 */
export function generateObstacles(rng = Math.random, cfg = CONFIG) {
  const list = [];
  const end = cfg.trackLength - cfg.obstacleEndMargin;
  let id = 0;
  for (let d = cfg.obstacleFirstDist; d < end; d += cfg.obstacleGapMin + rng() * (cfg.obstacleGapMax - cfg.obstacleGapMin)) {
    const count = cfg.lanes > 2 && rng() < cfg.obstacleDoubleChance ? 2 : 1;
    for (const lane of shuffled(cfg.lanes, rng).slice(0, count)) {
      list.push({
        id: id++,
        type: rng() < cfg.hammerChance ? 'hammer' : 'spike',
        dist: d,
        lane,
        phase: rng() * cfg.hammerCycleSeconds, // lệch pha để các búa không đập cùng nhịp
        warn: cfg.hammerWarnMin + rng() * (cfg.hammerWarnMax - cfg.hammerWarnMin),
      });
    }
  }
  return new ObstacleField(list);
}

/** Danh sách chướng ngại đã xếp theo vị trí, kèm các truy vấn nhanh. */
export class ObstacleField {
  constructor(list) {
    this.list = list;
  }

  /** Chỉ số của chướng ngại đầu tiên có dist >= dist (tìm nhị phân). */
  indexAfter(dist) {
    let lo = 0;
    let hi = this.list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.list[mid].dist < dist) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Làn có chướng ngại nào (bất kể trạng thái) trong đoạn [from, to] không. Dùng để tránh đổi làn bừa. */
  hasObstacle(lane, from, to, margin = 6) {
    for (let i = this.indexAfter(from - margin); i < this.list.length; i++) {
      const o = this.list[i];
      if (o.dist > to + margin) break;
      if (o.lane === lane) return true;
    }
    return false;
  }
}
