// Đo né sớm đến đâu: nhân vật bắt đầu đổi làn và đổi xong cách chướng ngại bao nhiêu đơn vị. Chạy: node client/scripts/dodgecheck.js
import { CONFIG } from '../src/config.js';
import { ObstacleField } from '../src/systems/Obstacles.js';
import { createRacer } from '../src/systems/Racer.js';
import { stepRacer } from '../src/systems/RacerAI.js';
for (const type of ['spike','hammer']) for (const reaction of [0.2, 0.6]) for (const speed of [33, 40]) {
  const f = new ObstacleField([{ id: 0, type, dist: 400, lane: 1, phase: 0.3, warn: 0.8 }]);
  const r = createRacer({ userId: 'x', nickname: 'x' }, { stats: { speed, dodgeSkill: 0.8, reaction } });
  r.dist = 0; r.lane = r.targetLane = 1; r.wanderTimer = 1e9;
  let now = 0, start = null, done = null;
  for (let t = 0; t < 20 && r.dist < 420; t += 1/60) { now += 1/60; stepRacer(r, 1/60, { now, cfg: CONFIG, rng: () => 0, field: f });
    if (start === null && Math.abs(r.lane - 1) > 0.1) start = 400 - r.dist;
    if (start !== null && done === null && Math.abs(r.lane - r.targetLane) < 0.05) done = 400 - r.dist; }
  console.log(type, 'phản ứng', reaction, 'tốc độ', speed, '→ bắt đầu đổi làn cách', start?.toFixed(0), 'u, xong cách', done?.toFixed(0), 'u, dính', r.hits);
}
