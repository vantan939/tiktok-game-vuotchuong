import { CONFIG } from '../config.js';
import { nominalSpeed } from '../systems/DodgeAI.js';
import { laneCenter, laneWidthPx, scaleAt, screenX, screenY } from '../systems/Projection.js';

// Chế độ debug (phím B): hiện dodgeSkill trên đầu từng nhân vật và vẽ vùng "nhìn trước".
export class DebugOverlay {
  constructor(scene) {
    this.scene = scene;
    this.on = false;
    this.g = scene.add.graphics().setDepth(900).setVisible(false);
    this.texts = new Map();
    this.status = scene.add
      .text(12, 12, '', { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '30px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 8, y: 4 } })
      .setDepth(902)
      .setVisible(false);
    scene.input.keyboard.on('keydown-B', () => this.toggle());
  }

  toggle() {
    this.on = !this.on;
    this.g.setVisible(this.on);
    this.status.setVisible(this.on);
    if (!this.on) this.texts.forEach((t) => t.setVisible(false));
  }

  /** Dòng trạng thái lượt đua ở góc trên (chỉ hiện khi bật debug). */
  setStatus(line) {
    if (this.on) this.status.setText(line);
  }

  begin() {
    if (this.on) this.g.clear();
  }

  /** Vẽ cho một nhân vật: vùng nhìn trước trên làn đích và nhãn dodgeSkill (đã tính trừ boost). */
  racer(r, cam, x, y, s) {
    if (!this.on) return;
    const g = this.g;
    const f = cam.focal;
    const ahead = nominalSpeed(r) * CONFIG.lookAheadSeconds;
    const sNear = scaleAt(r.dist - cam.z0, f);
    const sFar = scaleAt(r.dist + ahead - cam.z0, f);
    const lx = laneCenter(r.targetLane);
    const half = laneWidthPx() * 0.5 * 0.9;
    const alpha = r.stun > 0 ? 0.12 : 0.18;
    g.fillStyle(r.plan || r.waitFor ? 0xffc21a : 0x35e0ff, alpha);
    g.beginPath();
    g.moveTo(screenX(lx, sNear) - half * sNear, screenY(sNear));
    g.lineTo(screenX(lx, sFar) - half * sFar, screenY(sFar));
    g.lineTo(screenX(lx, sFar) + half * sFar, screenY(sFar));
    g.lineTo(screenX(lx, sNear) + half * sNear, screenY(sNear));
    g.closePath();
    g.fillPath();

    let t = this.texts.get(r);
    if (!t) {
      t = this.scene.add
        .text(0, 0, '', { fontFamily: 'monospace', fontStyle: 'bold', fontSize: '30px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 6, y: 2 } })
        .setOrigin(0.5, 1)
        .setDepth(901);
      this.texts.set(r, t);
    }
    const skill = r.stats.dodgeSkill - (r.boost > 0 ? CONFIG.boostDodgePenalty : 0);
    const state = r.stun > 0 ? ' choáng' : r.jump > 0 ? ' nhảy' : r.waitFor ? ' chờ' : r.plan ? ' né' : '';
    t.setVisible(true)
      .setText(`${skill.toFixed(2).replace('.', ',')}${state}`)
      .setPosition(x, y - CONFIG.runnerHeight * s - 12 * s)
      .setScale(Math.max(0.5, s * 1.6));
  }

  hide(r) {
    this.texts.get(r)?.setVisible(false);
  }
}
