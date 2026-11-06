import { CONFIG } from '../config.js';

/** Băm chuỗi thành số nguyên không âm, ổn định: cùng chuỗi luôn ra cùng số. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const round2 = (x) => Math.round(x * 100) / 100;

/** Bộ chỉ số ngẫu nhiên cho nhân vật mới. */
export function randomStats(rng = Math.random, cfg = CONFIG) {
  const between = (min, max) => min + rng() * (max - min);
  return {
    speed: between(cfg.speedMin, cfg.speedMax),
    dodgeSkill: round2(between(cfg.dodgeSkillMin, cfg.dodgeSkillMax)),
    reaction: between(cfg.reactionMin, cfg.reactionMax),
  };
}

/** Người chơi thật thắng một lượt: dodgeSkill +0,02, tối đa 0,9. Trả về bản chỉ số mới. */
export function applyWin(stats, cfg = CONFIG) {
  return { ...stats, dodgeSkill: Math.min(cfg.dodgeSkillCap, round2(stats.dodgeSkill + cfg.dodgeSkillWinBonus)) };
}

/**
 * Tạo trạng thái một nhân vật (logic thuần, không có hình).
 * user: { userId, nickname, avatarUrl }. stats truyền vào nếu đã lưu theo userId (Task 21).
 */
export function createRacer(user, { index = 0, rng = Math.random, cfg = CONFIG, stats, skinCount = 1 } = {}) {
  const racer = {
    userId: user.userId,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl ?? '',
    skinIndex: hashString(user.userId) % skinCount,
    stats: stats ?? randomStats(rng, cfg),
    rank: 0,
  };
  return resetRacer(racer, index, rng, cfg);
}

/** Đưa nhân vật về vạch xuất phát (giữ nguyên chỉ số). index quyết định làn và hàng đứng. */
export function resetRacer(racer, index, rng = Math.random, cfg = CONFIG) {
  const lane = index % cfg.lanes;
  const row = Math.floor(index / cfg.lanes);
  racer.dist = 0 - row * cfg.startRowGap; // hàng sau đứng lùi sau vạch xuất phát
  racer.lane = lane; // vị trí làn hiện tại (số thực, trượt mượt)
  racer.targetLane = lane;
  racer.pending = null; // lệnh đổi làn đang chờ hết độ trễ phản ứng: { lane, delay }
  racer.wanderTimer = cfg.wanderInterval[0] + rng() * (cfg.wanderInterval[1] - cfg.wanderInterval[0]);
  racer.finished = false;
  racer.finishTime = null;

  // Trạng thái tạm thời (giây còn lại)
  racer.stun = 0;
  racer.shield = 0;
  racer.boost = 0;
  racer.boostMul = 1;
  racer.jump = 0;
  // Tự né
  racer.plan = null; // kế hoạch né đang chờ: { kind: 'lane'|'jump'|'wait', o, delay, lane? }
  racer.waitFor = null; // búa đang canh nhịp chờ qua
  racer.waitCap = Infinity;
  racer.evading = false;
  racer.rolled = racer.rolled ?? new Set(); // id chướng ngại đã tung xác suất nhận diện
  racer.rolled.clear();
  // Thống kê một lượt
  racer.hits = 0;
  racer.encounters = 0;
  return racer;
}

/** Tăng tốc (tim, quà): nhân tốc độ trong một khoảng thời gian. Giữ mức mạnh hơn và thời gian dài hơn. */
export function applyBoost(racer, multiplier, seconds) {
  racer.boostMul = racer.boost > 0 ? Math.max(racer.boostMul, multiplier) : multiplier;
  racer.boost = Math.max(racer.boost, seconds);
}

export function applyShield(racer, seconds) {
  racer.shield = Math.max(racer.shield, seconds);
}
