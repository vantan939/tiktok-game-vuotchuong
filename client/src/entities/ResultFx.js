import { CONFIG } from '../config.js';
import { Confetti } from './Confetti.js';

const RAIN_PER_SECOND = 45;

// Phần hiệu ứng của màn kết quả nằm trong canvas: nền tối mờ dần và pháo giấy. Chữ, avatar, vương miện là HTML (Overlays.js).
export class ResultFx {
  constructor(scene) {
    this.dim = scene.add.rectangle(CONFIG.width / 2, CONFIG.height / 2, CONFIG.width, CONFIG.height, 0x0a0a30, 0).setDepth(1000);
    this.confetti = new Confetti(scene);
    this.lastState = null;
    this.rainDebt = 0;
  }

  update(m, dt) {
    if (m.state !== this.lastState) {
      this.lastState = m.state;
      this.confetti.clear();
      this.dim.setFillStyle(0x0a0a30, 0);
      if (m.state === 'result') this.confetti.burst();
    }
    this.confetti.update(dt);
    if (m.state !== 'result') return;
    this.dim.setFillStyle(0x0a0a30, Math.min(0.62, m.stateTime * 2));
    if (m.stateTime < m.cfg.resultSeconds - 1) {
      this.rainDebt += dt * RAIN_PER_SECOND;
      for (; this.rainDebt >= 1; this.rainDebt--) this.confetti.rain(1);
    }
  }
}
