import { fromChat, fromLike, fromMember } from './adapt.js';
import { GiftStreaks } from './gifts.js';
import { LikeAggregator } from './likes.js';
import { parseCommand } from '../../../shared/events.js';

const STATS_EVERY_MS = 60000;

/**
 * Kết nối buổi live TikTok bằng tiktok-live-connector (không chính thức) và phát GameEvent qua emit.
 * Tự kết nối lại khi bị ngắt hoặc khi chủ phòng chưa live. Mọi sự kiện đều ghi log rõ ràng.
 *
 * options:
 *   username      TikTok @username của chủ phòng (không cần dấu @)
 *   emit(event)   nhận GameEvent đã chuyển đổi (chat, like đã gộp, gift cuối chuỗi, join)
 *   log(msg)      ghi log (mặc định console.log)
 *   signApiKey    khóa Euler Stream (tùy chọn, thư viện dùng máy chủ ký của Euler để kết nối)
 *   loadConnector hàm trả về module tiktok-live-connector (để test thay bằng bản giả)
 */
export class TikTokLiveSource {
  constructor({
    username, emit, onStatus = () => {}, log = console.log, signApiKey, loadConnector = () => import('tiktok-live-connector'),
    likeWindowMs = 1000, memberDedupeMs = 300000, retryMinMs = 2000, retryMaxMs = 30000, offlineRetryMs = 30000,
    now = () => Date.now(), setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (t) => clearTimeout(t),
  } = {}) {
    Object.assign(this, { username, emit, onStatus, log, signApiKey, loadConnector, memberDedupeMs, retryMinMs, retryMaxMs, offlineRetryMs, now, setTimer, clearTimer });
    this.gifts = new GiftStreaks();
    this.likes = new LikeAggregator((e) => this.send(e), { windowMs: likeWindowMs, setTimer, clearTimer });
    this.connection = null;
    this.stopped = false;
    this.retryTimer = null;
    this.failures = 0;
    this.members = new Map(); // userId -> lần vào phòng gần nhất được phát (để không phát lặp)
    this.counts = { chat: 0, like: 0, gift: 0, join: 0 };
    this.statsTimer = null;
  }

  async start() {
    this.stopped = false;
    this.lib = await this.loadConnector();
    this.scheduleStats();
    await this.connect();
  }

  stop() {
    this.stopped = true;
    this.clearTimer(this.retryTimer);
    this.clearTimer(this.statsTimer);
    this.likes.flushAll();
    this.connection?.disconnect?.();
    this.onStatus('disconnected', 'đã dừng');
    this.log('[tiktok] đã dừng');
  }

  scheduleStats() {
    this.statsTimer = this.setTimer(() => {
      const c = this.counts;
      this.log(`[tiktok] 1 phút qua: ${c.chat} bình luận, ${c.like} lượt tim (đã gộp), ${c.gift} quà, ${c.join} người vào phòng`);
      this.counts = { chat: 0, like: 0, gift: 0, join: 0 };
      if (!this.stopped) this.scheduleStats();
    }, STATS_EVERY_MS);
  }

  send(event) {
    this.counts[event.type]++;
    this.emit(event);
  }

  async connect() {
    if (this.stopped) return;
    const { TikTokLiveConnection, WebcastEvent = {}, ControlEvent = {} } = this.lib;
    const connection = new TikTokLiveConnection(this.username, this.signApiKey ? { signApiKey: this.signApiKey } : {});
    this.connection = connection;
    this.attach(connection, WebcastEvent, ControlEvent);
    this.onStatus('reconnecting', 'đang kết nối TikTok');
    this.log(`[tiktok] đang kết nối tới @${this.username}...`);
    try {
      const state = await connection.connect();
      this.failures = 0;
      this.onStatus('connected', '');
      this.log(`[tiktok] đã kết nối @${this.username} (roomId ${state?.roomId ?? '?'})`);
    } catch (err) {
      this.onConnectFailed(err);
    }
  }

  attach(connection, WebcastEvent, ControlEvent) {
    const handle = (name, fn) => (data) => {
      try {
        const event = fn(data);
        if (event) this.deliver(event);
      } catch (err) {
        this.log(`[tiktok] lỗi khi xử lý sự kiện ${name}: ${err.message}`);
      }
    };
    connection.on(WebcastEvent.CHAT ?? 'chat', handle('chat', fromChat));
    connection.on(WebcastEvent.LIKE ?? 'like', handle('like', fromLike));
    connection.on(WebcastEvent.GIFT ?? 'gift', handle('gift', (d) => this.gifts.handle(d)));
    connection.on(WebcastEvent.MEMBER ?? 'member', handle('member', fromMember));
    connection.on(ControlEvent.DISCONNECTED ?? 'disconnected', (info) => {
      this.log(`[tiktok] bị ngắt kết nối${info?.code ? ` (mã ${info.code})` : ''}${info?.reason ? `: ${info.reason}` : ''}`);
      this.likes.flushAll();
      if (connection === this.connection) {
        this.onStatus('reconnecting', 'TikTok ngắt kết nối');
        this.scheduleRetry();
      }
    });
    connection.on(ControlEvent.ERROR ?? 'error', (err) => {
      this.log(`[tiktok] lỗi: ${err?.info ?? ''} ${err?.exception?.message ?? err?.message ?? ''}`.trim());
    });
  }

  // like được gộp; join bỏ qua người vừa vào gần đây; chat và gift đi thẳng
  deliver(event) {
    // Ghi log các lệnh người xem gõ để dễ kiểm tra khi live (bình luận khác không ghi)
    if (event.type === 'chat' && parseCommand(event.text)) this.log(`[tiktok] lệnh '${parseCommand(event.text)}' từ ${event.nickname} (${event.userId})`);
    if (event.type === 'like') return this.likes.add(event);
    if (event.type === 'join') {
      const t = this.now();
      const last = this.members.get(event.userId);
      if (last !== undefined && t - last < this.memberDedupeMs) return;
      this.members.set(event.userId, t);
      if (this.members.size > 5000) this.members.delete(this.members.keys().next().value);
    }
    this.send(event);
  }

  onConnectFailed(err) {
    const offline = err?.name === 'UserOfflineError' || /offline|not live|isn't live/i.test(String(err?.message));
    this.failures++;
    if (offline) this.log(`[tiktok] @${this.username} chưa live, thử lại sau ${Math.round(this.offlineRetryMs / 1000)} giây`);
    else this.log(`[tiktok] kết nối thất bại: ${err?.name ?? 'Error'}: ${err?.message ?? err}`);
    // Mới thất bại một hai lần thì vẫn là "đang kết nối lại"; chưa live hoặc thất bại nhiều lần thì báo mất kết nối
    if (offline) this.onStatus('disconnected', `@${this.username} chưa live`);
    else this.onStatus(this.failures >= 3 ? 'disconnected' : 'reconnecting', this.failures >= 3 ? 'không kết nối được TikTok' : 'đang kết nối TikTok');
    this.scheduleRetry(offline ? this.offlineRetryMs : undefined);
  }

  // Thử lại với thời gian chờ tăng dần (tránh bị TikTok giới hạn tốc độ)
  scheduleRetry(fixedMs) {
    if (this.stopped) return;
    this.clearTimer(this.retryTimer);
    const ms = fixedMs ?? Math.min(this.retryMaxMs, this.retryMinMs * 2 ** Math.max(0, this.failures - 1));
    this.failures = Math.max(1, this.failures);
    this.log(`[tiktok] sẽ kết nối lại sau ${Math.round(ms / 1000)} giây`);
    this.retryTimer = this.setTimer(() => this.connect(), ms);
  }
}
