import { CONFIG } from '../config.js';

const FONT = '"Segoe UI", Arial, sans-serif';
const CX = CONFIG.width / 2;
const Y = 760; // giữa màn hình, phía trên đoàn đua
const MAX_QUEUE = 3;
const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

// Thông báo to giữa màn hình cho quà lớn ("X tặng Y, bay vút!"). Hiện lần lượt, mỗi cái giftBannerSeconds giây.
export class GiftBanner {
  constructor(scene) {
    this.bg = scene.add.graphics().setDepth(960).setVisible(false);
    this.text = scene.add
      .text(CX, Y, '', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '64px',
        color: '#fff3b0',
        stroke: '#7a2a00',
        strokeThickness: 12,
        align: 'center',
        wordWrap: { width: CONFIG.width - 200 },
      })
      .setOrigin(0.5)
      .setDepth(961)
      .setVisible(false);
    this.queue = [];
    this.age = 0;
    this.active = false;
  }

  show(message) {
    this.queue.push(message);
    if (this.queue.length > MAX_QUEUE) this.queue.shift();
    if (!this.active) this.next();
  }

  next() {
    const msg = this.queue.shift();
    if (!msg) {
      this.active = false;
      this.bg.setVisible(false);
      this.text.setVisible(false);
      return;
    }
    this.active = true;
    this.age = 0;
    this.text.setText(msg).setVisible(true);
    const w = Math.min(CONFIG.width - 60, this.text.width + 120);
    const h = this.text.height + 60;
    this.bg.clear();
    this.bg.fillStyle(0x1b1450, 0.82);
    this.bg.fillRoundedRect(CX - w / 2, Y - h / 2, w, h, h / 2.4);
    this.bg.lineStyle(8, 0xffc21a, 1);
    this.bg.strokeRoundedRect(CX - w / 2, Y - h / 2, w, h, h / 2.4);
    this.bg.setVisible(true);
  }

  update(dt) {
    if (!this.active) return;
    this.age += dt;
    const life = CONFIG.giftBannerSeconds;
    if (this.age >= life) return this.next();
    const pop = easeOutBack(Math.min(1, this.age / 0.35));
    const fade = Math.min(1, (life - this.age) / 0.4);
    this.text.setScale(pop).setAlpha(fade);
    this.bg.setAlpha(fade);
    // phóng nền theo chữ cho cùng nhịp nảy
    this.bg.setScale(pop).setPosition(CX * (1 - pop), Y * (1 - pop));
  }
}
