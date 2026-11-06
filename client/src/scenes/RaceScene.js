import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { STR } from '../strings.js';
import { TrackView } from '../entities/TrackView.js';
import { RacerView } from '../entities/RacerView.js';
import { AvatarTextures } from '../entities/AvatarTextures.js';
import { SKINS } from '../entities/skins.js';
import { AvatarCache, loadImageFromUrl } from '../core/AvatarCache.js';
import { RaceCamera } from '../systems/RaceCamera.js';
import { laneCenter, project } from '../systems/Projection.js';
import { createRacer, resetRacer } from '../systems/Racer.js';
import { stepRacer } from '../systems/RacerAI.js';
import { rankRacers } from '../systems/Ranking.js';

const SAMPLE_RESTART_SECONDS = 3;
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
    this.finishedAt = null;

    const params = new URLSearchParams(location.search);
    this.perf = params.get('perf') === '1'; // ?perf=1: in thời gian vẽ đường và FPS ra console
    this.perfAcc = { n: 0, draw: 0, frame: 0 };
    const startDist = Number(params.get('start')) || 0; // ?start=5200 để thử ngay gần đích
    const count = Number(params.get('runners')) || CONFIG.sampleRunners; // ?runners=N

    RacerView.makeSharedTextures(this);
    this.avatars = new AvatarTextures(this, new AvatarCache(loadImageFromUrl));

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
    this.camera.snap(this.racers.map((r) => r.dist));
  }

  update(_time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.clock += dt;
    this.stepRace(dt);

    this.camera.update(this.racers.map((r) => r.dist), dt);
    const t0 = this.perf ? performance.now() : 0;
    this.track.draw(this.camera);
    if (this.perf) this.logPerf(performance.now() - t0, delta);

    this.placeViews();
  }

  stepRace(dt) {
    const ctx = { now: this.clock, cfg: CONFIG, rng: Math.random };
    for (const r of this.racers) stepRacer(r, dt, ctx);
    rankRacers(this.racers, this.ranking);

    // Mẫu: khi cả đoàn về đích thì chạy lại sau vài giây
    if (this.racers.every((r) => r.finished)) {
      this.finishedAt ??= this.clock;
      if (this.clock - this.finishedAt > SAMPLE_RESTART_SECONDS) {
        this.finishedAt = null;
        this.racers.forEach((r, i) => {
          resetRacer(r, i);
          r.dist += this.startDist;
        });
        this.camera.snap(this.racers.map((r) => r.dist));
      }
    }
  }

  placeViews() {
    const { topNamesShown } = CONFIG;
    this.racers.forEach((r, i) => {
      const view = this.views[i];
      project(laneCenter(r.lane), r.dist, this.camera, this.point);
      const { x, y, s } = this.point;
      // Ngoài tầm nhìn (quá xa hoặc đã ra sau camera) thì ẩn cho nhẹ
      const visible = s >= CONFIG.minDrawScale && s <= 1.4;
      view.setVisible(visible);
      if (!visible) return;
      view.setCrown(r.rank === 1);
      view.setNameVisible(r.rank <= topNamesShown);
      view.place(x, y, s, this.clock * 14 + i * 1.3, 10 + r.dist / 1000);
    });
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
