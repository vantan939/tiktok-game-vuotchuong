import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { STR } from '../strings.js';
import { TrackView } from '../entities/TrackView.js';
import { RacerView } from '../entities/RacerView.js';
import { ObstacleViews } from '../entities/ObstacleViews.js';
import { Effects } from '../entities/Effects.js';
import { ResultFx } from '../entities/ResultFx.js';
import { SKINS } from '../entities/skins.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';
import { createHudRoot } from '../ui/hud/root.js';
import { Hud } from '../ui/hud/Hud.js';
import { GiftBanner, NameTags, RoundOverlay, Toasts } from '../ui/hud/Overlays.js';
import { buildHudModel } from '../systems/HudModel.js';
import { isMock } from '../systems/mockData.js';
import { applyMock, mockHudModel, seedMockLobby } from './mockMode.js';
import { joinMessage } from '../systems/JoinMessage.js';
import { camMessage } from '../systems/CamMessage.js';
import { CloseCams } from '../systems/CloseCams.js';
import { CloseCamPanel } from '../ui/CloseCamPanel.js';
import { LikeBoost } from '../systems/LikeBoost.js';
import { Hearts } from '../entities/Hearts.js';
import { SpeedRays } from '../entities/SpeedRays.js';
import { GiftBoost } from '../systems/GiftBoost.js';
import { shortName } from '../systems/JoinMessage.js';
import { CommandRouter } from '../systems/CommandRouter.js';
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
    // ?speed=N (chạy nhanh N lần), ?round=N (độ dài lượt, giây), ?hold=result (dừng ở trạng thái đó sau 3 giây để xem), ?avatars=1 (thử avatar), ?bots=N (số người tối thiểu, còn lại thiếu thì bot), ?perf=1 (in thời gian vẽ), ?mock=1 (cảnh đóng băng đúng như mockup để so sánh)
    const params = new URLSearchParams(location.search);
    this.perf = params.get('perf') === '1';
    this.perfAcc = { n: 0, draw: 0, frame: 0 };
    this.speed = Math.max(1, Number(params.get('speed')) || 1);
    this.hold = params.get('hold');
    this.mock = null; // được đặt khi ?mock=1
    this.mockScale = new Map(); // nhân vật -> hệ số kích thước phụ (chỉ ở ?mock=1)
    const mockOn = isMock();

    RacerView.makeSharedTextures(this);
    this.effects = new Effects(this);
    this.hearts = new Hearts(this);
    this.rays = new SpeedRays(this);
    this.obstacleViews = new ObstacleViews(this, (x, y, s) => this.onHammerImpact(x, y, s));
    this.debug = new DebugOverlay(this);
    this.resultFx = new ResultFx(this);

    // HUD và các lớp chữ là HTML/CSS đặt chồng lên canvas
    const hudRoot = createHudRoot();
    this.nameTags = new NameTags(hudRoot, 4);
    this.hud = new Hud(hudRoot);
    this.hudTimer = 0;

    // Người thật giả lập cho tới khi có join thật (Task 8); không có thì toàn bot
    const botFillTo = params.has('bots') ? Number(params.get('bots')) : CONFIG.botFillTo; // ?bots=N: ít bot hơn cho dễ nhìn
    this.lobby = new Lobby({ cfg: { ...CONFIG, botFillTo }, botNames: STR.demoNames });
    if (mockOn) seedMockLobby(this.lobby);
    const useAvatars = params.get('avatars') === '1';
    for (let i = 0; i < (Number(params.get('players')) || 0); i++) {
      this.lobby.join({
        userId: `sample_${i}`,
        nickname: `Người ${i + 1}`,
        avatarUrl: useAvatars ? [TEST_AVATAR, BROKEN_AVATAR][i] ?? '' : '',
      });
    }
    // ?round=N: rút ngắn lượt đua (giây) để thử báo động hết giờ
    const roundSeconds = Number(params.get('round')) || CONFIG.roundSeconds;
    this.manager = new RaceManager(this.lobby, {
      cfg: { ...CONFIG, roundSeconds },
      skinCount: SKINS.length,
      startDist: Number(params.get('start')) || 0,
      onEvent: (e) => this.onGameEvent(e),
    });
    this.closeCams = new CloseCams(this.manager);
    this.closeCamPanel = new CloseCamPanel(this, hudRoot);
    this.toasts = new Toasts(hudRoot);
    this.overlay = new RoundOverlay(hudRoot);
    this.likeBoost = new LikeBoost(this.manager);
    this.giftBoost = new GiftBoost(this.manager);
    this.giftBanner = new GiftBanner(hudRoot);
    this.manager.begin();
    if (mockOn) applyMock(this);

    // Lệnh từ bình luận: join (vào đua) và s (bật/tắt camera cận của chính mình)
    const bus = this.registry.get('bus');
    if (bus) {
      this.router = new CommandRouter(bus);
      this.router.onCommand(({ command, user }) => (command === 'join' ? this.onJoin(user) : this.onCamCommand(user)));
      bus.on('like', (e) => this.likeBoost.handle(e)); // thả tim = tăng tốc
      bus.on('gift', (e) => this.giftBoost.handle(e)); // tặng quà = khiên + tăng tốc mạnh
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
    this.racers.forEach((r) => this.views.set(r, new RacerView(this, r)));
    this.camera.snap(this.collectDists());
  }

  // Người mới thế chỗ một bot trước lúc đua: đổi hình tương ứng
  swapView(added, removed) {
    if (removed) {
      this.views.get(removed)?.destroy();
      this.views.delete(removed);
    }
    this.views.set(added, new RacerView(this, added));
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
    if (!held && !this.mock) for (let i = 0; i < this.speed; i++) this.manager.update(dt);

    if (!this.mock) this.camera.update(this.collectDists(), dt);
    const t0 = this.perf ? performance.now() : 0;
    this.track.draw(this.camera, this.manager.now);
    this.obstacleViews.update(this.manager.field, this.camera, this.manager.now);
    if (this.perf) this.logPerf(performance.now() - t0, delta);

    this.placeViews();
    this.closeCams.update(this.manager.now);
    this.closeCamPanel.update(this.closeCams, this.manager, dt);
    this.hearts.update(dt);
    this.resultFx.update(this.manager, dt);
    this.overlay.update(this.manager);
    this.updateHud(dt);
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
    let rayTarget = null; // người đang boost mạnh và gần camera nhất
    this.racers.forEach((r, i) => {
      this.views.get(r).visible = false;
      const view = this.views.get(r);
      project(laneCenter(r.lane), r.dist, this.camera, this.point);
      const { x, y, s } = this.point;
      // Ngoài tầm nhìn (quá xa hoặc đã ra sau camera) thì ẩn cho nhẹ
      const visible = s >= CONFIG.minDrawScale && s <= 1.4;
      view.setVisible(visible);
      view.visible = visible;
      if (!visible) {
        this.debug.hide(r);
        return;
      }
      view.setCrown(racing && r.rank === 1);
      view.extraScale = this.mockScale.get(r);
      view.place(x, y, s, m.now * 14 + i * 1.3, 10 + r.dist / 1000, m.now);
      view.s = s;
      if (r.boost > 0 && s > 0.3 && (!rayTarget || s > rayTarget.s)) rayTarget = { x, y, s, power: Math.min(1, r.boost / 0.5) };
      this.debug.racer(r, this.camera, x, y, s);
    });

    this.rays.update(rayTarget, m.now);

    // Nhãn tên chỉ cho top N khi đang đua
    let tags = 0;
    if (racing) {
      const tagged = this.mock ? this.racers.filter((r) => this.mock.tagged.includes(r.nickname)) : m.ranking.slice(0, topNamesShown);
      for (const r of tagged) {
        const view = this.views.get(r);
        if (view?.visible) this.nameTags.show(tags++, r.nickname, view.top.x, view.top.y, view.s);
      }
    }
    this.nameTags.hideFrom(tags);
  }

  // Cập nhật HUD tám lần mỗi giây là đủ mượt, đỡ tốn DOM
  updateHud(dt) {
    this.hudTimer += dt;
    if (this.hudTimer < 0.12) return;
    this.hudTimer = 0;
    const model = buildHudModel(this.manager, this.lobby, this.closeCams);
    this.hud.update(this.mock ? mockHudModel(model) : model);
  }

  // Nhận tim: vài trái tim nhỏ bay lên trên đầu nhân vật (vệt tốc độ do RacerView vẽ khi đang boost)
  onBoost(e) {
    if (e.source === 'gift') {
      // Quà lớn: thông báo to giữa màn hình
      if (e.tier.announce) this.giftBanner.show(STR.giftAnnounce(shortName(e.senderName), e.gift.name));
      return;
    }
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
