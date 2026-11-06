import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { STR } from '../strings.js';
import { TrackView } from '../entities/TrackView.js';
import { RacerView } from '../entities/RacerView.js';
import { ObstacleViews } from '../entities/ObstacleViews.js';
import { Effects } from '../entities/Effects.js';
import { AvatarTextures } from '../entities/AvatarTextures.js';
import { SKINS } from '../entities/skins.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';
import { AvatarCache, loadImageFromUrl } from '../core/AvatarCache.js';
import { RaceCamera } from '../systems/RaceCamera.js';
import { laneCenter, project } from '../systems/Projection.js';
import { createRacer, resetRacer } from '../systems/Racer.js';
import { stepRacer } from '../systems/RacerAI.js';
import { rankRacers } from '../systems/Ranking.js';
import { generateObstacles } from '../systems/Obstacles.js';

const SAMPLE_RESTART_SECONDS = 3;
const SHAKE_MIN_SCALE = 0.22; // búa xa hơn mức này thì không rung màn hình
// Avatar thử cho ?avatars=1: một ảnh hợp lệ (data URL) và một url hỏng để kiểm tra ảnh mặc định
const TEST_AVATAR = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ffc21a"/><circle cx="32" cy="32" r="18" fill="#e0243c"/></svg>',
)}`;
const BROKEN_AVATAR = 'http://localhost:1/khong-ton-tai.png';

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('RaceScene');
  }

  create() {
    this.track = new TrackView(this);
    this.camera = new RaceCamera();
    this.point = { x: 0, y: 0, s: 0 };
    this.ranking = [];
    this.clock = 0;
    this.roundStart = 0;
    this.finishedAt = null;

    const params = new URLSearchParams(location.search);
    this.perf = params.get('perf') === '1'; // ?perf=1: in thời gian vẽ đường và FPS ra console
    this.perfAcc = { n: 0, draw: 0, frame: 0 };
    const startDist = Number(params.get('start')) || 0; // ?start=5200 để thử ngay gần đích
    const count = Number(params.get('runners')) || CONFIG.sampleRunners; // ?runners=N

    RacerView.makeSharedTextures(this);
    this.avatars = new AvatarTextures(this, new AvatarCache(loadImageFromUrl));
    this.effects = new Effects(this);
    this.obstacleViews = new ObstacleViews(this, (x, y, s) => this.onHammerImpact(x, y, s));
    this.debug = new DebugOverlay(this);
    this.field = generateObstacles();

    // 30 nhân vật mẫu cho tới khi có join thật (Task 8)
    const useAvatars = params.get('avatars') === '1';
    this.racers = Array.from({ length: count }, (_, i) => {
      const user = {
        userId: `sample_${i}`,
        nickname: STR.demoNames[i] ?? `Người ${i + 1}`,
        avatarUrl: useAvatars ? [TEST_AVATAR, BROKEN_AVATAR][i] ?? '' : '',
      };
      const racer = createRacer(user, { index: i, skinCount: SKINS.length });
      racer.dist += startDist;
      return racer;
    });
    this.startDist = startDist;
    this.views = this.racers.map((r) => new RacerView(this, r, this.avatars));
    this.dists = new Array(count);
    this.stepCtx = { now: 0, cfg: CONFIG, rng: Math.random, field: this.field, onHit: (r) => this.onRacerHit(r) };
    this.camera.snap(this.collectDists());
  }

  collectDists() {
    this.racers.forEach((r, i) => {
      this.dists[i] = r.dist;
    });
    return this.dists;
  }

  update(_time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.clock += dt;
    this.stepRace(dt);

    this.camera.update(this.collectDists(), dt);
    const t0 = this.perf ? performance.now() : 0;
    this.track.draw(this.camera);
    this.obstacleViews.update(this.field, this.camera, this.clock);
    if (this.perf) this.logPerf(performance.now() - t0, delta);

    this.placeViews();
  }

  stepRace(dt) {
    this.stepCtx.now = this.clock;
    for (const r of this.racers) stepRacer(r, dt, this.stepCtx);
    rankRacers(this.racers, this.ranking);

    // Mẫu: cả đoàn về đích hoặc hết giờ lượt thì chạy lại sau vài giây
    const over = this.racers.every((r) => r.finished) || this.clock - this.roundStart > CONFIG.roundSeconds;
    if (!over) return;
    this.finishedAt ??= this.clock;
    if (this.clock - this.finishedAt > SAMPLE_RESTART_SECONDS) this.restartSample();
  }

  restartSample() {
    this.finishedAt = null;
    this.roundStart = this.clock;
    this.field = generateObstacles();
    this.stepCtx.field = this.field;
    this.racers.forEach((r, i) => {
      resetRacer(r, i);
      r.dist += this.startDist;
    });
    this.camera.snap(this.collectDists());
  }

  placeViews() {
    const { topNamesShown } = CONFIG;
    this.debug.begin();
    this.racers.forEach((r, i) => {
      const view = this.views[i];
      project(laneCenter(r.lane), r.dist, this.camera, this.point);
      const { x, y, s } = this.point;
      // Ngoài tầm nhìn (quá xa hoặc đã ra sau camera) thì ẩn cho nhẹ
      const visible = s >= CONFIG.minDrawScale && s <= 1.4;
      view.setVisible(visible);
      if (!visible) {
        this.debug.hide(r);
        return;
      }
      view.setCrown(r.rank === 1);
      view.setNameVisible(r.rank <= topNamesShown);
      view.place(x, y, s, this.clock * 14 + i * 1.3, 10 + r.dist / 1000, this.clock);
      this.debug.racer(r, this.camera, x, y, s);
    });
  }

  // Nhân vật dính chướng ngại: bụi tung lên
  onRacerHit(r) {
    project(laneCenter(r.lane), r.dist + CONFIG.knockback, this.camera, this.point); // chỗ vừa va, trước khi bị đẩy lùi
    const { x, y, s } = this.point;
    if (s >= CONFIG.minDrawScale && s <= 1.4) this.effects.dust(x, y, s);
  }

  // Búa chạm sàn: rung nhẹ màn hình và bụi
  onHammerImpact(x, y, s) {
    if (s < SHAKE_MIN_SCALE) return;
    this.cameras.main.shake(120, 0.0025 + 0.003 * Math.min(1, s));
    this.effects.dust(x, y, s * 0.9);
  }

  logPerf(drawMs, frameMs) {
    const a = this.perfAcc;
    a.n++;
    a.draw += drawMs;
    a.frame += frameMs;
    if (a.frame < 2000) return;
    console.log(`[perf] vẽ đường ${(a.draw / a.n).toFixed(2)} ms, khung ${(a.frame / a.n).toFixed(1)} ms (${(1000 / (a.frame / a.n)).toFixed(0)} FPS)`);
    a.n = a.draw = a.frame = 0;
  }
}
