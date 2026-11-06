import { CONFIG } from '../config.js';
import { createRacer } from './Racer.js';
import { stepRacer } from './RacerAI.js';
import { progressPercent, rankRacers } from './Ranking.js';
import { generateObstacles } from './Obstacles.js';

export const STATES = ['wait', 'countdown', 'race', 'result'];

/**
 * Vòng lặp lượt đua (logic thuần): chờ → đếm ngược 3-2-1 → đua → kết quả → lượt mới.
 * Lượt đua kết thúc khi có người về đích hoặc hết roundSeconds (khi đó xếp theo % quãng đường).
 * onEvent({ type: 'state'|'round'|'hit'|'end', ... }) báo cho phần hiển thị.
 */
export class RaceManager {
  constructor(lobby, { cfg = CONFIG, rng = Math.random, skinCount = 1, startDist = 0, onEvent } = {}) {
    this.lobby = lobby;
    this.cfg = cfg;
    this.rng = rng;
    this.skinCount = skinCount;
    this.startDist = startDist; // chỉ dùng khi debug (?start=N)
    this.onEvent = onEvent ?? (() => {});

    this.state = 'wait';
    this.stateTime = 0; // giây kể từ khi vào trạng thái hiện tại
    this.now = 0; // đồng hồ game, chạy liên tục (búa dùng chung đồng hồ này)
    this.round = 0;
    this.raceStart = 0;
    this.racers = [];
    this.ranking = [];
    this.field = null;
    this.result = null;
    this.ctx = { now: 0, cfg, rng, field: null, onHit: (racer, obstacle) => this.onEvent({ type: 'hit', racer, obstacle }) };
  }

  /** Giây đã đua trong lượt hiện tại (0 khi chưa đua). */
  get raceTime() {
    return this.state === 'race' || this.state === 'result' ? this.now - this.raceStart : 0;
  }

  /** Số đang hiển thị khi đếm ngược: 3, 2, 1. */
  get countdownValue() {
    return Math.max(1, Math.ceil(this.cfg.countdownSeconds - this.stateTime));
  }

  /** Bắt đầu lượt đầu tiên. */
  begin() {
    this.beginRound();
  }

  update(dt) {
    this.now += dt;
    this.stateTime += dt;
    switch (this.state) {
      case 'wait':
        if (this.stateTime >= this.cfg.waitSeconds) this.setState('countdown');
        break;
      case 'countdown':
        if (this.stateTime >= this.cfg.countdownSeconds) this.setState('race');
        break;
      case 'race':
        this.stepRace(dt);
        break;
      case 'result':
        if (this.stateTime >= this.cfg.resultSeconds) this.beginRound();
        break;
    }
  }

  setState(state) {
    const prev = this.state;
    this.state = state;
    this.stateTime = 0;
    if (state === 'race') this.raceStart = this.now;
    this.onEvent({ type: 'state', state, prev });
  }

  // Dựng đoàn đua mới: người cũ ở lại, hàng đợi vào cho đủ, thiếu thì thêm bot
  beginRound() {
    this.round++;
    const roster = this.shuffled(this.lobby.prepareRound());
    this.racers = roster.map((user, i) => this.spawnRacer(user, i));
    this.field = generateObstacles(this.rng, this.cfg);
    this.ctx.field = this.field;
    this.result = null;
    rankRacers(this.racers, this.ranking);
    this.onEvent({ type: 'round', round: this.round });
    this.setState('wait');
  }

  spawnRacer(user, index) {
    const racer = createRacer(user, {
      index,
      rng: this.rng,
      cfg: this.cfg,
      skinCount: this.skinCount,
      stats: user.isBot ? undefined : this.lobby.statsFor(user.userId),
    });
    racer.isBot = user.isBot;
    if (!user.isBot) this.lobby.rememberStats(user.userId, racer.stats);
    racer.dist += this.startDist;
    return racer;
  }

  /**
   * Người xem gõ join. Chính sách khi lượt đang đua: người mới được giữ suất và vào đoàn đua từ LƯỢT SAU
   * (late: true). Lý do: vào giữa lượt từ vạch xuất phát thì cả đoàn đã chạy xa, nhân vật mới
   * nằm ngoài khung hình và camera phải zoom ra rất xa. Trước lúc đua (chờ, đếm ngược) và ở màn kết quả
   * thì vào ngay: ở chờ/đếm ngược nhân vật thế chỗ một bot trên vạch xuất phát.
   * Trả về { status: 'racing'|'queued'|'duplicate', late, queuePosition }.
   */
  join(user) {
    const status = this.lobby.join(user);
    if (status === 'duplicate') return { status, late: false, queuePosition: 0 };
    if (status === 'queued') return { status, late: false, queuePosition: this.lobby.queuePosition(user.userId) };
    if (this.state === 'wait' || this.state === 'countdown') this.seatBeforeRace(this.lobby.players.at(-1));
    return { status, late: this.state === 'race', queuePosition: 0 };
  }

  // Đưa người mới lên vạch xuất phát: thế chỗ bot cuối đoàn, hoặc thêm hàng mới nếu không còn bot
  seatBeforeRace(user) {
    let at = this.racers.length - 1;
    while (at >= 0 && !this.racers[at].isBot) at--;
    const racer = this.spawnRacer(user, at >= 0 ? 0 : this.racers.length);
    const removed = at >= 0 ? this.racers[at] : null;
    if (removed) {
      racer.dist = removed.dist;
      racer.lane = racer.targetLane = removed.lane;
      this.racers[at] = racer;
    } else {
      this.racers.push(racer);
    }
    rankRacers(this.racers, this.ranking);
    this.onEvent({ type: 'racer', added: racer, removed });
  }

  // Xếp ngẫu nhiên vị trí xuất phát để không ai luôn đứng hàng đầu
  shuffled(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  stepRace(dt) {
    this.ctx.now = this.now;
    for (const r of this.racers) stepRacer(r, dt, this.ctx);
    rankRacers(this.racers, this.ranking);
    if (this.ranking[0]?.finished || this.now - this.raceStart >= this.cfg.roundSeconds) this.endRace();
  }

  endRace() {
    const winner = this.ranking[0];
    const finished = winner.finished;
    this.result = {
      winner,
      finished, // true: về đích; false: hết giờ, thắng theo % quãng đường
      raceSeconds: finished ? winner.finishTime - this.raceStart : this.cfg.roundSeconds,
      top: this.ranking.slice(0, 10).map((r) => ({ userId: r.userId, nickname: r.nickname, percent: progressPercent(r, this.cfg), finished: r.finished })),
    };
    if (!winner.isBot) this.lobby.recordWin(winner.userId);
    this.setState('result');
    this.onEvent({ type: 'end', result: this.result });
  }
}
