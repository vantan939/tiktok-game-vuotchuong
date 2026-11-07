import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { ART, ATLAS } from './art.js';
import { SKINS, TEX_H } from './skins.js';

export const SHADOW_Y = -8;
const CROWN_Y = -TEX_H + 100; // đáy vương miện, đậu lên đỉnh đầu
export const HEAD_TOP_Y = -TEX_H + 70; // đỉnh đầu (tọa độ cục bộ), nhãn tên đặt phía trên
const STAR_CENTER_Y = -TEX_H + 62; // sao quay quanh đầu khi choáng
const STAR_COUNT = 3;
const STREAK_COUNT = 5;
const STREAK_COLORS = [0xff6ad0, 0xffd23a, 0xa56bff, 0xff6ad0, 0xffd23a]; // vệt tốc độ: hồng, vàng, tím

// Phần hiển thị của một nhân vật: bóng mềm, thân (theo skin), vương miện, sao choáng, khiên và hiệu ứng boost.
// Không chứa logic game; nhận vị trí đã chiếu từ scene. Nhãn tên là HTML (xem NameTags).
export class RacerView {
  /** Texture mềm tạo bằng gradient (ánh sáng, vệt tốc độ, khiên). Hình vẽ tay nằm trong atlas. */
  static makeSharedTextures(scene) {
    if (scene.textures.exists('glow')) return;

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

  constructor(scene, racer) {
    this.scene = scene;
    this.racer = racer;
    this.shadow = scene.add.image(0, SHADOW_Y, ATLAS, 'shadow').setScale(ART * 1.2);
    this.body = scene.add.image(0, 0, ATLAS, SKINS[racer.skinIndex].frame).setOrigin(0.5, 1).setScale(ART);
    this.crown = scene.add.image(0, CROWN_Y, ATLAS, 'icon_crown').setOrigin(0.5, 1).setScale(ART).setVisible(false);
    this.stars = Array.from({ length: STAR_COUNT }, () => scene.add.image(0, STAR_CENTER_Y, ATLAS, 'icon_star').setScale(ART * 0.9).setVisible(false));
    // Hiệu ứng boost nằm phía sau thân: ánh sáng vàng và các vệt tốc độ tỏa xuống dưới chân
    this.glow = scene.add.image(0, -TEX_H * 0.45, 'glow').setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this.streaks = Array.from({ length: STREAK_COUNT }, (_, i) =>
      scene.add.image((i - 2) * 48, -50, 'streak').setOrigin(0.5, 0).setRotation(-(i - 2) * 0.2).setBlendMode(Phaser.BlendModes.ADD).setVisible(false),
    );
    this.shield = scene.add.image(0, -TEX_H * 0.47, 'shield').setVisible(false);
    this.root = scene.add.container(0, 0, [this.glow, ...this.streaks, this.shadow, this.body, this.crown, ...this.stars, this.shield]);
    this.boosting = false;
    this.grow = 1; // phóng to nhẹ khi có quà, mượt theo thời gian
    this.lastClock = 0;
    this.shielded = false;
    this.hasCrown = false;
    this.dazed = false;
    this.top = { x: 0, y: 0 }; // vị trí đỉnh đầu trên màn hình, cho nhãn tên HTML
  }

  setCrown(on) {
    if (on === this.hasCrown) return;
    this.hasCrown = on;
    this.crown.setVisible(on);
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
    const mul = this.extraScale ?? 1;
    this.root.setPosition(x, y - hop).setScale(k * squash * this.grow * mul, k * this.grow * mul).setDepth(depth).setAngle(wobble);
    this.shadow.y = SHADOW_Y + hop / k; // bóng ở lại mặt đường khi nhảy
    this.shadow.setScale(ART * 1.2 * (1 - Math.min(0.4, hop / (k * 600))));
    this.top.x = x;
    this.top.y = y - hop + (HEAD_TOP_Y - (this.hasCrown ? 96 : 0)) * k * this.grow;
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
      s.setTint(STREAK_COLORS[i % STREAK_COLORS.length])
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
      st.setPosition(Math.cos(a) * 110, STAR_CENTER_Y + Math.sin(a) * 28).setScale(ART * (0.8 + 0.25 * Math.sin(a)) * 1.1);
    });
  }

  setVisible(on) {
    this.root.setVisible(on);
  }

  destroy() {
    this.root.destroy();
  }
}
