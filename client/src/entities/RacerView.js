import { CONFIG } from '../config.js';
import { SKINS, TEX_H, makeSkinTexture } from './skins.js';

const BADGE_SIZE = 76;
const BADGE_Y = -TEX_H + 215; // huy hiệu avatar trên thân
const NAME_Y = -TEX_H - 6;
const CROWN_Y = -TEX_H + 52; // đáy vương miện, nằm trên đỉnh đầu

// Phần hiển thị của một nhân vật: thân (theo skin), huy hiệu avatar, vương miện, nhãn tên.
// Không chứa logic game; nhận vị trí đã chiếu từ scene.
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
    g.destroy();
  }

  constructor(scene, racer, avatars) {
    this.scene = scene;
    this.racer = racer;
    this.body = scene.add.image(0, 0, SKINS[racer.skinIndex].key).setOrigin(0.5, 1);
    const avatarKey = avatars.request(racer.userId, racer.avatarUrl, (key) => this.badge.setTexture(key));
    this.badge = scene.add.image(0, BADGE_Y, avatarKey).setDisplaySize(BADGE_SIZE, BADGE_SIZE);
    this.crown = scene.add.image(0, CROWN_Y, 'crown').setOrigin(0.5, 1).setVisible(false);
    this.label = null; // tạo khi cần lần đầu (chỉ top 3 hiện tên)
    this.root = scene.add.container(0, 0, [this.body, this.badge, this.crown]);
    this.showName = false;
    this.hasCrown = false;
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

  /** Đặt theo tọa độ chiếu (x, y, s). bob là pha nhún khi chạy. */
  place(x, y, s, bob, depth) {
    const k = (CONFIG.runnerHeight / TEX_H) * s;
    const hop = Math.abs(Math.sin(bob)) * 18 * k;
    this.root.setPosition(x, y - hop).setScale(k * (1 + 0.03 * Math.cos(bob * 2)), k).setDepth(depth);
  }

  setVisible(on) {
    this.root.setVisible(on);
  }

  destroy() {
    this.root.destroy();
  }
}
