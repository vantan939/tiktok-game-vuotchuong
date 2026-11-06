import { CONFIG } from '../config.js';
import { addBoost } from './Racer.js';

/**
 * Cộng boost cho nhân vật khi nhận tim. Mỗi lần chạm thêm likeBoostSeconds giây, nhưng nhân với
 * likeSpamDecay^(độ nóng): độ nóng tăng 1 mỗi lần chạm và giảm một nửa sau likeStreakHalfLife giây,
 * nên thả liên tục thì hiệu quả giảm dần, nghỉ một lúc thì hồi lại. Tổng boost cộng dồn tối đa
 * likeBoostMaxSeconds giây. Trả về số giây boost thực sự được cộng.
 */
export function giveLike(racer, taps, now, cfg = CONFIG) {
  const decay = 0.5 ** ((now - racer.likeStreakAt) / cfg.likeStreakHalfLife);
  let streak = racer.likeStreak * decay;
  const before = racer.boost;
  const count = Math.min(Math.max(1, Math.floor(taps)), cfg.likeMaxTapsPerEvent);
  let want = 0;
  for (let i = 0; i < count; i++) {
    want += cfg.likeBoostSeconds * cfg.likeSpamDecay ** streak;
    streak += 1;
  }
  racer.likeStreak = streak;
  racer.likeStreakAt = now;
  addBoost(racer, cfg.likeBoostMultiplier, want, cfg.likeBoostMaxSeconds);
  return racer.boost - before;
}

/**
 * Nhận sự kiện like từ EventBus: tăng tốc nhân vật của chính người thả. Người chưa có nhân vật trên đường
 * (hàng đợi, chưa join, vào lượt sau) thì cổ vũ ngẫu nhiên một người đang đua, ưu tiên người thật.
 * Chỉ có tác dụng khi đang đua (đếm ngược thì chưa tính, tránh dồn boost trước giờ xuất phát).
 * Mỗi người thả tối đa một lần mỗi likeCooldownSeconds.
 */
export class LikeBoost {
  constructor(manager, cfg = CONFIG) {
    this.manager = manager;
    this.cfg = cfg;
    this.lastAt = new Map(); // userId -> lần thả gần nhất được tính (giây game)
  }

  /** Trả về { racer, seconds, cheered } nếu có tác dụng, ngược lại null. */
  handle(event) {
    const m = this.manager;
    if (m.state !== 'race') return null;
    const last = this.lastAt.get(event.userId);
    if (last !== undefined && m.now - last < this.cfg.likeCooldownSeconds) return null;

    let racer = m.racerOf(event.userId);
    const cheered = !racer;
    if (!racer) racer = pickCheerTarget(m);
    if (!racer) return null;

    this.lastAt.set(event.userId, m.now);
    const seconds = giveLike(racer, event.likeCount ?? 1, m.now, this.cfg);
    m.emit({ type: 'boost', source: 'like', racer, seconds, sender: event.userId, cheered });
    return { racer, seconds, cheered };
  }
}

/** Người được cổ vũ khi người gửi chưa có nhân vật: ngẫu nhiên trong số người thật chưa về đích, không có thì bot. */
export function pickCheerTarget(manager) {
  const running = manager.racers.filter((r) => !r.finished);
  const real = running.filter((r) => !r.isBot);
  const pool = real.length ? real : running;
  return pool.length ? pool[Math.floor(manager.rng() * pool.length)] : null;
}
