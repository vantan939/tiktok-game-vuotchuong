import { CONFIG } from '../config.js';
import { hammerLift, hammerPhaseAt, spikeDist } from '../systems/Obstacles.js';
import { MAIN_VIEWPORT, laneCenter, laneWidthPx, project, screenX, screenY, scaleAt } from '../systems/Projection.js';

const HEAD_W = 300;
const HEAD_H = 150;
const HANDLE_W = 46;
const HANDLE_H = 900;
const LIFT_PX = 560; // độ cao đầu búa khi nâng hết cỡ (px tại s = 1)
const BALL_SIZE = 230;

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
    this.makeTextures();
    this.zoneG = scene.add.graphics().setDepth(1.5);
    container?.add(this.zoneG);
    this.pool = Array.from({ length: poolSize }, () => this.makeView());
    this.point = { x: 0, y: 0, s: 0 };
  }

  makeTextures() {
    const { scene } = this;
    if (scene.textures.exists('hammer_head')) return;
    const g = scene.make.graphics({ add: false });

    // Đầu búa: hình trụ nằm ngang, hồng với hai đầu vàng
    g.fillStyle(0xd62d86, 1);
    g.fillRoundedRect(0, 0, HEAD_W, HEAD_H, 36);
    g.fillStyle(0xff4fa8, 1);
    g.fillRoundedRect(8, 6, HEAD_W - 16, HEAD_H - 40, 30);
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(34, 18, HEAD_W - 120, 22, 11);
    g.fillStyle(0xffc21a, 1);
    g.fillRoundedRect(0, 0, 58, HEAD_H, 28);
    g.fillRoundedRect(HEAD_W - 58, 0, 58, HEAD_H, 28);
    g.fillStyle(0xe08a00, 1);
    g.fillRect(54, 0, 6, HEAD_H);
    g.fillRect(HEAD_W - 60, 0, 6, HEAD_H);
    g.generateTexture('hammer_head', HEAD_W, HEAD_H);
    g.clear();

    // Cán búa vàng
    g.fillStyle(0xffc21a, 1);
    g.fillRect(0, 0, HANDLE_W, HANDLE_H);
    g.fillStyle(0xe08a00, 1);
    g.fillRect(HANDLE_W - 12, 0, 12, HANDLE_H);
    g.generateTexture('hammer_handle', HANDLE_W, HANDLE_H);
    g.clear();

    // Quả cầu gai đỏ hồng
    const c = BALL_SIZE / 2;
    g.fillStyle(0xf5f0e6, 1);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const x1 = c + Math.cos(a) * (c - 4);
      const y1 = c + Math.sin(a) * (c - 4);
      g.fillTriangle(c + Math.cos(a - 0.2) * (c * 0.62), c + Math.sin(a - 0.2) * (c * 0.62), c + Math.cos(a + 0.2) * (c * 0.62), c + Math.sin(a + 0.2) * (c * 0.62), x1, y1);
    }
    g.fillStyle(0xe0245b, 1);
    g.fillCircle(c, c, c * 0.68);
    g.fillStyle(0xff6b8f, 1);
    g.fillCircle(c - 18, c - 22, c * 0.3);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(c - 32, c - 38, 11);
    g.generateTexture('spike_ball', BALL_SIZE, BALL_SIZE);
    g.destroy();
  }

  makeView() {
    const { scene } = this;
    const shadow = scene.add.image(0, 0, 'shadow').setScale(1.1);
    const handle = scene.add.image(0, 0, 'hammer_handle').setOrigin(0.5, 1);
    const head = scene.add.image(0, 0, 'hammer_head').setOrigin(0.5, 1);
    const ball = scene.add.image(0, 0, 'spike_ball').setOrigin(0.5, 0.88);
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
      view.root.setVisible(true).setPosition(x, y).setScale(s * this.vp.unit).setDepth(10 + dist / 1000 - 0.0005);
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
    view.shadow.setVisible(true).setPosition(0, -8).setScale(1.3 - lift * 0.5, 1);
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
    view.shadow.setVisible(true).setPosition(0, -8).setScale(0.85, 1).setAlpha(0.5);
  }

  // Vùng đỏ cảnh báo trên mặt đường dưới búa, nhấp nháy dần khi sắp đập
  drawZone(o, cam, now, phase) {
    const f = cam.focal;
    const half = CONFIG.hammerHalfLength + 1;
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
