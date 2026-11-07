// Ước lượng MC gọi genmax bao nhiêu mỗi lượt: đếm câu và ký tự "mới" (chưa có trong cache), tách câu cố định và câu có tên.
// Chạy: node client/scripts/mccost.js [số lượt]
import { CONFIG } from '../src/config.js';
import { Lobby } from '../src/systems/Lobby.js';
import { RaceManager } from '../src/systems/RaceManager.js';
import { McDirector } from '../src/systems/McDirector.js';
import { staticLines } from '../src/audio/Mc.js';

const rounds = Number(process.argv[2]) || 10;
const names = Array.from({ length: 60 }, (_, i) => `Bot${i}`);
let seed = 5;
const rng = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};
const lobby = new Lobby({ cfg: CONFIG, rng, botNames: names });
for (let i = 0; i < 2; i++) lobby.join({ userId: `u${i}`, nickname: `NguoiXem${i}`, avatarUrl: '' }); // 2 người thật
const mc = new McDirector(CONFIG, rng);
const cached = new Set(staticLines()); // câu cố định đã được tạo sẵn
let spoken = 0;
let fresh = 0;
let freshChars = 0;
const perRound = [];
let cur = { spoken: 0, fresh: 0, chars: 0 };
const say = (lines) => {
  for (const l of lines) {
    cur.spoken++;
    spoken++;
    if (!cached.has(l.text)) {
      cached.add(l.text);
      cur.fresh++;
      cur.chars += [...l.text].length;
      fresh++;
      freshChars += [...l.text].length;
    }
  }
};
const manager = new RaceManager(lobby, {
  cfg: CONFIG, rng, skinCount: 8,
  onEvent: (e) => {
    if (e.type === 'round') {
      mc.onRound();
      if (cur.spoken) perRound.push(cur);
      cur = { spoken: 0, fresh: 0, chars: 0 };
    }
    if (e.type === 'state') say(mc.onState(e.state, manager, manager.now));
    if (e.type === 'dodge' || e.type === 'hit') say(mc.onEvent(e, manager.now));
  },
});
manager.begin();
let r = 0;
manager.addListener((e) => e.type === 'end' && r++);
while (r < rounds) {
  manager.update(1 / 30);
  say(mc.update(manager, manager.now));
}
perRound.push(cur);
const avg = (k) => (perRound.reduce((s, x) => s + x[k], 0) / perRound.length).toFixed(1);
console.log(`${rounds} lượt: MC nói TB ${avg('spoken')} câu/lượt; câu phải tạo mới TB ${avg('fresh')} câu, ${avg('chars')} ký tự/lượt`);
console.log(`Tổng ${spoken} câu, trong đó tạo mới ${fresh} câu (${freshChars} ký tự); còn lại lấy từ cache`);
