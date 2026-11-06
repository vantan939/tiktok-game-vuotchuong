import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { SKINS, TEX_H, makeSkinTexture } from './skins.js';

export const BADGE_SIZE = 76;
export const BADGE_Y = -TEX_H + 215; // huy hiệu avatar trên thân
const NAME_Y = -TEX_H - 6;
const CROWN_Y = -TEX_H + 52; // đáy vương miện, nằm trên đỉnh đầu
export const SHADOW_Y = -14;
const STAR_CENTER_Y = -TEX_H + 40; // sao quay quanh đầu khi choáng
const STAR_COUNT = 3;
const STREAK_COUNT = 5;

// Phần hiển thị của một nhân vật: bóng, thân (theo skin), huy hiệu avatar, vương miện, nhãn tên,
// sao choáng. Không chứa logic game; nhận vị trí đã chiếu từ scene.
export class RacerView {
  static makeSharedTextures(scene) {
    SKINS.forEach((s) => makeSkinTexture(scene, s));
    if (scene.textures.exists('crown')) return;
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xffc21a, 1);
    g.fillPoints(
      [
        { x: 6, y: 96 }, { x: 6, y: 36 }, { x: 40, y: 62 }, { x: 75, y: 6 },
        { x: 110, y: 62 }, { x: 144, y: 36 }, { x: 144, y: 96 },
      ],
      true,
    );
    g.fillStyle(0xe08a00, 1);
    g.fillRect(6, 80, 138, 16);
    g.fillStyle(0xe0121f, 1);
    g.fillCircle(75, 62, 11);
    g.fillStyle(0xffffff, 1);
    for (const x of [6, 75, 144]) g.fillCircle(x, x === 75 ? 8 : 36, 8);
    g.generateTexture('crown', 150, 100);
    g.clear();

    g.fillStyle(0x000000, 0.28);
    g.fillEllipse(115, 20, 230, 36);
    g.generateTexture('shadow', 230, 40);
    g.clear();

    // Sao choáng 5 cánh
    g.fillStyle(0xffe14d, 1);
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 11 : 26;
      pts.push({ x: 28 + Math.cos(a) * r, y: 28 + Math.sin(a) * r });
    }
    g.fillPoints(pts, true);
    g.generateTexture('star', 56, 56);
    g.destroy();

    // Ánh sáng vàng mờ dần ra ngoài
    const glow = scene.textures.createCanvas('glow', 256, 256);
    const gctx = glow.getContext();
    const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,226,90,0.95)');
    grad.addColorStop(0.45, 'rgba(255,190,40,0.45)');
    grad.addColorStop(1, 'rgba(255,170,0,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 256, 256);
    glow.refresh();

    // Vệt tốc độ: dải đứng vàng trắng mờ dần xuống dưới
    const streak = scene.textures.createCanvas('streak', 40, 340);
    const sctx = streak.getContext();
    const sg = sctx.createLinearGradient(0, 0, 0, 340);
    sg.addColorStop(0, 'rgba(255,255,230,0.95)');
    sg.addColorStop(0.35, 'rgba(255,214,70,0.7)');
    sg.addColorStop(1, 'rgba(255,170,0,0)');
    sctx.fillStyle = sg;
    sctx.beginPath();
    sctx.moveTo(20, 0);
    sctx.lineTo(40, 340);
    sctx.lineTo(0, 340);
    sctx.closePath();
    sctx.fill();
    streak.refresh();

    // Khiên xanh: quả cầu trong suốt, đậm dần ra mép, viền sáng
    const shield = scene.textures.createCanvas('shield', 320, 320);
    const hctx = shield.getContext();
    const sgr = hctx.createRadialGradient(160, 160, 40, 160, 160, 150);
    sgr.addColorStop(0, 'rgba(90,170,255,0.06)');
    sgr.addColorStop(0.75, 'rgba(110,190,255,0.28)');
    sgr.addColorStop(1, 'rgba(150,220,255,0.6)');
    hctx.fillStyle = sgr;
    hctx.beginPath();
    hctx.arc(160, 160, 150, 0, Math.PI * 2);
    hctx.fill();
    hctx.lineWidth = 8;
    hctx.strokeStyle = 'rgba(200,240,255,0.95)';
    hctx.beginPath();
    hctx.arc(160, 160, 146, 0, Math.PI * 2);
    hctx.stroke();
    hctx.fillStyle = 'rgba(255,255,255,0.55)'; // vệt phản chiếu
    hctx.beginPath();
    hctx.ellipse(104, 92, 34, 16, -0.7, 0, Math.PI * 2);
    hctx.fill();
    shield.refresh();
  }

  constructor(scene, racer, avatars) {
    this.scene = scene;
    this.racer = racer;
    this.shadow = scene.add.image(0, SHADOW_Y, 'shadow');
    this.body = scene.add.image(0, 0, SKINS[racer.skinIndex].key).setOrigin(0.5, 1);
    const avatarKey = avatars.request(racer.userId, racer.avatarUrl, (key) => this.badge.setTexture(key));
    this.badge = scene.add.image(0, BADGE_Y, avatarKey).setDisplaySize(BADGE_SIZE, BADGE_SIZE);
    this.crown = scene.add.image(0, CROWN_Y, 'crown').setOrigin(0.5, 1).setVisible(false);
    this.stars = Array.from({ length: STAR_COUNT }, () => scene.add.image(0, STAR_CENTER_Y, 'star').setVisible(false));
    this.label = null; // tạo khi cần lần đầu (chỉ top 3 hiện tên)
    // Hiệu ứng boost nằm phía sau thân: ánh sáng vàng và các vệt tốc độ tỏa xuống dưới chân
    this.glow = scene.add.image(0, -TEX_H * 0.45, 'glow').setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.streaks = Array.from({ length: STREAK_COUNT }, (_, i) =>
      scene.add.image((i - 2) * 48, -50, 'streak').setOrigin(0.5, 0).setRotation(-(i - 2) * 0.2).setBlendMode(Phaser.BlendModes.ADD).setVisible(false),
    );
    this.boosting = false;
    this.shield = scene.add.image(0, -TEX_H * 0.47, 'shield').setVisible(false);
    this.root = scene.add.container(0, 0, [this.glow, ...this.streaks, this.shadow, this.body, this.badge, this.crown, ...this.stars, this.shield]);
    this.grow = 1; // phóng to nhẹ khi có quà, mượt theo thời gian
    this.lastClock = 0;
    this.shielded = false;
    this.showName = false;
    this.hasCrown = false;
    this.dazed = false;
  }

  setCrown(on) {
    if (on === this.hasCrown) return;
    this.hasCrown = on;
    this.crown.setVisible(on);
    this.layoutLabel();
  }

  setNameVisible(on) {
    if (on === this.showName) return;
    this.showName = on;
    if (on && !this.label) this.buildLabel();
    this.label?.setVisible(on);
    this.layoutLabel();
  }

  // Nhãn bo tròn: nền + chữ
  buildLabel() {
    const text = this.scene.add
      .text(0, 0, this.racer.nickname, {
        fontFamily: '"Segoe UI", Arial, sans-serif',
        fontStyle: 'bold',
        fontSize: '54px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const w = text.width + 56;
    const h = text.height + 12;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1b2a6b, 0.9);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(4, 0x8fb4ff, 0.9);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.label = this.scene.add.container(0, NAME_Y, [bg, text]);
    this.labelHeight = h;
    this.root.add(this.label);
  }

  layoutLabel() {
    if (!this.label) return;
    // Có vương miện thì nhãn dời lên trên vương miện
    this.label.y = (this.hasCrown ? CROWN_Y - 100 : NAME_Y) - this.labelHeight / 2;
  }

  /** Đặt theo tọa độ chiếu (x, y, s). bob là pha nhún khi chạy; clock là giây của game (cho hiệu ứng). */
  place(x, y, s, bob, depth, clock) {
    const r = this.racer;
    const k = (CONFIG.runnerHeight / TEX_H) * s;
    let hop = 0;
    let wobble = 0;
    let squash = 1 + 0.03 * Math.cos(bob * 2);
    if (r.stun > 0) {
      wobble = Math.sin(clock * 22) * 9; // choáng: lảo đảo
      squash = 0.92;
    } else if (r.jump > 0) {
      hop = Math.sin(Math.PI * (1 - r.jump / CONFIG.jumpSeconds)) * CONFIG.jumpHeight * s; // nhảy: vòng cung
    } else {
      hop = Math.abs(Math.sin(bob)) * 18 * k;
    }
    const dt = Math.min(0.1, Math.max(0, clock - this.lastClock));
    this.lastClock = clock;
    const targetGrow = r.shield > 0 && r.gift ? 1 + r.gift.grow : 1;
    this.grow += (targetGrow - this.grow) * (1 - Math.exp(-8 * dt));
    this.root.setPosition(x, y - hop).setScale(k * squash * this.grow, k * this.grow).setDepth(depth).setAngle(wobble);
    this.shadow.y = SHADOW_Y + hop / k; // bóng ở lại mặt đường khi nhảy
    this.shadow.setScale(1 - Math.min(0.4, hop / (k * 600)));
    this.updateStars(r.stun > 0, clock);
    this.updateBoost(r, clock);
    this.updateShield(r, clock);
  }

  // Khiên xanh quanh nhân vật (quà): to hơn theo bậc quà, nhấp nháy khi sắp hết
  updateShield(r, clock) {
    const on = r.shield > 0;
    if (on !== this.shielded) {
      this.shielded = on;
      this.shield.setVisible(on);
    }
    if (!on) return;
    const size = 1.45 + (r.gift ? 0.2 * r.gift.fxScale : 0);
    const blink = r.shield < 1 ? 0.5 + 0.5 * Math.sin(clock * 24) : 1; // còn dưới 1 giây thì nhấp nháy
    this.shield.setScale(size * (1 + 0.03 * Math.sin(clock * 9))).setAlpha(blink);
  }

  // Đang boost (tim, quà): ánh sáng vàng phía sau và vệt tốc độ chạy xuống, mờ dần khi sắp hết
  updateBoost(r, clock) {
    const on = r.boost > 0 && r.stun <= 0;
    if (on !== this.boosting) {
      this.boosting = on;
      this.glow.setVisible(on);
      this.streaks.forEach((s) => s.setVisible(on));
    }
    if (!on) return;
    // Quà thì to hơn, mạnh hơn và đổi màu theo bậc; tim thì vàng nhẹ
    const fx = r.shield > 0 ? r.gift : null;
    const size = fx ? fx.fxScale : 1;
    const tint = fx ? fx.tint : 0xffffff;
    const power = Math.min(1, r.boost / 0.5) * (r.boostMul > 1.8 ? 1 : 0.8);
    this.glow
      .setTint(tint)
      .setAlpha(Math.min(1, power * (0.7 + 0.15 * Math.sin(clock * 18))))
      .setScale((2.2 + 0.2 * Math.sin(clock * 12)) * (0.75 + 0.35 * size));
    this.streaks.forEach((s, i) => {
      const p = (clock * 2.4 + i * 0.37) % 1; // mỗi vệt chạy từ chân xuống dưới rồi lặp
      s.setTint(tint)
        .setAlpha(Math.min(1, power * (1 - p) * (0.9 + 0.2 * size)))
        .setScale(0.8 * (0.8 + 0.3 * size), (0.45 + 0.75 * p) * size)
        .setY(-60 + p * 70);
    });
  }

  updateStars(on, clock) {
    if (on !== this.dazed) {
      this.dazed = on;
      this.stars.forEach((st) => st.setVisible(on));
    }
    if (!on) return;
    this.stars.forEach((st, i) => {
      const a = clock * 9 + (i * Math.PI * 2) / STAR_COUNT;
      st.setPosition(Math.cos(a) * 110, STAR_CENTER_Y + Math.sin(a) * 28).setScale(0.8 + 0.25 * Math.sin(a));
    });
  }

  setVisible(on) {
    this.root.setVisible(on);
  }

  destroy() {
    this.root.destroy();
  }
}
