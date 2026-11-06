import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { TrackView } from '../entities/TrackView.js';
import { RunnerView } from '../entities/RunnerView.js';
import { RaceCamera } from '../systems/RaceCamera.js';
import { laneCenter, project } from '../systems/Projection.js';

const SAMPLE_RESTART_SECONDS = 3;

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('RaceScene');
  }

  create() {
    this.track = new TrackView(this);
    this.camera = new RaceCamera();
    this.point = { x: 0, y: 0, s: 0 };

    // Nhân vật mẫu: số lượng chỉnh bằng ?runners=N để thử camera ôm cả đoàn
    const params = new URLSearchParams(location.search);
    const count = Number(params.get('runners')) || CONFIG.sampleRunners;
    this.perf = params.get('perf') === '1'; // ?perf=1: in thời gian vẽ đường và FPS ra console
    this.perfAcc = { n: 0, draw: 0, frame: 0 };
    this.startDist = Number(params.get('start')) || 0; // ?start=5200 để thử ngay gần đích
    this.runners = Array.from({ length: count }, (_, i) => this.makeRunner(i));
    this.finishedAt = null;
    this.clock = 0;
    this.camera.snap(this.runners.map((r) => r.dist));
  }

  makeRunner(i) {
    const lane = i % CONFIG.lanes;
    return {
      view: new RunnerView(this, `Mẫu ${i + 1}`),
      dist: this.startDist,
      lane,
      targetLane: lane,
      nextSwitch: 1 + Math.random() * 3,
      speed: CONFIG.speedMin + Math.random() * (CONFIG.speedMax - CONFIG.speedMin),
      finished: false,
    };
  }

  update(_time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.clock += dt;
    this.stepSample(dt);

    this.camera.update(this.runners.map((r) => r.dist), dt);
    const t0 = this.perf ? performance.now() : 0;
    this.track.draw(this.camera);
    if (this.perf) this.logPerf(performance.now() - t0, delta);

    for (const r of this.runners) {
      project(laneCenter(0) + r.lane, r.dist, this.camera, this.point);
      r.view.place(this.point.x, this.point.y, this.point.s, this.clock * 14 + r.speed, 10 + r.dist / 1000);
    }
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

  // Chạy mẫu: tự đổi làn ngẫu nhiên, dừng ở vạch đích rồi chạy lại sau vài giây
  stepSample(dt) {
    for (const r of this.runners) {
      if (r.finished) continue;
      r.dist = Math.min(CONFIG.trackLength, r.dist + r.speed * dt);
      r.nextSwitch -= dt;
      if (r.nextSwitch <= 0) {
        r.targetLane = Math.floor(Math.random() * CONFIG.lanes);
        r.nextSwitch = 2 + Math.random() * 3;
      }
      r.lane += (r.targetLane - r.lane) * (1 - Math.exp(-4 * dt));
      if (r.dist >= CONFIG.trackLength) r.finished = true;
    }
    if (this.runners.every((r) => r.finished)) {
      this.finishedAt ??= this.clock;
      if (this.clock - this.finishedAt > SAMPLE_RESTART_SECONDS) {
        this.finishedAt = null;
        this.runners.forEach((r) => Object.assign(r, { dist: this.startDist, finished: false }));
        this.camera.snap(this.runners.map((r) => r.dist));
      }
    }
  }
}
