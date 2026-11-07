import { CONFIG } from '../config.js';
import { STR } from '../strings.js';

const STALE_MS = 6000; // câu chờ quá lâu thì bỏ, nói ra đã lỗi thời

/**
 * Hàng đợi câu nói của MC (logic thuần, test được). Một câu nói tại một thời điểm.
 * Câu có mức ưu tiên cao hơn câu đang nói thì chen lên (cắt câu cũ); câu phụ (ưu tiên thấp nhất) bị bỏ nếu MC đang bận.
 */
export class SpeechQueue {
  constructor(maxQueue = CONFIG.mc.maxQueue) {
    this.maxQueue = maxQueue;
    this.current = null;
    this.queue = [];
  }

  /** Đề nghị một câu. Trả về 'speak' (nói ngay, có thể phải cắt câu đang nói), 'queued' hoặc 'dropped'. */
  offer(line, now = 0) {
    const item = { ...line, at: now };
    if (!this.current) {
      this.current = item;
      return 'speak';
    }
    if (item.priority > this.current.priority) {
      this.queue = this.queue.filter((q) => q.priority >= item.priority);
      this.current = item;
      return 'speak';
    }
    if (item.priority <= 1) return 'dropped';
    if (this.queue.length >= this.maxQueue) {
      const lowest = this.queue.reduce((a, b) => (b.priority < a.priority ? b : a), this.queue[0]);
      if (!lowest || lowest.priority >= item.priority) return 'dropped';
      this.queue.splice(this.queue.indexOf(lowest), 1);
    }
    this.queue.push(item);
    return 'queued';
  }

  /** Câu đang nói đã xong: trả về câu kế tiếp cần nói (ưu tiên cao trước, cùng mức thì cũ trước) hoặc null. */
  next(now = 0) {
    this.current = null;
    this.queue = this.queue.filter((q) => now - q.at <= STALE_MS);
    if (!this.queue.length) return null;
    let best = 0;
    for (let i = 1; i < this.queue.length; i++) if (this.queue[i].priority > this.queue[best].priority) best = i;
    this.current = this.queue.splice(best, 1)[0];
    return this.current;
  }

  clear() {
    this.current = null;
    this.queue = [];
  }
}

// MC dẫn chương trình. Hai nguồn giọng:
//  1. Giọng genmax qua server (nếu server có GENMAX_API_KEY và GENMAX_VOICE_ID trong .env): tự nhiên hơn, tốn credit.
//  2. Giọng đọc của trình duyệt (Web Speech API): miễn phí, cần giọng tiếng Việt cài trong máy.
// Dùng nguồn 1 khi có; lỗi từng câu (hết hạn mức, mạng) thì câu đó đọc bằng nguồn 2. Không có nguồn nào thì im lặng.
export class Mc {
  constructor(cfg = CONFIG.mc, { isMuted = () => false, remote = null } = {}) {
    this.cfg = cfg;
    this.enabled = cfg.enabled;
    this.isMuted = isMuted;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.queue = new SpeechQueue(cfg.maxQueue);
    this.voice = null;
    this.remote = remote;
    if (this.synth) {
      this.pickVoice();
      this.synth.addEventListener?.('voiceschanged', () => this.pickVoice());
    }
  }

  /** Kết nối server giọng genmax (không bắt buộc) và nhờ tạo sẵn các câu cố định. Gọi một lần lúc khởi động. */
  async init() {
    if (this.remote) await this.remote.init(staticLines());
  }

  // Giọng tiếng Việt của trình duyệt: ưu tiên giọng cài sẵn trong máy (không cần mạng)
  pickVoice() {
    const voices = this.synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith(this.cfg.lang));
    this.voice = voices.find((v) => v.localService) ?? voices[0] ?? null;
  }

  /** Nguồn giọng đang dùng: 'genmax', 'trình duyệt' hoặc null (không có). */
  get source() {
    if (this.remote?.enabled) return 'genmax';
    return this.voice ? 'trình duyệt' : null;
  }

  get available() {
    return this.source !== null;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stop();
    return this.enabled;
  }

  stop() {
    this.queue.clear();
    this.remote?.cancel();
    this.synth?.cancel();
  }

  /** Cho MC nói các câu { text, priority } (bỏ qua khi tắt, tắt tiếng, chưa có giọng hoặc trình duyệt chưa cho phát). */
  say(lines) {
    if (!this.enabled || this.isMuted()) return;
    if (!this.voice && this.synth) this.pickVoice();
    if (!this.available) return;
    this.unstick();
    if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    for (const line of lines) {
      const action = this.queue.offer(line, performance.now());
      if (action === 'speak') this.speak(line);
    }
  }

  // Phòng ngừa kẹt: nếu một câu không bao giờ báo xong (lỗi phát âm thanh, trình duyệt treo) thì bỏ để MC nói tiếp
  unstick() {
    const cur = this.queue.current;
    if (cur && performance.now() - cur.at > this.cfg.watchdogMs) {
      this.stop();
    }
  }

  speak(line) {
    // Cắt câu đang đọc (nếu có) trước khi đọc câu mới
    this.remote?.cancel();
    const finish = () => {
      if (this.queue.current?.text !== line.text) return; // câu này đã bị câu khác cắt ngang
      const next = this.queue.next(performance.now());
      if (next) this.speak(next);
    };
    if (this.remote?.enabled) this.remote.speak(line.text, finish, () => this.browserSpeak(line, finish));
    else this.browserSpeak(line, finish);
  }

  browserSpeak(line, finish) {
    if (!this.voice || !this.synth) return finish();
    const u = new SpeechSynthesisUtterance(line.text);
    u.voice = this.voice;
    u.lang = this.voice.lang;
    u.rate = this.cfg.rate;
    u.pitch = this.cfg.pitch;
    u.volume = this.cfg.volume;
    u.onend = finish;
    u.onerror = finish;
    if (this.synth.speaking || this.synth.pending) {
      this.synth.cancel(); // chờ một nhịp ngắn vì Chrome hay bỏ câu nói ngay sau cancel
      setTimeout(() => this.synth.speak(u), 60);
    } else {
      this.synth.speak(u);
    }
  }
}

/** Các câu cố định (không chèn tên) để server tạo sẵn giọng. */
export function staticLines() {
  const out = new Set();
  for (const list of Object.values(STR.mc)) for (const fn of list) if (fn.length === 0) out.add(fn());
  return [...out];
}
