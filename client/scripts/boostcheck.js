// Thử thả tim và tặng quà qua đúng đường xử lý của game: so quãng đường chạy được trong 10 giây.
// Chạy: node client/scripts/boostcheck.js
import { CONFIG } from '../src/config.js';
import { Lobby } from '../src/systems/Lobby.js';
import { RaceManager } from '../src/systems/RaceManager.js';
import { LikeBoost } from '../src/systems/LikeBoost.js';
import { GiftBoost } from '../src/systems/GiftBoost.js';

const cfg = { ...CONFIG, obstacleFirstDist: 1e9 }; // đường trống để chỉ đo tốc độ
function run(action) {
  const lobby = new Lobby({ cfg, rng: () => 0.5, botNames: ['A', 'B', 'C'] });
  const events = [];
  const manager = new RaceManager(lobby, { cfg, rng: () => 0.5, skinCount: 8, onEvent: (e) => events.push(e) });
  manager.join({ userId: 'u1', nickname: 'Lan', avatarUrl: '' });
  manager.begin();
  const like = new LikeBoost(manager, cfg);
  const gift = new GiftBoost(manager, cfg);
  while (manager.state !== 'race') manager.update(1 / 30);
  const r = manager.racerOf('u1');
  r.stats.speed = 36;
  const start = r.dist;
  const notes = [];
  for (let t = 0; t < 10; t += 1 / 30) {
    action?.({ t, manager, like, gift, notes });
    manager.update(1 / 30);
  }
  return { meters: r.dist - start, shield: r.shield, notes, events: events.filter((e) => e.type === 'boost').length };
}

const base = run(null);
const likes = run(({ t, like, manager }) => {
  if (Math.abs(t % 1) < 1 / 30) like.handle({ type: 'like', userId: 'u1', nickname: 'Lan', likeCount: 1 }); // 1 lần chạm mỗi giây
});
const spam = run(({ t, like }) => {
  if (Math.abs((t * 10) % 1) < 1 / 3) like.handle({ type: 'like', userId: 'u1', nickname: 'Lan', likeCount: 5 }); // 5 chạm, 10 lần/giây
});
const small = run(({ t, gift, notes, manager }) => {
  if (t < 1 / 30) notes.push(gift.handle({ type: 'gift', userId: 'u1', nickname: 'Lan', giftName: 'Hoa', diamonds: 1 }) ? 'ok' : 'không tác dụng');
});
const big = run(({ t, gift, notes }) => {
  if (t < 1 / 30) notes.push(gift.handle({ type: 'gift', userId: 'u1', nickname: 'Lan', giftName: 'Sư tử', diamonds: 1500 }) ? 'ok' : 'không tác dụng');
});
const out = (name, r) => console.log(`${name.padEnd(34)} ${r.meters.toFixed(0).padStart(4)} đơn vị / 10 giây (x${(r.meters / base.meters).toFixed(2)}), sự kiện boost: ${r.events}`);
out('Không tương tác', base);
out('Thả tim 1 chạm/giây', likes);
out('Thả tim spam 5 chạm x 10 lần/giây', spam);
out('Quà nhỏ (1 kim cương), 1 lần', small);
out('Quà lớn (1500 kim cương), 1 lần', big);
