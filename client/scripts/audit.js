// Kiểm tra mô phỏng: đếm lúc nhân vật "đi xuyên" chướng ngại (chạm hình mà không dính, không miễn nhiễm)
// và lúc hai nhân vật chồng lên nhau. Chạy: node client/scripts/audit.js [số lượt] [khung hình/giây, mặc định 60]
// Cũng đo lúc bị dính: nhân vật phải đang thật sự ở trong vùng của chướng ngại (không dính khi đã đi qua).
import { CONFIG } from '../src/config.js';
import { Lobby } from '../src/systems/Lobby.js';
import { RaceManager } from '../src/systems/RaceManager.js';
import { hammerPhaseAt, hitReach, spikeDist } from '../src/systems/Obstacles.js';
import { jumpArc } from '../src/systems/Collision.js';

const rounds = Number(process.argv[2]) || 40;
const fps = Number(process.argv[3]) || 60;
const names = Array.from({ length: 60 }, (_, i) => `Bot${i}`);
let seed = 7;
const rng = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

const lobby = new Lobby({ cfg: CONFIG, rng, botNames: names });
const manager = new RaceManager(lobby, { cfg: CONFIG, rng, skinCount: 8 });
manager.begin();

const stats = { steps: 0, silentSpike: 0, silentHammer: 0, hits: 0, overlapSteps: 0, pairSteps: 0, jumpOver: 0, shielded: 0 };
let done = 0;
const reachOf = (o) => hitReach(o);
let worstPast = -Infinity; // lúc dính, nhân vật đã vượt qua tâm chướng ngại bao xa (cùng chiều chạy), tối đa bằng vùng gây dính
let worstBefore = -Infinity;
manager.addListener((e) => {
  if (e.type === 'hit') {
    stats.hits++;
    const o = e.obstacle;
    const od = o.type === 'spike' ? spikeDist(o, manager.now) : o.dist;
    const delta = e.racer.dist + CONFIG.knockback - od; // vị trí lúc va, so với tâm chướng ngại
    worstPast = Math.max(worstPast, delta - reachOf(o));
    worstBefore = Math.max(worstBefore, -delta - reachOf(o));
    if (Math.abs(e.racer.lane - o.lane) >= CONFIG.hitLaneWidth) stats.hitWrongLane = (stats.hitWrongLane ?? 0) + 1;
  }
  if (e.type === 'end') done++;
});

const dt = 1 / fps;
while (done < rounds) {
  manager.update(dt);
  if (manager.state !== 'race') continue;
  const now = manager.now;
  stats.steps++;
  const racers = manager.racers;
  for (const r of racers) {
    if (r.finished) continue;
    const field = manager.field;
    for (let i = field.indexAfter(r.dist - 20); i < field.list.length; i++) {
      const o = field.list[i];
      if (o.dist > r.dist + 20) break;
      // trùng hình: cùng làn (khớp bề rộng hình), cùng quãng đường
      if (Math.abs(r.lane - o.lane) >= CONFIG.hitLaneWidth) continue;
      const od = o.type === 'spike' ? spikeDist(o, now) : o.dist;
      if (Math.abs(r.dist - od) >= hitReach(o)) continue;
      if (r.shield > 0) stats.shielded++;
      else if (r.stun > 0) continue; // đang choáng: đứng yên ngay chỗ bị đẩy lùi
      else if (o.type === 'spike' && jumpArc(r) >= CONFIG.jumpClearFraction) stats.jumpOver++;
      else if (o.type === 'hammer' && hammerPhaseAt(o, now) !== 'impact') continue; // búa đang nâng cao, chạy dưới được
      else if (o.type === 'spike') stats.silentSpike++;
      else stats.silentHammer++;
    }
  }
  // hai nhân vật chồng lên nhau trên màn hình
  for (let a = 0; a < racers.length; a++) {
    for (let b = a + 1; b < racers.length; b++) {
      stats.pairSteps++;
      if (Math.abs(racers[a].lane - racers[b].lane) < 0.6 && Math.abs(racers[a].dist - racers[b].dist) < 8) stats.overlapSteps++;
    }
  }
}
const pct = (n, d) => `${((100 * n) / d).toFixed(2)}%`;
console.log(`Số lượt: ${rounds}, số bước đua: ${stats.steps}`);
console.log(`Dính chướng ngại: ${stats.hits} (sai làn: ${stats.hitWrongLane ?? 0}; lệch vùng gây dính tối đa phía sau: ${worstPast.toFixed(2)}, phía trước: ${worstBefore.toFixed(2)} đơn vị, <= 0 là đúng vùng)`);
console.log(`Xuyên cầu gai (không dính, không nhảy, không khiên): ${stats.silentSpike}`);
console.log(`Xuyên búa lúc búa đập: ${stats.silentHammer}`);
console.log(`Trùng hình lúc có khiên: ${stats.shielded}; lúc nhảy qua cầu gai: ${stats.jumpOver}`);
console.log(`Hai nhân vật chồng nhau: ${stats.overlapSteps} / ${stats.pairSteps} bước (${pct(stats.overlapSteps, stats.pairSteps)})`);
