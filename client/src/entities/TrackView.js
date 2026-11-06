import { CONFIG } from '../config.js';
import { THEME } from '../theme.js';
import { ART, ATLAS } from './art.js';
import { drawRoad } from './roadDrawing.js';
import { drawRoadside } from './roadside.js';
import { FinishGate } from './FinishGate.js';

// Khinh khí cầu và mây trên trời: [khung, x, y, độ rộng hiển thị, độ trôi, pha]
const BALLOONS = [
  ['balloon_pink', 830, 100, 96, 8, 0],
  ['balloon_blue', 950, 200, 132, 10, 1.7],
  ['balloon_purple', 165, 235, 104, 9, 3.1],
  ['balloon_pink', 690, 520, 56, 6, 4.4],
];
// [khung, x, y, độ rộng hiển thị, tốc độ trôi ngang (px/giây), pha nhấp nhô]. Lớp xa nhỏ và chậm, lớp gần lớn và nhanh.
const CLOUDS = [
  ['cloud_2', 120, 560, 200, 4, 4],
  ['cloud_0', 960, 575, 190, 5, 1],
  ['cloud_1', 560, 470, 230, 6, 2.4],
  ['cloud_0', 70, 330, 320, 11, 0],
  ['cloud_1', 1010, 410, 350, 13, 2],
  ['cloud_2', 520, 250, 300, 9, 5],
];
const CLOUD_MARGIN = 260; // mây ra khỏi mép bấy nhiêu px thì quay lại phía bên kia

// Vẽ nền trời, mây, khinh khí cầu, núi sương mờ, mặt đường phối cảnh, vạch kẻ làn, dải viền và cổng đích.
// Phần tĩnh (trời, núi) tạo một lần; mây và khinh khí cầu trôi nhẹ; đường, viền vẽ lại mỗi frame.
export class TrackView {
  constructor(scene) {
    this.scene = scene;
    this.makeSky();
    this.clouds = CLOUDS.map((c) => this.addSky(c, -9.6 + c[3] / 10000));
    this.balloons = BALLOONS.map((b) => this.addSky(b, -9.4));
    scene.add.image(0, CONFIG.horizonY + 44, ATLAS, 'mountains').setOrigin(0, 1).setScale(ART).setDepth(-9);
    this.road = scene.add.graphics().setDepth(1);
    this.gate = new FinishGate(scene);
    this.makeFog();
  }

  makeSky() {
    const { width, horizonY } = CONFIG;
    if (!this.scene.textures.exists('sky')) {
      const { skyTop, skyMid, skyLow } = THEME.colors;
      const tex = this.scene.textures.createCanvas('sky', 4, horizonY);
      const ctx = tex.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
      grad.addColorStop(0, skyTop);
      grad.addColorStop(0.55, skyMid);
      grad.addColorStop(1, skyLow);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 4, horizonY);
      tex.refresh();
    }
    this.scene.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(width, horizonY + 2).setDepth(-10);
  }

  addSky([frame, x, y, w, drift, phase], depth) {
    const img = this.scene.add.image(x, y, ATLAS, frame).setDepth(depth);
    img.setScale(w / img.width); // độ rộng hiển thị w (px)
    return { img, x, y, drift, phase, w, speed: drift };
  }

  // Sương mờ ở chân trời: đậm nhất đúng đường chân trời, nhạt dần lên và xuống
  makeFog() {
    const { scene } = this;
    const H = 360;
    if (!scene.textures.exists('fog')) {
      const tex = scene.textures.createCanvas('fog', 4, H);
      const ctx = tex.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(214,226,255,0)');
      grad.addColorStop(0.46, 'rgba(214,226,255,0.9)');
      grad.addColorStop(1, 'rgba(214,226,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 4, H);
      tex.refresh();
    }
    scene.add.image(0, CONFIG.horizonY - H * 0.46, 'fog').setOrigin(0).setDisplaySize(CONFIG.width, H).setDepth(2.5);
  }

  draw(cam, clock = 0) {
    drawRoad(this.road, cam);
    drawRoadside(this.road, cam);
    this.gate.draw(cam, clock);
    // Mây trôi chậm theo chiều ngang và quay vòng; khinh khí cầu lơ lửng, nhấp nhô nhẹ
    const span = CONFIG.width + CLOUD_MARGIN * 2;
    for (const c of this.clouds) {
      const x = ((((c.x + CLOUD_MARGIN + clock * c.speed) % span) + span) % span) - CLOUD_MARGIN;
      c.img.setPosition(x, c.y + Math.sin(clock * 0.3 + c.phase) * 4);
    }
    for (const b of this.balloons) b.img.setPosition(b.x + Math.sin(clock * 0.25 + b.phase) * b.drift * 2, b.y + Math.sin(clock * 0.6 + b.phase) * b.drift);
  }
}
