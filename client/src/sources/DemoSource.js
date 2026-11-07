import { CONFIG } from '../config.js';
import { STR } from '../strings.js';

export const GIFTS = [
  { giftName: 'Hoa hồng', diamonds: 1 },
  { giftName: 'Bắn tim', diamonds: 5 },
  { giftName: 'Kem', diamonds: 10 },
  { giftName: 'Gấu bông', diamonds: 99 },
  { giftName: 'Nhẫn kim cương', diamonds: 500 },
  { giftName: 'Sư tử', diamonds: 29999 },
];

// Nguồn sự kiện giả lập (?demo=1): 40 người dùng giả tự join, gõ s, thả tim, tặng quà.
// Logic thuần, không phụ thuộc Phaser. "join" và "s" được phát dưới dạng bình luận (chat),
// giống TikTok thật vì người xem gõ chữ vào ô bình luận.
export class DemoSource {
  // users: số người dùng giả (mặc định CONFIG.demoUserCount, vượt số tên có sẵn thì đặt tên Khán giả N); spam: bật nhiều luồng sự kiện song song để thử tải
  constructor(bus, random = Math.random, { users = CONFIG.demoUserCount, spam = false } = {}) {
    this.bus = bus;
    this.spam = spam;
    this.random = random;
    this.timers = new Set();
    this.users = Array.from({ length: users }, (_, i) => STR.demoNames[i] ?? `Khán giả ${i + 1}`).map((nickname, i) => ({
      userId: `demo_${i + 1}`,
      nickname,
      avatarUrl: '',
      joined: false,
    }));
  }

  start() {
    // Mỗi người join lệch nhau để mô phỏng người xem vào dần
    this.users.forEach((u) => {
      this.after(this.rand(CONFIG.demoFirstJoinSeconds, CONFIG.demoJoinSpreadSeconds), () => this.chat(u, 'join'));
    });
    const { likes, gifts, joins } = this.spam ? CONFIG.spamStreams : { likes: 1, gifts: 1, joins: 0 };
    const rate = (n, normal) => (this.spam ? [0.3, 1] : normal);
    for (let i = 0; i < likes; i++) this.loop(rate(likes, CONFIG.demoLike), (u) => this.like(u, 1 + Math.floor(this.random() * CONFIG.demoLikeMax)));
    for (let i = 0; i < gifts; i++) this.loop(rate(gifts, CONFIG.demoGift), (u) => this.gift(u, this.randomGift()));
    for (let i = 0; i < joins; i++) this.loop([0.3, 1], (u) => this.chat(u, 'join')); // gõ join liên tục (cả người đang chờ lẫn đang đua)
  }

  stop() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }

  /** Tìm người dùng theo tên (không phân biệt hoa thường), chưa có thì tạo mới. Dùng cho panel debug. */
  userByName(name) {
    const key = name.trim().toLowerCase();
    let user = this.users.find((u) => u.nickname.toLowerCase() === key);
    if (!user) {
      user = { userId: `custom_${key}`, nickname: name.trim(), avatarUrl: '', joined: false };
      this.users.push(user);
    }
    return user;
  }

  // Các hàm phát sự kiện, panel debug gọi trực tiếp
  chat(user, text) {
    if (text === 'join') user.joined = true;
    this.bus.emit({ type: 'chat', ...this.base(user), text });
  }

  like(user, likeCount = 1) {
    this.bus.emit({ type: 'like', ...this.base(user), likeCount });
  }

  gift(user, gift = GIFTS[0]) {
    this.bus.emit({ type: 'gift', ...this.base(user), ...gift });
  }

  base(u) {
    return { userId: u.userId, nickname: u.nickname, avatarUrl: u.avatarUrl };
  }

  // Quà nhỏ hay gặp nhất, quà lớn hiếm, cho giống buổi live thật
  randomGift() {
    const r = this.random();
    if (r < 0.65) return this.pick(GIFTS.slice(0, 4));
    if (r < 0.92) return GIFTS[4];
    return GIFTS[5];
  }

  // Lặp vô hạn: mỗi lần chọn ngẫu nhiên một người đã join, rồi hẹn lần sau
  loop([minSec, maxSec], action) {
    const tick = () => {
      const joined = this.users.filter((u) => u.joined);
      if (joined.length) action(this.pick(joined));
      this.after(this.rand(minSec, maxSec), tick);
    };
    this.after(this.rand(minSec, maxSec) + CONFIG.demoWarmupSeconds, tick);
  }

  after(seconds, fn) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, seconds * 1000);
    this.timers.add(id);
  }

  rand(min, max) {
    return min + this.random() * (max - min);
  }

  pick(list) {
    return list[Math.floor(this.random() * list.length)];
  }
}
