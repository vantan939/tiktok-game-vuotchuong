import { CONFIG } from '../config.js';
import { ObstacleViews } from '../entities/ObstacleViews.js';
import { ART, ATLAS } from '../entities/art.js';
import { SHADOW_Y } from '../entities/RacerView.js';
import { drawRoad } from '../entities/roadDrawing.js';
import { SKINS, TEX_H } from '../entities/skins.js';
import { laneCenter, makeViewport, project } from '../systems/Projection.js';
import { shortName } from '../systems/JoinMessage.js';
import { createFrame, el } from './hud/Frame.js';

const MAX_NEARBY = 12; // số nhân vật tối đa vẽ trong một cửa sổ
const AHEAD_UNITS = 140; // chỉ vẽ nhân vật trong tầm này phía trước camera
const ROAD_SEGMENTS = 70;
const ROAD_MIN_SCALE = 0.1;
const CORNER = 26;
const SKY = 0x5aa4ff;

// Nhân vật thu nhỏ trong cửa sổ cận: bóng và thân theo skin (hình từ atlas).
class MiniRacer {
  constructor(scene, container) {
    this.shadow = scene.add.image(0, SHADOW_Y, ATLAS, 'shadow').setScale(ART * 1.2);
    this.body = scene.add.image(0, 0, ATLAS, SKINS[0].frame).setOrigin(0.5, 1).setScale(ART);
    this.root = scene.add.container(0, 0, [this.shadow, this.body]).setVisible(false);
    container.add(this.root);
  }

  set(racer) {
    this.body.setTexture(ATLAS, SKINS[racer.skinIndex].frame);
  }
}

// Các cửa sổ camera cận ở cột phải, dưới bảng Top 10, xếp dọc. Mỗi cửa sổ có camera và phối cảnh riêng
// (zoom gần, thấy chướng ngại sắp tới), vẽ trong một Container được cắt bo góc bằng mask.
// Viền vàng, vầng sáng, tên và đồng hồ là HTML phủ lên (component Frame).
export class CloseCamPanel {
  constructor(scene, hudParent) {
    this.scene = scene;
    this.point = { x: 0, y: 0, s: 0 };
    this.windows = Array.from({ length: CONFIG.maxCloseCams }, (_, i) => this.makeWindow(i, hudParent));
  }

  makeWindow(index, hudParent) {
    const { scene } = this;
    const { x, y, w, h, gap } = CONFIG.closeCamWindow;
    const top = y + index * (h + gap);
    const vp = makeViewport({ w, h, horizonY: h * CONFIG.closeCamHorizon, roadHalfWidth: CONFIG.closeCamRoadHalfWidth });

    const content = scene.add.container(x, top).setDepth(800).setVisible(false);
    const sky = scene.add.rectangle(w / 2, h / 2, w, h, SKY).setDepth(-100);
    const roadG = scene.add.graphics().setDepth(1);
    const obstacles = new ObstacleViews(scene, null, { container: content, vp, poolSize: 8, minScale: 0.12 });
    const sprites = Array.from({ length: MAX_NEARBY }, () => new MiniRacer(scene, content));
    const marker = scene.add.image(0, 0, ATLAS, 'icon_star').setScale(ART * 0.55).setDepth(500).setVisible(false);
    const band = scene.add.rectangle(w / 2, 22, w, 44, 0x0a0a30, 0.55).setDepth(9999);
    content.add([sky, roadG, marker, band]);

    // Cắt bo góc
    const maskG = scene.make.graphics({ add: false });
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRoundedRect(x, top, w, h, CORNER);
    content.setMask(maskG.createGeometryMask());

    // Viền, vầng sáng, tên, đồng hồ (HTML)
    const frame = createFrame({ variant: 'clear', className: 'camframe', rect: { x, y: top, w, h } });
    const name = el('div', 'camframe__name');
    const timer = el('div', 'camframe__time');
    frame.append(name, timer);
    frame.style.display = 'none';
    hudParent.append(frame);

    return { vp, content, roadG, obstacles, sprites, marker, frame, name, timer, cam: { z0: 0, focal: CONFIG.closeCamFocal }, last: 0, bound: null, shown: false };
  }

  /** cams là CloseCams; manager cho đoàn đua và chướng ngại. Gọi mỗi frame. */
  update(cams, manager, dt) {
    this.windows.forEach((win, i) => {
      const entry = cams.cams[i];
      if (!entry) {
        this.setShown(win, false);
        return;
      }
      this.setShown(win, true);
      this.updateWindow(win, entry.racer, manager, dt, cams.secondsLeft(entry, manager.now));
    });
  }

  setShown(win, on) {
    if (win.shown === on) return;
    win.shown = on;
    win.content.setVisible(on);
    win.frame.style.display = on ? '' : 'none';
    if (!on) win.bound = null;
  }

  updateWindow(win, target, manager, dt, secondsLeft) {
    // Camera bám nhân vật, mượt để khi bị đẩy lùi không giật
    if (win.bound !== target) {
      win.bound = target;
      win.last = target.dist;
      win.name.textContent = shortName(target.nickname, 14);
    }
    win.last += (target.dist - win.last) * (1 - Math.exp(-CONFIG.closeCamSmooth * dt));
    const cam = win.cam;
    cam.focal = CONFIG.closeCamFocal;
    cam.z0 = win.last - cam.focal * (1 / CONFIG.closeCamBackScale - 1);
    const timeText = Number.isFinite(secondsLeft) ? `${Math.ceil(secondsLeft)}s` : '';
    if (win.timer.textContent !== timeText) win.timer.textContent = timeText;

    drawRoad(win.roadG, cam, win.vp, { maxSegments: ROAD_SEGMENTS, minScale: ROAD_MIN_SCALE });
    win.obstacles.update(manager.field, cam, manager.now);
    this.placeRacers(win, target, manager, cam);
    win.content.sort('depth');
  }

  // Nhân vật được theo dõi và những người ở gần trong tầm nhìn
  placeRacers(win, target, manager, cam) {
    const { vp, sprites, marker } = win;
    marker.setVisible(false);
    let used = 0;
    const put = (r) => {
      project(laneCenter(r.lane), r.dist, cam, this.point, vp);
      const { x, y, s } = this.point;
      if (s < ROAD_MIN_SCALE || s > 1.4 || used >= sprites.length) return;
      const sprite = sprites[used++];
      sprite.set(r);
      const k = (CONFIG.runnerHeight / TEX_H) * s * vp.unit;
      const clock = manager.now;
      let hop = Math.abs(Math.sin(clock * 14 + r.skinIndex)) * 18 * k;
      let wobble = 0;
      if (r.stun > 0) {
        hop = 0;
        wobble = Math.sin(clock * 22) * 9;
      } else if (r.jump > 0) {
        hop = Math.sin(Math.PI * (1 - r.jump / CONFIG.jumpSeconds)) * CONFIG.jumpHeight * s * vp.unit;
      }
      sprite.root.setVisible(true).setPosition(x, y - hop).setScale(k).setAngle(wobble).setDepth(10 + r.dist / 1000);
      sprite.shadow.y = SHADOW_Y + hop / k;
      if (r === target) {
        // Mũi tên vàng đánh dấu người đang theo dõi
        const top = y - hop - CONFIG.runnerHeight * s * vp.unit - 6;
        marker.setVisible(true).setPosition(x, top - 8 + Math.sin(manager.now * 6) * 3);
      }
    };
    put(target);
    const zMax = cam.z0 + AHEAD_UNITS;
    for (const r of manager.racers) {
      if (r === target || r.dist < cam.z0 || r.dist > zMax) continue;
      put(r);
    }
    for (let i = used; i < sprites.length; i++) sprites[i].root.setVisible(false);
  }
}
