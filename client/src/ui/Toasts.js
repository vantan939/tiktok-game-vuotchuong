const FONT = '"Segoe UI", Arial, sans-serif';
const BASE_Y = 1650; // thông báo mới nhất nằm dưới cùng, ngay trên thanh hàng đợi
const LEFT = 24;
const ROW_GAP = 66;
const MAX_VISIBLE = 5;
const LIFE_SECONDS = 2.8;
const FADE_SECONDS = 0.5;
const KIND_COLOR = { ok: 0x35c759, queue: 0xffc21a, warn: 0xff6b6b };

// Thông báo ngắn xếp dọc ở góc dưới trái, mỗi cái tự biến mất sau vài giây. Dùng pool cố định.
export class Toasts {
  constructor(scene) {
    this.scene = scene;
    this.pool = Array.from({ length: MAX_VISIBLE }, () => this.makeItem());
    this.active = []; // theo thứ tự cũ → mới
    this.pending = []; // chờ chỗ khi có quá nhiều thông báo cùng lúc
  }

  makeItem() {
    const { scene } = this;
    const bg = scene.add.graphics();
    const text = scene.add.text(40, 0, '', { fontFamily: FONT, fontStyle: 'bold', fontSize: '38px', color: '#ffffff' }).setOrigin(0, 0.5);
    const root = scene.add.container(LEFT, BASE_Y, [bg, text]).setDepth(950).setVisible(false);
    return { root, bg, text, age: 0, y: BASE_Y, targetY: BASE_Y };
  }

  show(message) {
    this.pending.push(message);
    this.flush();
  }

  flush() {
    while (this.pending.length && this.pool.length) {
      const msg = this.pending.shift();
      const item = this.pool.pop();
      item.text.setText(msg.text);
      const w = item.text.width + 64;
      const h = 54;
      item.bg.clear();
      item.bg.fillStyle(0x1b1450, 0.88);
      item.bg.fillRoundedRect(0, -h / 2, w, h, h / 2);
      item.bg.fillStyle(KIND_COLOR[msg.kind] ?? 0xffffff, 1);
      item.bg.fillCircle(24, 0, 9);
      item.age = 0;
      item.y = BASE_Y + ROW_GAP; // trượt từ dưới lên
      item.root.setVisible(true).setAlpha(0).setPosition(LEFT, item.y);
      this.active.push(item);
    }
    // Quá nhiều thông báo cùng lúc thì bỏ bớt cái cũ nhất để cái mới hiện kịp
    if (this.pending.length > 8) this.pending.splice(0, this.pending.length - 8);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.age += dt;
      if (item.age >= LIFE_SECONDS) {
        item.root.setVisible(false);
        this.active.splice(i, 1);
        this.pool.push(item);
      }
    }
    this.flush();
    this.active.forEach((item, i) => {
      item.targetY = BASE_Y - (this.active.length - 1 - i) * ROW_GAP;
      item.y += (item.targetY - item.y) * (1 - Math.exp(-14 * dt));
      const fadeIn = Math.min(1, item.age / 0.15);
      const fadeOut = Math.min(1, (LIFE_SECONDS - item.age) / FADE_SECONDS);
      item.root.setPosition(LEFT, item.y).setAlpha(Math.min(fadeIn, fadeOut));
    });
  }
}
