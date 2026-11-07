import { CONFIG } from '../config.js';
import { progressPercent } from './Ranking.js';

/** Đổi số giây thành mm:ss (làm tròn xuống). */
export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Số giây đã đua để hiện ở ô THỜI GIAN: 0 khi chưa đua, chạy khi đua, đứng ở thời điểm kết thúc khi có kết quả. */
export function elapsedSeconds(manager) {
  if (manager.state === 'race') return Math.min(manager.raceTime, manager.cfg.roundSeconds);
  if (manager.state === 'result') return Math.min(manager.result?.raceSeconds ?? 0, manager.cfg.roundSeconds);
  return 0;
}

/** Còn dưới lowSeconds giây của lượt đang đua thì ô THỜI GIAN báo động (đỏ, nhấp nháy). */
export function isTimeLow(manager, lowSeconds = 10) {
  return manager.state === 'race' && manager.cfg.roundSeconds - manager.raceTime < lowSeconds;
}

/** Dữ liệu cho HUD (Hud.update) lấy từ trạng thái game. Thuần logic, không đụng DOM. */
export function buildHudModel(manager, lobby, cfg = CONFIG) {
  // Hàng đợi theo thứ tự gõ join. maxPlayers người đầu sẽ vào đua ở lượt kế (late: true, hiện dấu ✓), còn lại hiện số #4, #5...
  const waiting = lobby.queue.map((p, i) => (i < cfg.maxPlayers
    ? { id: p.userId, avatarUrl: p.avatarUrl, late: true }
    : { id: p.userId, avatarUrl: p.avatarUrl, late: false, n: i + 1 }));
  return {
    racing: manager.racers.length,
    max: cfg.maxPlayers,
    time: formatClock(elapsedSeconds(manager)),
    total: formatClock(manager.cfg.roundSeconds),
    low: isTimeLow(manager),
    top: manager.ranking.slice(0, cfg.topShown).map((r) => ({
      id: r.userId,
      name: r.nickname,
      avatarUrl: r.avatarUrl,
      percent: progressPercent(r, manager.cfg),
    })),
    queueTotal: waiting.length,
    queueFirst: waiting.slice(0, cfg.queueShown),
    queueBase: cfg.maxPlayers,
  };
}
