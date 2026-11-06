import { CONFIG } from '../config.js';
import { drawRoad } from './roadDrawing.js';
import { FinishGate } from './FinishGate.js';

// Vẽ nền trời, núi, mặt đường phối cảnh, vạch kẻ làn, dải viền và cổng đích.
// Phần tĩnh (trời, núi, mây) vẽ một lần; phần động (đường, viền, cổng) vẽ lại mỗi frame.
export class TrackView {
  constructor(scene) {
    this.scene = scene;
    this.makeSky();
    this.makeFarScenery();
    this.road = scene.add.graphics().setDepth(1);
    this.gateG = scene.add.graphics().setDepth(2);
    this.gate = new FinishGate(scene, this.gateG);
  }

  makeSky() {
    const { width, horizonY } = CONFIG;
    if (!this.scene.textures.exists('sky')) {
      const tex = this.scene.textures.createCanvas('sky', 4, horizonY);
      const ctx = tex.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
      grad.addColorStop(0, '#2f6bff');
      grad.addColorStop(0.7, '#5aa4ff');
      grad.addColorStop(1, '#9bd4ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 4, horizonY);
      tex.refresh();
    }
    this.scene.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(width, horizonY + 2).setDepth(-10);
  }

  makeFarScenery() {
    const { width, horizonY } = CONFIG;
    const g = this.scene.add.graphics().setDepth(-9);
    // Mây
    g.fillStyle(0xffffff, 0.85);
    for (const [x, y, r] of [[120, 520, 46], [190, 505, 62], [270, 525, 44], [820, 470, 50], [900, 455, 66], [985, 480, 46]]) {
      g.fillCircle(x, y, r);
    }
    // Núi hai lớp, sinh theo công thức cố định để mỗi lần chạy giống nhau
    const layers = [
      { color: 0x7e96ff, base: 70, amp: 140, step: 150, phase: 0.3 },
      { color: 0x8f7df0, base: 30, amp: 90, step: 110, phase: 1.7 },
    ];
    for (const { color, base, amp, step, phase } of layers) {
      g.fillStyle(color, 1);
      for (let x = -step; x < width + step; x += step) {
        const h = base + amp * (0.5 + 0.5 * Math.sin(x * 0.013 + phase));
        g.fillTriangle(x - step * 0.9, horizonY + 6, x + step * 0.9, horizonY + 6, x, horizonY - h);
      }
    }
  }

  draw(cam) {
    drawRoad(this.road, cam);
    this.gateG.clear();
    this.gate.draw(cam);
  }
}
