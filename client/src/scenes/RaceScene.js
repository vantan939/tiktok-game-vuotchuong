import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { viewer } from '../core/viewer.js';
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
import { FloatTexts, GiftBanner, NameTags, PauseBadge, RoundOverlay, Toasts } from '../ui/hud/Overlays.js';
import { buildHudModel } from '../systems/HudModel.js';
import { isMock } from '../systems/mockData.js';
import { applyMock, mockHudModel, seedMockLobby } from './mockMode.js';
import { joinMessage } from '../systems/JoinMessage.js';
import { LikeBoost } from '../systems/LikeBoost.js';
import { Hearts } from '../entities/Hearts.js';
import { SpeedRays } from '../entities/SpeedRays.js';
import { GiftBoost } from '../systems/GiftBoost.js';
import { FxDirector } from '../systems/FxDirector.js';
import { SoakLog } from '../core/SoakLog.js';
import { BackgroundTicker } from '../core/BackgroundTicker.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { Mc } from '../audio/Mc.js';
import { RemoteVoice } from '../audio/RemoteVoice.js';
import { NetDot } from '../ui/hud/NetDot.js';
import { reportError } from '../core/errorReport.js';
import { serverHttpUrl } from '../core/serverUrl.js';
import { DebugReporter, describeLobby } from '../core/debugReport.js';
import { McDirector } from '../systems/McDirector.js';
import { shortName } from '../systems/JoinMessage.js';
import { CommandRouter } from '../systems/CommandRouter.js';
import { RaceCamera } from '../systems/RaceCamera.js';
import { depthForDist, laneCenter, project } from '../systems/Projection.js';
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
    const camParam = params.get('cam');
    this.autoFollow = camParam === 'player' || (camParam !== 'overview' && params.get('demo') !== '1'); // live thật tự theo người chơi
    if (params.get('me')) viewer.nickname = params.get('me'); // ?me=Tên: xem như người chơi tên đó (camera đuổi theo)
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
    this.debug = new DebugOverlay(this, { enabled: !(this.registry.get('live')?.live) });
    this.resultFx = new ResultFx(this);

    // HUD và các lớp chữ là HTML/CSS đặt chồng lên canvas
    this.liveMode = this.registry.get('live') ?? { live: false, scale: 1 };
    const hudRoot = createHudRoot(this.liveMode);
    this.nameTags = new NameTags(hudRoot, Math.max(4, CONFIG.topNamesShown));
    this.hud = new Hud(hudRoot);
    const net = this.registry.get('net');
    this.netDot = net && !mockOn ? new NetDot(hudRoot, net) : null; // chấm xanh/vàng/đỏ: tình trạng kết nối tới server
    this.pauseBadge = new PauseBadge(hudRoot);
    this.floatTexts = new FloatTexts(hudRoot); // sau HUD để chữ nổi nằm trên các khung
    this.hudTimer = 0;
    this.fxDirector = new FxDirector(CONFIG);
    this.debugReporter = this.registry.get('net') && !mockOn ? new DebugReporter() : null;
    this.audio = new AudioEngine();
    if (mockOn || params.get('mute') === '1') this.audio.enabled = false; // ?mock=1 và ?mute=1: im lặng
    // MC dẫn chương trình (giọng đọc của trình duyệt); tắt khi tắt tiếng chung (phím M), ?mc=0 hoặc ?mock=1
    this.mcDirector = new McDirector(CONFIG);
    const remote = CONFIG.mc.provider === 'browser' ? null : new RemoteVoice({ baseUrl: serverHttpUrl(), volume: CONFIG.mc.volume, timeoutMs: CONFIG.mc.remoteTimeoutMs, route: (a, g) => this.audio.routeVoice(a, g), analyze: (b) => this.audio.peakOf(b), targetPeak: CONFIG.audio.voice.targetPeak, unknownGain: CONFIG.audio.voice.unknownGain });
    this.mc = new Mc(CONFIG.mc, { isMuted: () => !this.audio.enabled, remote });
    if (!mockOn) this.mc.init(); // hỏi server có giọng genmax không và tạo sẵn các câu cố định
    if (mockOn || params.get('mc') === '0') this.mc.enabled = false;
    this.lastCount = 0;
    this.bindAudioKeys();
    // Nhịp dự phòng: HUD luôn được làm mới ít nhất mỗi 0,5 giây kể cả khi trình duyệt làm chậm vòng lặp game
    this.hudBackup = setInterval(() => this.refreshHud(), 500);
    // Tab ẩn / cửa sổ bị che: Phaser ngừng vẽ nhưng game, MC và nhạc vẫn chạy nhờ nhịp từ Worker
    this.bgTicker = new BackgroundTicker({
      onBeat: () => this.audio.scheduleMusic(),
      onStale: (dt) => this.backgroundStep(dt),
    });
    this.events.once('shutdown', () => {
      clearInterval(this.hudBackup);
      this.bgTicker.stop();
    });

    // Người thật giả lập cho tới khi có join thật (Task 8); không có thì toàn bot
    // ?racers=N: đoàn đua N nhân vật (thử tải, vd. 30); ?bots=N: ít bot hơn cho dễ nhìn
    const racersN = Number(params.get('racers')) || 0;
    this.runCfg = racersN ? { ...CONFIG, maxPlayers: racersN, botFillTo: racersN } : CONFIG;
    const botFillTo = params.has('bots') ? Number(params.get('bots')) : this.runCfg.botFillTo; // ?bots=N: ít bot hơn cho dễ nhìn
    this.lobby = new Lobby({ cfg: { ...this.runCfg, botFillTo }, botNames: STR.demoNames });
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
      cfg: { ...this.runCfg, roundSeconds },
      skinCount: SKINS.length,
      startDist: Number(params.get('start')) || 0,
      onEvent: (e) => this.onGameEvent(e),
    });
    // ?demo=1&soak=1: ghi mức RAM định kỳ vào memory-log.csv (xem README)
    if (params.get('soak') === '1') {
      this.soak = new SoakLog({
        reportEverySeconds: Number(params.get('soakEvery')) || CONFIG.soakReportSeconds,
        getExtra: () => ({ round: this.manager.round, phaser: this.children.list.length, dom: document.getElementsByTagName('*').length, racers: this.manager.racers.length }),
      });
    }
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
      this.router.onCommand(({ command, user }) => command === 'join' && this.onJoin(user));
      bus.on('like', (e) => this.likeBoost.handle(e)); // thả tim = tăng tốc
      bus.on('gift', (e) => this.giftBoost.handle(e)); // tặng quà = khiên + tăng tốc mạnh
    }
  }

  onJoin(user) {
    const result = this.manager.join(user);
    this.debugReporter?.event(`join: ${user.nickname} (${user.userId}) -> ${result.status}${result.where ? ` (${result.where})` : ''}${result.queuePosition ? `, hàng đợi số ${result.queuePosition}` : ''}`);
    console.log(`[join] ${user.nickname} (${user.userId}): ${result.status}, đang đua ${this.lobby.players.length}/${CONFIG.maxPlayers} người thật, hàng đợi ${this.lobby.queue.length}`);
    this.toasts.show(joinMessage(result, user.nickname));
    this.refreshHud(); // cập nhật hàng đợi ngay, không chờ vòng lặp game (vòng lặp có thể bị trình duyệt làm chậm khi cửa sổ bị che)
    if (result.status === 'racing') this.mc.say(this.mcDirector.onJoin(user.nickname, this.manager.now));
  }

  onGameEvent(e) {
    if (e.type === 'round') {
      if (e.evicted?.length) this.toasts.show({ text: STR.yieldSeat(e.evicted.map((p) => shortName(p.nickname)).join(', ')), kind: 'queue' });
      this.buildViews();
      this.mcDirector.onRound();
      if (e.restart) this.pauseBadge.set(false);
    }
    else if (e.type === 'racer') this.swapView(e.added, e.removed);
    else if (e.type === 'hit') this.onRacerHit(e.racer);
    else if (e.type === 'boost') this.onBoost(e);
    else if (e.type === 'state') this.onStateChange(e.state);
    else if (e.type === 'pause') this.onPause(e.paused);
    if (e.type === 'dodge' || e.type === 'hit' || e.type === 'boost') this.mc.say(this.mcDirector.onEvent(e, this.manager.now));
    if (e.type === 'dodge' || e.type === 'hit' || e.type === 'boost') this.playCues(this.fxDirector.handle(e, this.manager.now), e.racer);
  }

  // Streamer tạm dừng: hiện dải chữ và cho MC im; tiếp tục thì ẩn dải chữ
  onPause(paused) {
    this.pauseBadge.set(paused);
    if (paused) this.mc.stop();
  }

  // Phím tắt âm thanh (M: tất cả, N: nhạc nền) và mở khóa âm thanh ở lần tương tác đầu tiên của trình duyệt
  bindAudioKeys() {
    const { muteKey, musicKey } = CONFIG.audio;
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', (ev) => {
      unlock();
      if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey || /^(INPUT|TEXTAREA)$/.test(ev.target?.tagName ?? '')) return;
      const key = ev.key.toLowerCase();
      if (key === muteKey) this.audio.toggleAll();
      else if (key === musicKey) this.audio.toggleMusic();
      else if (key === CONFIG.mc.key) this.mc.toggle();
      else if (key === CONFIG.net.statusKey) this.netDot?.toggle();
      else if (!this.mock && key === CONFIG.live.pauseKey) this.manager.togglePause(); // P: tạm dừng / tiếp tục
      else if (!this.mock && key === CONFIG.live.restartKey) this.manager.restartRound(); // R: bắt đầu lại lượt
    });
    this.audio.ensure();
  }

  // Đổi trạng thái lượt: nhạc đổi nhịp, tiếng xuất phát và tiếng thắng
  onStateChange(state) {
    this.audio.setMood(state);
    this.mc.say(this.mcDirector.onState(state, this.manager, this.manager.now));
    if (state === 'race') this.audio.play('go');
    else if (state === 'result') this.audio.play('win');
    if (state !== 'countdown') this.lastCount = 0;
    if (state === 'wait') this.fxDirector.reset();
  }

  // Thực hiện các cue của FxDirector: chữ nổi trên đầu nhân vật và tiếng. Nhân vật ngoài khung hình thì bỏ qua (trừ tiếng quà).
  playCues(cues, racer) {
    const view = this.views.get(racer);
    const on = !!view?.visible;
    for (const cue of cues) {
      if (cue.kind === 'sound') {
        if (on || cue.name === 'gift') this.audio.play(cue.name, cue.volume);
      } else if (on) {
        this.floatTexts.show(cue.text, cue.tone, view.top.x, view.top.y, view.s);
      }
    }
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
    // Góc người chơi: camera đuổi theo nhân vật người chơi thật (góc nhìn thứ ba, cận cảnh).
    //  - Máy này xác định được "mình" (panel debug demo, ?me=Tên): theo nhân vật của mình.
    //  - Live thật (không phải demo): game biết ai đang chơi qua sự kiện join nên tự theo người thật đang dẫn đầu; ?cam=overview để luôn toàn cảnh.
    //  - Demo: mặc định toàn cảnh; ?cam=player để thử chế độ tự theo người thật.
    // Không có người thật nào, hoặc ở góc khán giả: ôm cả đoàn.
    const real = this.racers.filter((r) => !r.isBot);
    const me = real.find((r) => r.userId === viewer.userId || (viewer.nickname && r.nickname === viewer.nickname));
    const target = me ?? (this.autoFollow ? this.followLeader(real) : null);
    this.camera.chase = !!target;
    if (target) {
      this.dists.length = 1;
      this.dists[0] = target.dist;
      return this.dists;
    }
    this.followed = null;
    this.dists.length = this.racers.length;
    this.racers.forEach((r, i) => {
      this.dists[i] = r.dist;
    });
    return this.dists;
  }

  // Người thật đang dẫn đầu; giữ người đang theo, chỉ đổi khi người khác vượt xa chaseSwitchGap (tránh camera nhảy qua lại)
  followLeader(real) {
    if (!real.length) return null;
    let lead = real[0];
    for (const r of real) if (r.dist > lead.dist) lead = r;
    if (!this.followed || !real.includes(this.followed) || lead.dist - this.followed.dist > CONFIG.chaseSwitchGap) this.followed = lead;
    return this.followed;
  }

  // Phaser dừng hẳn vòng lặp nếu update ném lỗi (không đặt lịch khung hình kế): game đứng, HUD, MC, nhân vật đều im trong khi
  // thông báo (do sự kiện WebSocket) vẫn hiện. Nên bắt lỗi ở đây, báo về server rồi chạy tiếp khung sau.
  update(time, delta) {
    try {
      this.tick(time, delta);
    } catch (err) {
      reportError('game', err);
    }
  }

  // Chạy logic khi không có khung hình (tab ẩn): bước nhỏ như bình thường, không vẽ
  backgroundStep(seconds) {
    if (this.mock || this.hold) return;
    for (let left = seconds; left > 1e-6; left -= 0.05) this.manager.update(Math.min(left, 0.05));
    this.mc.say(this.mcDirector.update(this.manager, this.manager.now));
  }

  tick(_time, delta) {
    this.bgTicker?.frame();
    this.soak?.frame();
    const dt = Math.min(delta / 1000, 0.05);
    const held = this.hold && this.manager.state === this.hold && this.manager.stateTime >= 3;
    if (!held && !this.mock) for (let i = 0; i < this.speed; i++) this.manager.update(dt);

    if (!this.mock) this.camera.update(this.collectDists(), dt);
    const t0 = this.perf ? performance.now() : 0;
    this.track.draw(this.camera, this.manager.now);
    this.obstacleViews.update(this.manager.field, this.camera, this.manager.now);
    if (this.perf) this.logPerf(performance.now() - t0, delta);

    this.placeViews();
    this.hearts.update(dt);
    this.resultFx.update(this.manager, dt);
    this.overlay.update(this.manager);
    this.updateHud(dt);
    this.tickCountdown();
    this.netDot?.update(performance.now());
    if (!this.mock) this.mc.say(this.mcDirector.update(this.manager, this.manager.now));
    this.debug.setStatus(this.statusLine());
  }

  // Tiếng tích mỗi lần số đếm ngược đổi (3, 2, 1)
  tickCountdown() {
    const m = this.manager;
    if (m.state !== 'countdown' || m.countdownValue === this.lastCount) return;
    this.lastCount = m.countdownValue;
    this.audio.play('tick');
  }

  statusLine() {
    const m = this.manager;
    const real = m.racers.filter((r) => !r.isBot).length;
    return `Lượt ${m.round} | ${STATE_LABEL[m.state]} ${m.stateTime.toFixed(1)}s | người thật ${real}, bot ${m.racers.length - real}, hàng đợi ${this.lobby.queue.length} | âm: ${this.audio.enabled ? 'bật' : 'tắt'}, nhạc: ${this.audio.musicOn ? 'bật' : 'tắt'} (M, N) | MC: ${this.mc.enabled ? (this.mc.source ? `bật, giọng ${this.mc.source}` : 'bật, chưa có giọng') : 'tắt'} (V)`;
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
      view.place(x, y, s, m.now * 14 + i * 1.3, depthForDist(r.dist), m.now);
      view.s = s;
      if (r.boost > 0 && s > 0.3 && (!rayTarget || s > rayTarget.s)) rayTarget = { x, y, s, power: Math.min(1, r.boost / 0.5) };
      this.debug.racer(r, this.camera, x, y, s);
    });

    this.rays.update(rayTarget, m.now);

    // Nhãn tên cho top N (một lượt 5 người nên hiện đủ), cả lúc chờ và đếm ngược để ai cũng tìm được mình
    let tags = 0;
    const tagged = this.mock ? this.racers.filter((r) => this.mock.tagged.includes(r.nickname)) : m.ranking.slice(0, topNamesShown);
    for (const r of tagged) {
      const view = this.views.get(r);
      if (view?.visible) this.nameTags.show(tags++, r.nickname, view.top.x, view.top.y, view.s);
    }
    this.nameTags.hideFrom(tags);
  }

  // Cập nhật HUD tám lần mỗi giây là đủ mượt, đỡ tốn DOM
  updateHud(dt) {
    this.hudTimer += dt;
    if (this.hudTimer < 0.12) return;
    this.hudTimer = 0;
    this.refreshHud();
  }

  // Gửi danh sách ai đang đua, ai chờ lượt sau, ai trong hàng đợi về terminal của server (chỉ khi nhận sự kiện từ server)
  reportLobby() {
    if (!this.debugReporter) return;
    this.debugReporter.state(describeLobby({ round: this.manager.round, state: this.manager.state, racers: this.manager.racers, lobby: this.lobby }));
  }

  refreshHud() {
    this.reportLobby();
    const model = buildHudModel(this.manager, this.lobby);
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
    this.audio.play('hammer', 0.4 + 0.6 * Math.min(1, s));
    if (CONFIG.fx.shakeScale > 0) this.cameras.main.shake(120, (0.0025 + 0.003 * Math.min(1, s)) * CONFIG.fx.shakeScale);
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
