import { CONFIG } from '../config.js';
import { STR } from '../strings.js';

// Mức ưu tiên của câu nói: câu quan trọng hơn được chen lên trước, câu phụ bị bỏ khi MC đang bận.
export const PRIORITY = { chatter: 1, event: 2, key: 3 };

/** Tên đọc to: bỏ ký tự lạ (emoji, ký hiệu) và cắt ngắn; trống thì gọi chung là "bạn". */
export function spokenName(name, max = 14) {
  const clean = [...String(name ?? '')].filter((c) => /[\p{L}\p{N} ]/u.test(c)).join('').replace(/\s+/g, ' ').trim();
  return [...clean].slice(0, max).join('') || 'bạn';
}

/**
 * MC dẫn chương trình (logic thuần, test được). Nhận sự kiện game, trả về danh sách câu { text, priority } cần đọc.
 * Giới hạn tần suất từng loại câu để không nói liên tục; chọn câu ngẫu nhiên trong danh sách để đỡ lặp.
 */
export class McDirector {
  constructor(cfg = CONFIG, rng = Math.random) {
    this.cfg = cfg.mc;
    this.trackLength = cfg.trackLength;
    this.rng = rng;
    this.lastAt = new Map(); // loại câu -> lần nói gần nhất (giây game)
    this.round = { nearFinish: false, lastSeconds: false, leader: null, leaderSince: 0, announcedLeader: null, countedDown: false, countdownMid: false };
    this.lastSpoke = -Infinity; // lần gần nhất có câu nào được đưa ra (giây game)
    this.lastFiller = null;
    // Mọi câu đưa ra đều ghi nhận thời điểm, để biết MC đã im bao lâu
    for (const [name, nowIndex] of [['onState', 2], ['onJoin', 1], ['onEvent', 1], ['update', 1]]) {
      const original = this[name].bind(this);
      this[name] = (...args) => {
        const lines = original(...args);
        if (lines.length) this.lastSpoke = args[nowIndex];
        return lines;
      };
    }
  }

  pick(kind, ...args) {
    const list = STR.mc[kind];
    return list[Math.floor(this.rng() * list.length)](...args);
  }

  // Đủ thời gian nghỉ cho loại câu này chưa? Nếu đủ thì ghi nhận luôn
  ready(kind, now, gap) {
    if (now - (this.lastAt.get(kind) ?? -Infinity) < gap) return false;
    this.lastAt.set(kind, now);
    return true;
  }

  /** Lượt mới: xoá các mốc trong lượt. */
  onRound() {
    this.round = { nearFinish: false, lastSeconds: false, leader: null, leaderSince: 0, announcedLeader: null, countedDown: false, countdownMid: false };
  }

  /** Đổi trạng thái lượt. manager.result có tên người thắng khi vào 'result'. */
  onState(state, manager, now) {
    const gaps = this.cfg.gaps;
    if (state === 'wait') {
      return this.ready('welcome', now, gaps.welcome) ? [{ text: this.pick('welcome'), priority: PRIORITY.event }] : [];
    }
    if (state === 'countdown') {
      return [{ text: this.pick('ready'), priority: PRIORITY.event }]; // "Ba, hai, một" nói đúng lúc còn 3 giây (xem update)
    }
    if (state === 'race') return [{ text: this.pick('go'), priority: PRIORITY.key }];
    if (state === 'result' && manager.result) {
      const name = spokenName(manager.result.winner.nickname);
      return [{ text: this.pick(manager.result.finished ? 'win' : 'timeUp', name), priority: PRIORITY.key }];
    }
    return [];
  }

  /** Có người vào đua (join thành công). */
  onJoin(nickname, now) {
    if (!this.ready('join', now, this.cfg.gaps.join)) return [];
    return [{ text: this.pick('join', spokenName(nickname)), priority: PRIORITY.event }];
  }

  /** Sự kiện của RaceManager: dodge, hit, boost (tim hoặc quà). */
  onEvent(e, now) {
    const gaps = this.cfg.gaps;
    const real = e.racer && !e.racer.isBot;
    if (e.type === 'boost' && e.source === 'gift') {
      const n = spokenName(e.senderName);
      const g = spokenName(e.gift?.name, 20);
      return [{ text: this.pick(e.tier?.announce ? 'gift_large' : 'gift', n, g), priority: PRIORITY.event }];
    }
    // Người thật luôn được bình luận; bot chỉ khi đang nằm trong top
    const worthy = real || (e.racer.rank > 0 && e.racer.rank <= this.cfg.topRankCommented);
    if (!worthy) return [];
    const n = spokenName(e.racer.nickname);
    if (e.type === 'dodge' && this.ready('dodge', now, gaps.dodge)) return [{ text: this.pick('dodge', n), priority: PRIORITY.chatter }];
    if (e.type === 'hit' && this.ready('hit', now, gaps.hit)) return [{ text: this.pick('hit', n), priority: PRIORITY.chatter }];
    if (e.type === 'boost' && e.source === 'like' && e.seconds >= 0.05 && this.ready('boost', now, gaps.boost)) {
      return [{ text: this.pick('boost', n), priority: PRIORITY.chatter }];
    }
    return [];
  }

  /** Gọi mỗi frame khi đang đua: người dẫn đầu đổi, sắp về đích, còn 10 giây cuối. */
  update(manager, now) {
    if (manager.state === 'countdown') return this.countdownLines(manager);
    if (manager.state !== 'race') return [];
    if (this.lastSpoke === -Infinity) this.lastSpoke = now; // bắt đầu tính thời gian im lặng từ lúc đua
    const out = [];
    const lead = manager.ranking[0];
    const r = this.round;
    if (lead !== r.leader) {
      r.leader = lead;
      r.leaderSince = now;
    }
    // Người dẫn đầu phải giữ vị trí một lúc mới xướng tên, tránh đổi qua đổi lại liên tục
    if (lead && lead !== r.announcedLeader && now - r.leaderSince >= this.cfg.leaderHoldSeconds && this.ready('leader', now, this.cfg.gaps.leader)) {
      r.announcedLeader = lead;
      out.push({ text: this.pick('leader', spokenName(lead.nickname)), priority: PRIORITY.chatter });
    }
    if (lead && !r.nearFinish && lead.dist >= this.trackLength * this.cfg.nearFinishFraction) {
      r.nearFinish = true;
      out.push({ text: this.pick('nearFinish'), priority: PRIORITY.event });
    }
    if (!r.lastSeconds && manager.cfg.roundSeconds - manager.raceTime <= 10) {
      r.lastSeconds = true;
      out.push({ text: this.pick('lastSeconds'), priority: PRIORITY.event });
    }
    // Im quá lâu thì nói xen một câu: lúc thì bình luận khoảng cách top 2, lúc thì câu chung
    if (!out.length && now - this.lastSpoke >= this.cfg.idleSeconds) out.push(this.filler(manager));
    return out;
  }

  // Đếm ngược dài: nhắc vào đua ở giữa, rồi đọc 'Ba, hai, một' đúng lúc còn 3 giây
  countdownLines(manager) {
    const r = this.round;
    const left = manager.countdownValue;
    if (left <= 3 && !r.countedDown) {
      r.countedDown = true;
      return [{ text: this.pick('countdown'), priority: PRIORITY.event }];
    }
    if (left <= 6 && left > 3 && !r.countdownMid) {
      r.countdownMid = true;
      return [{ text: this.pick('countdownMid'), priority: PRIORITY.chatter }];
    }
    return [];
  }

  filler(manager) {
    const [first, second] = manager.ranking;
    if (first && second && this.rng() < 0.25) {
      return { text: this.pick('gap', spokenName(first.nickname), spokenName(second.nickname)), priority: PRIORITY.chatter };
    }
    // Câu chung trộn với câu theo chặng đua (đầu, giữa, cuối) của người dẫn đầu
    const progress = first ? first.dist / this.trackLength : 0;
    const phase = progress < 0.3 ? STR.mc.fillerEarly : progress < 0.7 ? STR.mc.fillerMid : STR.mc.fillerLate;
    const list = [...STR.mc.filler, ...phase, ...phase];
    let text = list[Math.floor(this.rng() * list.length)]();
    if (text === this.lastFiller) text = list[(list.findIndex((f) => f() === text) + 1) % list.length](); // không lặp một câu hai lần liền
    this.lastFiller = text;
    return { text, priority: PRIORITY.chatter };
  }
}
