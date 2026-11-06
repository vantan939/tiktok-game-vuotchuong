import { CONFIG } from '../config.js';
import { applyWin } from './Racer.js';

/**
 * Danh sách người chơi qua các lượt (logic thuần).
 * - players: người thật đang có suất trong đoàn đua, ở lại qua các lượt.
 * - queue: hàng đợi theo thứ tự vào, chỉ được đưa lên đường ở lượt mới (prepareRound).
 * - Thiếu người thì thêm bot cho đủ botFillTo, bot được tạo mới mỗi lượt.
 * join: còn suất và hàng đợi đang trống thì vào đoàn đua ngay, ngược lại xếp cuối hàng đợi
 * (hàng đợi trống mới được vào thẳng để không ai chen ngang người đã xếp hàng).
 */
export class Lobby {
  constructor({ cfg = CONFIG, rng = Math.random, botNames = [] } = {}) {
    this.cfg = cfg;
    this.rng = rng;
    this.botNames = botNames;
    this.players = [];
    this.queue = [];
    this.stats = new Map(); // userId -> chỉ số đã lưu của người thật (dodgeSkill tăng khi thắng)
    this.botSeq = 0;
  }

  has(userId) {
    return this.players.some((p) => p.userId === userId) || this.queue.some((p) => p.userId === userId);
  }

  /** Trả về 'racing' (có suất trong đoàn đua), 'queued' (xếp hàng đợi) hoặc 'duplicate' (đã có, không cho join hai lần). */
  join(user) {
    if (!user?.userId || this.has(user.userId)) return 'duplicate';
    const entry = { userId: user.userId, nickname: user.nickname, avatarUrl: user.avatarUrl ?? '', isBot: false };
    if (this.players.length < this.cfg.maxPlayers && !this.queue.length) {
      this.players.push(entry);
      return 'racing';
    }
    this.queue.push(entry);
    return 'queued';
  }

  /** Vị trí của người trong hàng đợi (1 là đầu hàng), 0 nếu không đang xếp hàng. */
  queuePosition(userId) {
    return this.queue.findIndex((p) => p.userId === userId) + 1;
  }

  /** Người thật rời đi (mất kết nối, bị loại khỏi danh sách...). Suất trống sẽ nhường cho hàng đợi. */
  leave(userId) {
    this.players = this.players.filter((p) => p.userId !== userId);
    this.queue = this.queue.filter((p) => p.userId !== userId);
  }

  /** Đoàn đua cho lượt mới: người cũ ở lại, hàng đợi vào cho đủ maxPlayers, thiếu thì thêm bot. */
  prepareRound() {
    const { maxPlayers, botFillTo } = this.cfg;
    while (this.players.length < maxPlayers && this.queue.length) this.players.push(this.queue.shift());

    const roster = [...this.players];
    const taken = new Set(roster.map((p) => p.nickname));
    for (let n = Math.max(0, Math.min(botFillTo, maxPlayers) - roster.length); n > 0; n--) {
      roster.push(this.makeBot(taken));
    }
    return roster;
  }

  makeBot(taken) {
    const free = this.botNames.filter((n) => !taken.has(n));
    const nickname = free.length ? free[Math.floor(this.rng() * free.length)] : `Bot ${this.botSeq + 1}`;
    taken.add(nickname);
    return { userId: `bot_${++this.botSeq}`, nickname, avatarUrl: '', isBot: true };
  }

  /** Chỉ số đã lưu của người thật (undefined nếu chưa có). */
  statsFor(userId) {
    return this.stats.get(userId);
  }

  rememberStats(userId, stats) {
    if (!this.stats.has(userId)) this.stats.set(userId, stats);
  }

  /** Người thật thắng: dodgeSkill +0,02, tối đa 0,9. Bot không được tính. */
  recordWin(userId) {
    const cur = this.stats.get(userId);
    if (cur && this.players.some((p) => p.userId === userId)) this.stats.set(userId, applyWin(cur, this.cfg));
  }
}
