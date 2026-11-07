import { CONFIG } from '../config.js';
import { ART, ATLAS } from './art.js';
import { hammerLift, hammerPhaseAt, hitReach, spikeDist } from '../systems/Obstacles.js';
import { MAIN_VIEWPORT, depthForDist, laneCenter, laneWidthPx, project, screenX, screenY, scaleAt } from '../systems/Projection.js';

const HEAD_H = 150;
const LIFT_PX = 400; // độ cao đầu búa khi nâng hết cỡ (px thiết kế tại s = 1); cao hơn nhân vật nên chạy dưới búa không bị cắt ngang

// Vẽ búa đập và cầu gai. Dùng pool view cố định: mỗi frame gán cho các chướng ngại gần camera nhất.
// Vùng đỏ cảnh báo vẽ trên mặt đường bằng một Graphics chung.
// Dùng cho màn hình chính hoặc cho một cửa sổ camera cận (truyền container + vp + poolSize nhỏ hơn).
export class ObstacleViews {
  /**
   * onImpact(x, y, s): gọi lúc búa chạm sàn (để rung màn hình và tung bụi), có thể bỏ trống.
   * options.container: đặt các hình vào Container này thay vì thẳng vào scene (cửa sổ camera cận).
   */
  constructor(scene, onImpact, { container = null, vp = MAIN_VIEWPORT, poolSize = CONFIG.obstaclePoolSize, minScale = CONFIG.obstacleMinScale } = {}) {
    this.scene = scene;
    this.onImpact = onImpact;
    this.container = container;
    this.vp = vp;
    this.minScale = minScale;
    this.zoneG = scene.add.graphics().setDepth(1.5);
    container?.add(this.zoneG);
    this.pool = Array.from({ length: poolSize }, () => this.makeView());
    this.point = { x: 0, y: 0, s: 0 };
  }

  makeView() {
    const { scene } = this;
    const shadow = scene.add.image(0, 0, ATLAS, 'shadow').setScale(ART * 1.1);
    const handle = scene.add.image(0, 0, ATLAS, 'hammer_handle').setOrigin(0.5, 1).setScale(ART, ART * 0.5);
    const head = scene.add.image(0, 0, ATLAS, 'hammer_head').setOrigin(0.5, 1).setScale(ART);
    const ball = scene.add.image(0, 0, ATLAS, 'spike_ball').setOrigin(0.5, 0.88).setScale(ART);
    const root = scene.add.container(0, 0, [shadow, handle, head, ball]).setVisible(false);
    this.container?.add(root);
    return { root, shadow, handle, head, ball, lastCycle: -1, o: null };
  }

  /** Cập nhật mọi chướng ngại gần camera. clock là giây của game. */
  update(field, cam, now) {
    const g = this.zoneG;
    g.clear();
    let used = 0;
    for (let i = field.indexAfter(cam.z0 - cam.focal * 0.3); i < field.list.length && used < this.pool.length; i++) {
      const o = field.list[i];
      const dist = o.type === 'spike' ? spikeDist(o, now) : o.dist;
      const s = scaleAt(dist - cam.z0, cam.focal);
      if (s < this.minScale) break; // đã quá xa, các hàng sau còn xa hơn
      const view = this.pool[used++];
      project(laneCenter(o.lane), dist, cam, this.point, this.vp);
      const { x, y } = this.point;
      view.root.setVisible(true).setPosition(x, y).setScale(s * this.vp.unit).setDepth(depthForDist(dist) - 0.0001); // ngang hàng thì nhân vật nằm trên
      if (o.type === 'hammer') this.updateHammer(view, o, now, cam, x, y, s);
      else this.updateSpike(view, dist, now);
    }
    for (let i = used; i < this.pool.length; i++) this.pool[i].root.setVisible(false);
  }

  updateHammer(view, o, now, cam, x, y, s) {
    const lift = hammerLift(o, now);
    const phase = hammerPhaseAt(o, now);
    const headY = -lift * LIFT_PX;
    view.ball.setVisible(false);
    view.head.setVisible(true).setPosition(0, headY);
    view.handle.setVisible(true).setPosition(0, headY - HEAD_H * 0.8);
    view.shadow.setVisible(true).setPosition(0, -8).setScale(ART * (1.3 - lift * 0.5), ART);
    view.shadow.setAlpha(0.35 + 0.4 * (1 - lift));

    if (phase !== 'up') this.drawZone(o, cam, now, phase);

    // Vừa chạm sàn: rung màn hình và tung bụi (mỗi chu kỳ một lần)
    const cycle = Math.floor((now + o.phase) / CONFIG.hammerCycleSeconds);
    if (phase === 'impact' && view.lastCycle !== cycle) {
      view.lastCycle = cycle;
      this.onImpact?.(x, y, s);
    }
  }

  updateSpike(view, dist, now) {
    view.head.setVisible(false);
    view.handle.setVisible(false);
    view.ball.setVisible(true).setPosition(0, -4).setRotation(dist * 0.06);
    view.shadow.setVisible(true).setPosition(0, -8).setScale(ART * 0.85, ART).setAlpha(0.5);
  }

  // Vùng đỏ cảnh báo trên mặt đường dưới búa, nhấp nháy dần khi sắp đập
  drawZone(o, cam, now, phase) {
    const f = cam.focal;
    const half = hitReach(o); // đúng bằng vùng gây dính, đứng ngoài vùng đỏ thì không bao giờ bị đập
    const sNear = scaleAt(o.dist - half - cam.z0, f);
    const sFar = scaleAt(o.dist + half - cam.z0, f);
    if (sFar < this.minScale) return;
    const vp = this.vp;
    const lw = laneWidthPx(vp) * 0.5 * 0.94;
    const cx = laneCenter(o.lane);
    const xl = (a, s) => screenX(cx, s, vp) + a * lw * s; // a = -1 mép trái, +1 mép phải của làn
    const yN = screenY(sNear, vp);
    const yF = screenY(sFar, vp);
    const u = ((now + o.phase) % CONFIG.hammerCycleSeconds + CONFIG.hammerCycleSeconds) % CONFIG.hammerCycleSeconds;
    const progress = phase === 'impact' ? 1 : Math.max(0, Math.min(1, (u - (CONFIG.hammerImpactAt - o.warn)) / o.warn));
    const blink = phase === 'impact' ? 1 : 0.6 + 0.4 * Math.sin(progress * progress * 40);
    const g = this.zoneG;
    g.fillStyle(0xff2a2a, (0.22 + 0.4 * progress) * blink);
    g.beginPath();
    g.moveTo(xl(-1, sNear), yN);
    g.lineTo(xl(-1, sFar), yF);
    g.lineTo(xl(1, sFar), yF);
    g.lineTo(xl(1, sNear), yN);
    g.closePath();
    g.fillPath();
    g.lineStyle(Math.max(1.5, 6 * vp.unit * sNear), 0xff7a7a, 0.8 * blink);
    g.strokePath();
  }
}
