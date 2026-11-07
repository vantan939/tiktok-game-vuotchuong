import { CONFIG } from '../config.js';
import { STR } from '../strings.js';
import { shortName } from './JoinMessage.js';

/**
 * Quyết định hiệu ứng nào đáng hiện (logic thuần, test được). Nhận sự kiện game, trả về danh sách "cue":
 *   { kind: 'text', text, tone, racer }  chữ nổi trên đầu nhân vật (tone: good | bad | boost | gift)
 *   { kind: 'sound', name, volume }      tiếng cần phát
 * Giới hạn tần suất để 30 nhân vật không biến màn hình thành bão chữ: bot chỉ nhận chữ khi đang ở top,
 * mỗi nhân vật có thời gian nghỉ, và chữ nổi toàn cục cách nhau một khoảng.
 */
export class FxDirector {
  constructor(cfg = CONFIG) {
    this.fx = cfg.fx;
    this.lastText = -Infinity;
    this.lastByRacer = new WeakMap(); // nhân vật -> thời điểm chữ nổi gần nhất
    this.lastLike = new WeakMap();
  }

  reset() {
    this.lastText = -Infinity;
    this.lastByRacer = new WeakMap();
    this.lastLike = new WeakMap();
  }

  /** Người thật, hoặc bot đang nằm trong top, thì xứng đáng có chữ nổi. */
  worthy(racer) {
    return !racer.isBot || (racer.rank > 0 && racer.rank <= this.fx.floatTextTopRank);
  }

  // Cho phép chữ thường (không phải quà) nếu qua được cả hai lớp giới hạn; nếu được thì ghi nhận luôn
  allowText(racer, now) {
    if (!this.worthy(racer)) return false;
    if (now - this.lastText < this.fx.floatTextGap) return false;
    if (now - (this.lastByRacer.get(racer) ?? -Infinity) < this.fx.floatTextPerRacer) return false;
    this.lastText = now;
    this.lastByRacer.set(racer, now);
    return true;
  }

  /** e: sự kiện của RaceManager ('dodge' | 'hit' | 'boost'); now: đồng hồ game (giây). */
  handle(e, now) {
    const cues = [];
    if (e.type === 'dodge') {
      if (this.allowText(e.racer, now)) {
        cues.push({ kind: 'text', text: STR.fx.dodge, tone: 'good', racer: e.racer });
        cues.push({ kind: 'sound', name: 'dodge', volume: 0.8 });
      }
    } else if (e.type === 'hit') {
      // Dính chướng ngại luôn có tiếng (nhỏ hơn với bot ngoài top); chữ "Choáng!" theo giới hạn chung
      cues.push({ kind: 'sound', name: 'hit', volume: this.worthy(e.racer) ? 1 : 0.5 });
      if (this.allowText(e.racer, now)) cues.push({ kind: 'text', text: STR.fx.stun, tone: 'bad', racer: e.racer });
    } else if (e.type === 'boost') {
      if (e.source === 'gift') {
        // Quà luôn được ghi nhận bằng tên người tặng, không bị giới hạn tần suất
        cues.push({ kind: 'text', text: STR.fx.gift(shortName(e.senderName, 12), e.gift.name), tone: 'gift', racer: e.racer });
        cues.push({ kind: 'sound', name: 'gift', volume: e.tier?.announce ? 1 : 0.8 });
      } else if (e.source === 'like' && e.seconds >= 0.05) {
        cues.push({ kind: 'sound', name: 'boost', volume: 0.6 });
        if (now - (this.lastLike.get(e.racer) ?? -Infinity) >= this.fx.likeTextGap && this.allowText(e.racer, now)) {
          this.lastLike.set(e.racer, now);
          cues.push({ kind: 'text', text: STR.fx.boost, tone: 'boost', racer: e.racer });
        }
      }
    }
    return cues;
  }
}
