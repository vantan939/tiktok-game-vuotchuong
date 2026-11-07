import { CONFIG } from '../config.js';

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

// MC dẫn chương trình bằng giọng đọc của trình duyệt (Web Speech API). Không có file âm thanh, không cần mạng
// khi dùng giọng cài sẵn trong máy. Nếu máy không có giọng tiếng Việt thì tự im lặng (không đọc sai bằng giọng nước khác).
export class Mc {
  constructor(cfg = CONFIG.mc, { isMuted = () => false } = {}) {
    this.cfg = cfg;
    this.enabled = cfg.enabled;
    this.isMuted = isMuted;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.queue = new SpeechQueue(cfg.maxQueue);
    this.voice = null;
    if (this.synth) {
      this.pickVoice();
      this.synth.addEventListener?.('voiceschanged', () => this.pickVoice());
    }
  }

  // Giọng tiếng Việt: ưu tiên giọng cài sẵn trong máy (không cần mạng)
  pickVoice() {
    const voices = this.synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith(this.cfg.lang));
    this.voice = voices.find((v) => v.localService) ?? voices[0] ?? null;
  }

  get available() {
    return !!this.voice;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stop();
    return this.enabled;
  }

  stop() {
    this.queue.clear();
    this.synth?.cancel();
  }

  /** Cho MC nói các câu { text, priority } (bỏ qua khi tắt, tắt tiếng, chưa có giọng hoặc trình duyệt chưa cho phát). */
  say(lines) {
    if (!this.enabled || this.isMuted() || !this.synth) return;
    if (!this.voice) this.pickVoice();
    if (!this.voice) return;
    if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    for (const line of lines) {
      const action = this.queue.offer(line, performance.now());
      if (action === 'speak') this.speak(line);
    }
  }

  speak(line) {
    const u = new SpeechSynthesisUtterance(line.text);
    u.voice = this.voice;
    u.lang = this.voice.lang;
    u.rate = this.cfg.rate;
    u.pitch = this.cfg.pitch;
    u.volume = this.cfg.volume;
    const done = () => {
      if (this.queue.current?.text !== line.text) return; // câu này đã bị câu khác cắt ngang
      const next = this.queue.next(performance.now());
      if (next) this.speak(next);
    };
    u.onend = done;
    u.onerror = done;
    if (this.synth.speaking || this.synth.pending) {
      this.synth.cancel(); // cắt câu đang nói; chờ một nhịp ngắn vì Chrome hay bỏ câu nói ngay sau cancel
      setTimeout(() => this.synth.speak(u), 60);
    } else {
      this.synth.speak(u);
    }
  }
}
