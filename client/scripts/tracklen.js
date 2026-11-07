// Chọn độ dài đường đua: in thời gian người thắng về đích theo từng độ dài. Chạy: node client/scripts/tracklen.js [số lượt] [độ dài...]
import { CONFIG } from '../src/config.js';
import { Lobby } from '../src/systems/Lobby.js';
import { RaceManager } from '../src/systems/RaceManager.js';

const rounds = Number(process.argv[2]) || 60;
const lengths = process.argv.slice(3).map(Number);
const names = Array.from({ length: 60 }, (_, i) => `Bot${i}`);

for (const trackLength of lengths.length ? lengths : [CONFIG.trackLength]) {
  let seed = 11;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const cfg = { ...CONFIG, trackLength };
  const manager = new RaceManager(new Lobby({ cfg, rng, botNames: names }), { cfg, rng, skinCount: 8 });
  const times = [];
  let timeouts = 0;
  manager.addListener((e) => {
    if (e.type !== 'end') return;
    if (e.result.finished) times.push(e.result.raceSeconds);
    else timeouts++;
  });
  manager.begin();
  while (times.length + timeouts < rounds) manager.update(1 / 30);
  times.sort((a, b) => a - b);
  const avg = times.reduce((s, t) => s + t, 0) / (times.length || 1);
  console.log(`đường ${trackLength}: về đích TB ${avg.toFixed(0)} giây (sớm nhất ${times[0]?.toFixed(0)}, muộn nhất ${times.at(-1)?.toFixed(0)}), hết giờ ${timeouts}/${rounds} lượt`);
}
