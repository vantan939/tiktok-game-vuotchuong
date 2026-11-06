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
import { RoundOverlay } from '../ui/RoundOverlay.js';
import { Toasts } from '../ui/Toasts.js';
import { joinMessage } from '../systems/JoinMessage.js';
import { camMessage } from '../systems/CamMessage.js';
import { CloseCams } from '../systems/CloseCams.js';
import { CloseCamPanel } from '../ui/CloseCamPanel.js';
import { LikeBoost } from '../systems/LikeBoost.js';
import { Hearts } from '../entities/Hearts.js';
import { CommandRouter } from '../systems/CommandRouter.js';
import { AvatarCache, loadImageFromUrl } from '../core/AvatarCache.js';
import { RaceCamera } from '../systems/RaceCamera.js';
import { laneCenter, project } from '../systems/Projection.js';
import { Lobby } from '../systems/Lobby.js';
import { RaceManager } from '../systems/RaceManager.js';

const SHAKE_MIN_SCALE = 0.22; // búa xa hơn mức này thì không rung màn hình
// Avatar thử cho ?avatars=1: một ảnh hợp lệ (data URL) và một url hỏng để kiểm tra ảnh mặc định
const TEST_AVATAR = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ffc21a"/><circle cx="32" cy="32" r="18" fill="#e0243c"/></svg>',
)}`;
const BROKEN_AVATAR = 'http://localhost:1/khong-ton-tai.png';

const STATE_LABEL = { wait: 'chờ', countdown: 'đếm ngược', race: 'đua', result: 'kết quả' };

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('RaceScene');
  }

  create() {
    this.track = new TrackView(this);
    this.camera = new RaceCamera();
    this.point = { x: 0, y: 0, s: 0 };
    this.dists = [];
    this.views = new Map(); // nhân vật -> hình

    // Tham số debug trên URL: ?players=N (người thật giả lập), ?start=N (xuất phát gần đích),
    // ?speed=N (chạy nhanh N lần), ?hold=result (dừng ở trạng thái đó sau 3 giây để xem), ?avatars=1 (thử avatar), ?bots=N (số người tối thiểu, còn lại thiếu thì bot), ?perf=1 (in thời gian vẽ)
    const params = new URLSearchParams(location.search);
    this.perf = params.get('perf') === '1';
    this.perfAcc = { n: 0, draw: 0, frame: 0 };
    this.speed = Math.max(1, Number(params.get('speed')) || 1);
    this.hold = params.get('hold');

    RacerView.makeSharedTextures(this);
    this.avatars = new AvatarTextures(this, new AvatarCache(loadImageFromUrl));
    this.effects = new Effects(this);
    this.hearts = new Hearts(this);
    this.obstacleViews = new ObstacleViews(this, (x, y, s) => this.onHammerImpact(x, y, s));
    this.debug = new DebugOverlay(this);
    this.overlay = new RoundOverlay(this, this.avatars);
    this.toasts = new Toasts(this);

    // Người thật giả lập cho tới khi có join thật (Task 8); không có thì toàn bot
    const botFillTo = params.has('bots') ? Number(params.get('bots')) : CONFIG.botFillTo; // ?bots=N: ít bot hơn cho dễ nhìn
    this.lobby = new Lobby({ cfg: { ...CONFIG, botFillTo }, botNames: STR.demoNames });
    const useAvatars = params.get('avatars') === '1';
    for (let i = 0; i < (Number(params.get('players')) || 0); i++) {
      this.lobby.join({
        userId: `sample_${i}`,
        nickname: `Người ${i + 1}`,
        avatarUrl: useAvatars ? [TEST_AVATAR, BROKEN_AVATAR][i] ?? '' : '',
      });
    }
    this.manager = new RaceManager(this.lobby, {
      skinCount: SKINS.length,
      startDist: Number(params.get('start')) || 0,
      onEvent: (e) => this.onGameEvent(e),
    });
    this.closeCams = new CloseCams(this.manager);
    this.closeCamPanel = new CloseCamPanel(this, this.avatars);
    this.likeBoost = new LikeBoost(this.manager);
    this.manager.begin();

    // Lệnh từ bình luận: join (vào đua) và s (bật/tắt camera cận của chính mình)
    const bus = this.registry.get('bus');
    if (bus) {
      this.router = new CommandRouter(bus);
      this.router.onCommand(({ command, user }) => (command === 'join' ? this.onJoin(user) : this.onCamCommand(user)));
      bus.on('like', (e) => this.likeBoost.handle(e)); // thả tim = tăng tốc
    }
  }

  onJoin(user) {
    this.toasts.show(joinMessage(this.manager.join(user), user.nickname));
  }

  onCamCommand(user) {
    const message = camMessage(this.closeCams.press(user), user.nickname);
    if (message) this.toasts.show(message);
  }

  onGameEvent(e) {
    if (e.type === 'round') this.buildViews();
    else if (e.type === 'racer') this.swapView(e.added, e.removed);
    else if (e.type === 'hit') this.onRacerHit(e.racer);
    else if (e.type === 'boost') this.onBoost(e);
  }

  // Lượt mới: dựng lại hình nhân vật theo đoàn đua mới và đặt camera về vạch xuất phát
  buildViews() {
    this.views.forEach((v) => v.destroy());
    this.views.clear();
    this.racers = this.manager.racers;
    this.racers.forEach((r) => this.views.set(r, new RacerView(this, r, this.avatars)));
    this.camera.snap(this.collectDists());
  }

  // Người mới thế chỗ một bot trước lúc đua: đổi hình tương ứng
  swapView(added, removed) {
    if (removed) {
      this.views.get(removed)?.destroy();
      this.views.delete(removed);
    }
    this.views.set(added, new RacerView(this, added, this.avatars));
  }

  collectDists() {
    this.dists.length = this.racers.length;
    this.racers.forEach((r, i) => {
      this.dists[i] = r.dist;
    });
    return this.dists;
  }

  update(_time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const held = this.hold && this.manager.state === this.hold && this.manager.stateTime >= 3;
    if (!held) for (let i = 0; i < this.speed; i++) this.manager.update(dt);

    this.camera.update(this.collectDists(), dt);
    const t0 = this.perf ? performance.now() : 0;
    this.track.draw(this.camera);
    this.obstacleViews.update(this.manager.field, this.camera, this.manager.now);
    if (this.perf) this.logPerf(performance.now() - t0, delta);

    this.placeViews();
    this.closeCams.update(this.manager.now);
    this.closeCamPanel.update(this.closeCams, this.manager, dt);
    this.hearts.update(dt);
    this.overlay.update(this.manager, dt);
    this.toasts.update(dt);
    this.debug.setStatus(this.statusLine());
  }

  statusLine() {
    const m = this.manager;
    const real = m.racers.filter((r) => !r.isBot).length;
    return `Lượt ${m.round} | ${STATE_LABEL[m.state]} ${m.stateTime.toFixed(1)}s | người thật ${real}, bot ${m.racers.length - real}, hàng đợi ${this.lobby.queue.length}`;
  }

  placeViews() {
    const { topNamesShown } = CONFIG;
    const m = this.manager;
    const racing = m.state === 'race' || m.state === 'result';
    this.debug.begin();
    this.racers.forEach((r, i) => {
      const view = this.views.get(r);
      project(laneCenter(r.lane), r.dist, this.camera, this.point);
      const { x, y, s } = this.point;
      // Ngoài tầm nhìn (quá xa hoặc đã ra sau camera) thì ẩn cho nhẹ
      const visible = s >= CONFIG.minDrawScale && s <= 1.4;
      view.setVisible(visible);
      if (!visible) {
        this.debug.hide(r);
        return;
      }
      view.setCrown(racing && r.rank === 1);
      view.setNameVisible(racing && r.rank <= topNamesShown);
      view.place(x, y, s, m.now * 14 + i * 1.3, 10 + r.dist / 1000, m.now);
      this.debug.racer(r, this.camera, x, y, s);
    });
  }

  // Nhận tim: vài trái tim nhỏ bay lên trên đầu nhân vật (vệt tốc độ do RacerView vẽ khi đang boost)
  onBoost(e) {
    if (e.source !== 'like' || e.seconds < 0.05) return;
    project(laneCenter(e.racer.lane), e.racer.dist, this.camera, this.point);
    const { x, y, s } = this.point;
    if (s < CONFIG.minDrawScale || s > 1.4) return;
    this.hearts.spawn(x, y - CONFIG.runnerHeight * s * 0.95, s, 1 + Math.min(2, Math.round(e.seconds * 2)));
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
