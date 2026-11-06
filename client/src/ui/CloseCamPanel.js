import { CONFIG } from '../config.js';
import { ObstacleViews } from '../entities/ObstacleViews.js';
import { BADGE_SIZE, BADGE_Y, SHADOW_Y } from '../entities/RacerView.js';
import { drawRoad } from '../entities/roadDrawing.js';
import { SKINS, TEX_H } from '../entities/skins.js';
import { laneCenter, makeViewport, project } from '../systems/Projection.js';
import { shortName } from '../systems/JoinMessage.js';

const FONT = '"Segoe UI", Arial, sans-serif';
const MAX_NEARBY = 12; // số nhân vật tối đa vẽ trong một cửa sổ
const AHEAD_UNITS = 140; // chỉ vẽ nhân vật trong tầm này phía trước camera
const ROAD_SEGMENTS = 70;
const ROAD_MIN_SCALE = 0.1;
const CORNER = 22;
const SKY = 0x5aa4ff;

// Nhân vật thu nhỏ trong cửa sổ cận: bóng, thân theo skin, huy hiệu avatar.
class MiniRacer {
  constructor(scene, container) {
    this.shadow = scene.add.image(0, SHADOW_Y, 'shadow');
    this.body = scene.add.image(0, 0, SKINS[0].key).setOrigin(0.5, 1);
    this.badge = scene.add.image(0, BADGE_Y, 'avatar_default_0').setDisplaySize(BADGE_SIZE, BADGE_SIZE);
    this.root = scene.add.container(0, 0, [this.shadow, this.body, this.badge]).setVisible(false);
    container.add(this.root);
  }

  set(racer, avatarKey) {
    this.body.setTexture(SKINS[racer.skinIndex].key);
    this.badge.setTexture(avatarKey);
  }
}

// Các cửa sổ camera cận ở cột phải, dưới bảng Top 10, xếp dọc. Mỗi cửa sổ có camera và phối cảnh riêng
// (zoom gần, thấy chướng ngại sắp tới), vẽ trong một Container được cắt bo góc bằng mask.
export class CloseCamPanel {
  constructor(scene, avatars) {
    this.scene = scene;
    this.avatars = avatars;
    this.avatarKeys = new WeakMap(); // nhân vật -> khóa texture avatar hiện có
    this.point = { x: 0, y: 0, s: 0 };
    this.windows = Array.from({ length: CONFIG.maxCloseCams }, (_, i) => this.makeWindow(i));
  }

  makeWindow(index) {
    const { scene } = this;
    const { x, y, w, h, gap } = CONFIG.closeCamWindow;
    const top = y + index * (h + gap);
    const vp = makeViewport({ w, h, horizonY: h * CONFIG.closeCamHorizon, roadHalfWidth: CONFIG.closeCamRoadHalfWidth });

    const content = scene.add.container(x, top).setDepth(800).setVisible(false);
    const sky = scene.add.rectangle(w / 2, h / 2, w, h, SKY).setDepth(-100);
    const roadG = scene.add.graphics().setDepth(1);
    const obstacles = new ObstacleViews(scene, null, { container: content, vp, poolSize: 8, minScale: 0.12 });
    const sprites = Array.from({ length: MAX_NEARBY }, () => new MiniRacer(scene, content));
    const marker = scene.add.graphics().setDepth(500);
    const band = scene.add.rectangle(w / 2, 20, w, 40, 0x0a0a30, 0.6).setDepth(9999);
    content.add([sky, roadG, marker, band]);

    // Cắt bo góc
    const maskG = scene.make.graphics({ add: false });
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRoundedRect(x, top, w, h, CORNER);
    content.setMask(maskG.createGeometryMask());

    // Viền vàng và chữ nằm ngoài mask
    const frame = scene.add.graphics().setDepth(801).setVisible(false);
    frame.lineStyle(6, 0xffc21a, 1);
    frame.strokeRoundedRect(x, top, w, h, CORNER);
    const textStyle = { fontFamily: FONT, fontStyle: 'bold', fontSize: '24px', color: '#ffffff', stroke: '#1b1450', strokeThickness: 4 };
    const name = scene.add.text(x + 16, top + 9, '', textStyle).setDepth(802).setVisible(false);
    const timer = scene.add.text(x + w - 16, top + 9, '', { ...textStyle, color: '#ffc21a' }).setOrigin(1, 0).setDepth(802).setVisible(false);

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
    win.frame.setVisible(on);
    win.name.setVisible(on);
    win.timer.setVisible(on);
    if (!on) win.bound = null;
  }

  updateWindow(win, target, manager, dt, secondsLeft) {
    // Camera bám nhân vật, mượt để khi bị đẩy lùi không giật
    if (win.bound !== target) {
      win.bound = target;
      win.last = target.dist;
      win.name.setText(shortName(target.nickname, 14));
    }
    win.last += (target.dist - win.last) * (1 - Math.exp(-CONFIG.closeCamSmooth * dt));
    const cam = win.cam;
    cam.focal = CONFIG.closeCamFocal;
    cam.z0 = win.last - cam.focal * (1 / CONFIG.closeCamBackScale - 1);
    win.timer.setText(Number.isFinite(secondsLeft) ? `${Math.ceil(secondsLeft)}s` : '');

    drawRoad(win.roadG, cam, win.vp, { maxSegments: ROAD_SEGMENTS, minScale: ROAD_MIN_SCALE });
    win.obstacles.update(manager.field, cam, manager.now);
    this.placeRacers(win, target, manager, cam);
    win.content.sort('depth');
  }

  // Nhân vật được theo dõi và những người ở gần trong tầm nhìn
  placeRacers(win, target, manager, cam) {
    const { vp, sprites, marker } = win;
    marker.clear();
    let used = 0;
    const put = (r) => {
      project(laneCenter(r.lane), r.dist, cam, this.point, vp);
      const { x, y, s } = this.point;
      if (s < ROAD_MIN_SCALE || s > 1.4 || used >= sprites.length) return;
      const sprite = sprites[used++];
      sprite.set(r, this.avatarKey(r));
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
        const top = y - hop - CONFIG.runnerHeight * s * vp.unit - 4;
        marker.fillStyle(0xffc21a, 1);
        marker.fillTriangle(x - 9, top - 16, x + 9, top - 16, x, top);
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

  avatarKey(racer) {
    let key = this.avatarKeys.get(racer);
    if (!key) {
      key = this.avatars.request(racer.userId, racer.avatarUrl, (k) => this.avatarKeys.set(racer, k));
      this.avatarKeys.set(racer, key);
    }
    return key;
  }
}
