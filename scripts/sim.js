// Mô phỏng nhiều lượt đua không giao diện, in thống kê ra console.
// Chạy: npm run sim            (100 lượt, 30 người)
//       npm run sim -- 300 30   (số lượt, số người)
//       npm run sim -- 300 30 likes   thêm 3 người thả tim kiểu khác nhau, so tỉ lệ thắng với người không thả
import { CONFIG } from '../client/src/config.js';
import { createRacer } from '../client/src/systems/Racer.js';
import { stepRacer } from '../client/src/systems/RacerAI.js';
import { rankRacers } from '../client/src/systems/Ranking.js';
import { generateObstacles } from '../client/src/systems/Obstacles.js';
import { giveLike } from '../client/src/systems/LikeBoost.js';

const rounds = Number(process.argv[2]) || 100;
const players = Number(process.argv[3]) || CONFIG.maxPlayers;
const DT = 1 / 30;
const withLikes = process.argv.includes('likes');
// Ba người đầu đoàn đua thả tim theo ba kiểu, những người còn lại không thả
const likeRoles = [
  { name: 'spam: 5 chạm x 10 lần/giây', every: 0.1, taps: 5, wins: 0, rankSum: 0, hits: 0 },
  { name: 'vừa phải: 1 chạm/giây', every: 1, taps: 1, wins: 0, rankSum: 0, hits: 0 },
  { name: 'thả 3 chạm mỗi 2 giây', every: 2, taps: 3, wins: 0, rankSum: 0, hits: 0 },
];
const plain = { wins: 0, rankSum: 0, hits: 0, count: 0 };

// Bộ sinh số ngẫu nhiên có hạt giống để kết quả lặp lại được
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const groups = [
  { name: 'dodgeSkill <= 0,5', test: (d) => d <= 0.5 },
  { name: 'dodgeSkill 0,5 đến 0,7', test: (d) => d > 0.5 && d < 0.7 },
  { name: 'dodgeSkill >= 0,7', test: (d) => d >= 0.7 },
].map((g) => ({ ...g, racers: 0, hits: 0, encounters: 0 }));

let totalHits = 0;
let totalRacers = 0;
let winnerTime = 0;
let finishedRaces = 0;
let leaderChanges = 0;
let zeroHit = 0;
const rng = seeded(12345);

for (let round = 0; round < rounds; round++) {
  const field = generateObstacles(rng);
  const racers = Array.from({ length: players }, (_, i) =>
    createRacer({ userId: `r${round}_${i}`, nickname: `N${i}` }, { index: i, rng, skinCount: 8 }),
  );
  const ranking = [];
  let now = 0;
  let leader = null;
  const nextLike = likeRoles.map(() => 0);
  while (now < CONFIG.roundSeconds && !racers.some((r) => r.finished)) {
    now += DT;
    if (withLikes) {
      likeRoles.forEach((role, k) => {
        if (now >= nextLike[k]) {
          giveLike(racers[k], role.taps, now);
          nextLike[k] += role.every;
        }
      });
    }
    const ctx = { now, cfg: CONFIG, rng, field };
    for (const r of racers) stepRacer(r, DT, ctx);
    rankRacers(racers, ranking);
    if (leader && ranking[0] !== leader) leaderChanges++;
    leader = ranking[0];
  }
  if (racers.some((r) => r.finished)) {
    finishedRaces++;
    winnerTime += now;
  }
  if (withLikes) {
    const winner = ranking[0];
    racers.forEach((r, i) => {
      const role = likeRoles[i];
      const bucket = role ?? plain;
      bucket.rankSum += r.rank;
      bucket.hits += r.hits;
      if (!role) plain.count++;
      if (r === winner) bucket.wins++;
    });
  }
  for (const r of racers) {
    totalHits += r.hits;
    totalRacers++;
    if (r.hits === 0) zeroHit++;
    const g = groups.find((x) => x.test(r.stats.dodgeSkill));
    if (g) {
      g.racers++;
      g.hits += r.hits;
      g.encounters += r.encounters;
    }
  }
}

const f = (x, d = 2) => x.toFixed(d).replace('.', ',');
console.log(`Mô phỏng ${rounds} lượt, ${players} người/lượt, đường dài ${CONFIG.trackLength}, lượt tối đa ${CONFIG.roundSeconds} giây`);
console.log('');
console.log('Nhóm                      | số người | dính/lượt | gặp chướng ngại/lượt | tỉ lệ dính/lần gặp');
for (const g of groups) {
  console.log(
    `${g.name.padEnd(25)} | ${String(g.racers).padStart(8)} | ${f(g.hits / g.racers).padStart(9)} | ${f(g.encounters / g.racers).padStart(20)} | ${f((100 * g.hits) / g.encounters, 1).padStart(15)}%`,
  );
}
console.log('');
console.log(`Trung bình mỗi nhân vật dính ${f(totalHits / totalRacers)} lần/lượt; ${f((100 * zeroHit) / totalRacers, 1)}% không dính lần nào`);
console.log(`Có người về đích trước hết giờ: ${finishedRaces}/${rounds} lượt, người thắng về lúc trung bình ${f(finishedRaces ? winnerTime / finishedRaces : 0, 1)} giây`);
console.log(`Người dẫn đầu đổi trung bình ${f(leaderChanges / rounds, 1)} lần/lượt`);

if (withLikes) {
  console.log('');
  console.log('Thả tim (mỗi lượt có 3 người thả, còn lại không thả):');
  console.log('Kiểu thả                    | thắng   | hạng TB | dính/lượt');
  const row = (name, winPercent, rank, hits) =>
    console.log(`${name.padEnd(27)} | ${f(winPercent, 1).padStart(5)}% | ${f(rank, 1).padStart(7)} | ${f(hits).padStart(9)}`);
  for (const role of likeRoles) row(role.name, (100 * role.wins) / rounds, role.rankSum / rounds, role.hits / rounds);
  const each = plain.count / rounds; // số người không thả mỗi lượt
  row('không thả (mỗi người)', (100 * plain.wins) / rounds / each, plain.rankSum / plain.count, plain.hits / plain.count);
}
