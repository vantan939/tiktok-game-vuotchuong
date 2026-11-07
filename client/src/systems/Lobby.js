import { CONFIG } from '../config.js';
import { applyWin } from './Racer.js';

/**
 * Danh sách người chơi qua các lượt (logic thuần). Luồng cố định, lặp đi lặp lại:
 *   vào phòng, gõ join -> vào HÀNG ĐỢI -> lượt kế tiếp, nếu nằm trong maxPlayers người đầu hàng thì vào đua (và bị xóa khỏi hàng đợi)
 *   -> đang đua mà gõ join tiếp thì lại vào hàng đợi (xếp cuối) để chơi lượt sau nữa.
 * - queue: hàng đợi theo thứ tự gõ join (FIFO). Gõ join khi đã ở trong hàng đợi thì báo trùng.
 * - players: người thật có mặt trong lượt hiện tại. Hết lượt thì tự rời đi; ai muốn chơi tiếp phải gõ join lại.
 * - Thiếu người thì thêm bot cho đủ botFillTo, bot được tạo mới mỗi lượt.
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
    this.evicted = []; // người chơi lượt trước nhưng lượt này không có mặt (chưa gõ join lại)
  }

  inQueue(userId) {
    return this.queue.some((p) => p.userId === userId);
  }

  /** Người này đang ở đâu: 'queued' (đang xếp hàng), 'racing' (đang có mặt trong lượt này) hoặc null. */
  where(userId) {
    if (this.inQueue(userId)) return 'queued';
    return this.players.some((p) => p.userId === userId) ? 'racing' : null;
  }

  /**
   * Gõ join: luôn vào cuối hàng đợi, kể cả khi đang đua (để chơi lượt sau nữa).
   * Trả về 'queued', hoặc 'duplicate' nếu đã đang ở trong hàng đợi.
   */
  join(user) {
    if (!user?.userId || this.inQueue(user.userId)) return 'duplicate';
    this.queue.push({ userId: user.userId, nickname: user.nickname, avatarUrl: user.avatarUrl ?? '', isBot: false });
    return 'queued';
  }

  /** Vị trí của người trong hàng đợi (1 là đầu hàng), 0 nếu không đang xếp hàng. */
  queuePosition(userId) {
    return this.queue.findIndex((p) => p.userId === userId) + 1;
  }

  /** Người thật rời đi (mất kết nối...). */
  leave(userId) {
    this.players = this.players.filter((p) => p.userId !== userId);
    this.queue = this.queue.filter((p) => p.userId !== userId);
  }

  /**
   * Đưa người từ đầu hàng đợi vào lượt hiện tại cho tới khi đủ maxPlayers (dùng khi lượt chưa xuất phát còn suất trống).
   * Người đang có mặt trong lượt này mà xếp hàng lại thì giữ nguyên trong hàng, để chơi lượt sau. Trả về những người vừa vào.
   */
  promote() {
    const taken = [];
    for (let i = 0; i < this.queue.length && this.players.length < this.cfg.maxPlayers; ) {
      const p = this.queue[i];
      if (this.players.some((x) => x.userId === p.userId)) {
        i++;
        continue;
      }
      this.queue.splice(i, 1);
      this.players.push(p);
      taken.push(p);
    }
    return taken;
  }

  /**
   * Đoàn đua cho lượt mới: lấy từ đầu hàng đợi tối đa maxPlayers người (họ bị xóa khỏi hàng đợi), thiếu thì thêm bot.
   * Người chơi lượt trước mà chưa gõ join lại thì không có mặt (this.evicted).
   */
  prepareRound() {
    const previous = this.players;
    this.players = [];
    this.promote();
    this.evicted = previous.filter((p) => !this.players.some((x) => x.userId === p.userId) && !this.inQueue(p.userId));
    return this.withBots();
  }

  /** Đoàn đua hiện tại để bắt đầu lại lượt (streamer bấm R): giữ người chơi, không đụng hàng đợi, bot tạo lại cho đủ. */
  currentRoster() {
    return this.withBots();
  }

  withBots() {
    const { maxPlayers, botFillTo } = this.cfg;
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
