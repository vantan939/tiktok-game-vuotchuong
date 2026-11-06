import { CONFIG } from '../config.js';
import { scaleAt, screenY } from '../systems/Projection.js';
import { ART, ATLAS } from './art.js';

const GATE_SPAN = 856; // khoảng cách hai trụ trong ảnh cổng (px logic)
const GATE_BASE_Y = 640 / 660; // chân trụ nằm ở 640/660 chiều cao ảnh
const FLAG_HEIGHT = 380; // chiều cao cờ ngoài thế giới (px tại s = 1)

// Cổng đích hình vòm ĐÍCH và hai lá cờ ca-rô hai bên (ảnh trong atlas). Hiện ra khi gần cuối đường
// (xa hơn minDrawScale thì tự ẩn). Co giãn theo phối cảnh.
export class FinishGate {
  constructor(scene) {
    this.gate = scene.add.image(0, 0, ATLAS, 'gate').setOrigin(0.5, GATE_BASE_Y).setDepth(3).setVisible(false);
    this.flags = [-1, 1].map((side) =>
      scene.add.image(0, 0, ATLAS, 'flag').setOrigin(0.09, 0.98).setFlipX(side < 0).setDepth(3).setVisible(false),
    );
  }

  draw(cam, clock = 0) {
    const s = scaleAt(CONFIG.trackLength - cam.z0, cam.focal);
    const on = s >= CONFIG.minDrawScale && s <= 1.5;
    this.gate.setVisible(on);
    this.flags.forEach((f) => f.setVisible(on));
    if (!on) return;
    const cx = CONFIG.width / 2;
    const y0 = screenY(s);
    const k = (CONFIG.roadHalfWidth * 2 + 100) / GATE_SPAN;
    this.gate.setPosition(cx, y0).setScale(s * k * ART);
    const flagScale = (s * FLAG_HEIGHT * ART) / 260;
    this.flags.forEach((f, i) => {
      const side = i === 0 ? -1 : 1;
      f.setPosition(cx + side * (CONFIG.roadHalfWidth + 250) * s, y0)
        .setScale(flagScale)
        .setRotation(Math.sin(clock * 3 + i) * 0.05);
    });
  }
}
