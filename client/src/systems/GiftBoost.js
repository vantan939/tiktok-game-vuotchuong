import { CONFIG } from '../config.js';
import { applyBoost, applyShield } from './Racer.js';

/** Bậc quà theo số kim cương: bậc cao nhất có minDiamonds <= diamonds (quà không rõ giá trị tính là bậc nhỏ). */
export function tierFor(diamonds, cfg = CONFIG) {
  const value = Number.isFinite(diamonds) ? diamonds : 0;
  let tier = cfg.giftTiers[0];
  for (const t of cfg.giftTiers) if (value >= t.minDiamonds) tier = t;
  return tier;
}

/** Khiên (miễn nhiễm chướng ngại) và boost mạnh theo bậc quà. Giữ mức mạnh hơn và thời gian dài hơn nếu đang có. */
export function giveGift(racer, tier) {
  applyShield(racer, tier.shieldSeconds);
  applyBoost(racer, tier.boostMultiplier, tier.boostSeconds);
  if (!racer.gift || tier.fxScale >= racer.gift.fxScale) racer.gift = tier;
}

/**
 * Nhận sự kiện gift từ EventBus: khiên và tăng tốc cho nhân vật của chính người tặng.
 * Người chưa có nhân vật (hàng đợi, chưa join, vào lượt sau) thì quà không có tác dụng lên ai khác.
 * Nhận cả lúc chờ và đếm ngược (khiên và boost chỉ chạy khi đua nên không mất), bỏ qua ở màn kết quả.
 */
export class GiftBoost {
  constructor(manager, cfg = CONFIG) {
    this.manager = manager;
    this.cfg = cfg;
  }

  /** Trả về { racer, tier } nếu có tác dụng, ngược lại null. */
  handle(event) {
    const m = this.manager;
    if (m.state === 'result') return null;
    const racer = m.racerOf(event.userId);
    if (!racer) return null;

    const tier = tierFor(event.diamonds, this.cfg);
    giveGift(racer, tier);
    m.emit({
      type: 'boost',
      source: 'gift',
      racer,
      tier,
      gift: { name: event.giftName, diamonds: event.diamonds },
      sender: event.userId,
      senderName: event.nickname,
    });
    return { racer, tier };
  }
}
