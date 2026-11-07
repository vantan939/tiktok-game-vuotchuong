// Thử riêng cú nhảy qua cầu gai ở nhiều tốc độ, pha lăn và khung hình: in số lần dính (mong đợi 0).
import { CONFIG } from '../src/config.js';
import { ObstacleField } from '../src/systems/Obstacles.js';
import { createRacer } from '../src/systems/Racer.js';
import { stepRacer } from '../src/systems/RacerAI.js';

let tries = 0;
let hits = 0;
for (const fps of [60, 30, 20]) {
  for (const boost of [1, 1.6, 2.6]) {
    for (let k = 0; k < 36; k++) {
      for (const start of [0, 0.37, 1.1, 2.9]) {
        const phase = (k / 36) * 2 * Math.PI;
        const f = new ObstacleField([
          { id: 0, type: 'spike', dist: 300, lane: 0, phase, warn: 0 },
          { id: 1, type: 'spike', dist: 300, lane: 1, phase: phase + 2, warn: 0 },
        ]);
        const r = createRacer({ userId: 'x', nickname: 'x' }, { stats: { speed: 36, dodgeSkill: 0.8, reaction: 0.3 } });
        r.dist = 0;
        r.lane = r.targetLane = 0;
        r.wanderTimer = 1e9;
        r.boost = 999;
        r.boostMul = boost;
        let now = start;
        const dt = 1 / fps;
        for (let t = 0; t < 16 && r.dist < 400; t += dt) {
          now += dt;
          stepRacer(r, dt, { now, cfg: CONFIG, rng: () => 0, field: f });
        }
        tries++;
        hits += r.hits;
      }
    }
  }
}
console.log(`Thử nhảy: ${tries} lần, dính: ${hits}`);
