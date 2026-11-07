const MAX_CACHED = 80;

// Giọng MC lấy từ server (genmax): client gửi câu cần đọc, server trả mp3 (đã cache ở server). Khóa API không bao giờ ở client.
// Câu cố định được nhờ server tạo sẵn lúc khởi động (prefetch) nên lúc live phát gần như ngay.
export class RemoteVoice {
  constructor({ baseUrl, volume = 1, timeoutMs = 8000, fetchFn = (...a) => globalThis.fetch(...a), makeAudio = (url) => new Audio(url) } = {}) {
    this.baseUrl = baseUrl;
    this.volume = volume;
    this.timeoutMs = timeoutMs;
    this.fetchFn = fetchFn;
    this.makeAudio = makeAudio;
    this.enabled = false; // server đã cấu hình genmax (xác định ở init)
    this.token = 0; // mỗi câu mới tăng một đơn vị; kết quả của câu cũ bị bỏ
    this.audio = null;
    this.urls = new Map(); // câu -> blob URL đã tải
  }

  /** Hỏi server đã cấu hình genmax chưa; nếu rồi thì nhờ tạo sẵn các câu cố định ở nền. */
  async init(staticTexts = []) {
    try {
      const res = await this.fetchFn(`${this.baseUrl}/tts/status`);
      this.enabled = res.ok && (await res.json()).enabled === true;
      if (this.enabled && staticTexts.length) {
        this.fetchFn(`${this.baseUrl}/tts/prefetch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: staticTexts }),
        }).catch(() => {});
      }
    } catch {
      this.enabled = false; // server không chạy: dùng giọng trình duyệt
    }
    return this.enabled;
  }

  async load(text) {
    const cached = this.urls.get(text);
    if (cached) return cached;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchFn(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      this.urls.set(text, url);
      if (this.urls.size > MAX_CACHED) {
        const [oldest, oldUrl] = this.urls.entries().next().value;
        this.urls.delete(oldest);
        URL.revokeObjectURL(oldUrl);
      }
      return url;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Đọc text. onDone khi đọc xong; onFail khi không lấy hoặc không phát được (để chuyển sang giọng khác). */
  speak(text, onDone, onFail) {
    this.cancel();
    const token = this.token;
    this.load(text)
      .then((url) => {
        if (token !== this.token) return; // đã bị câu khác thay thế trong lúc chờ
        const audio = this.makeAudio(url);
        audio.volume = this.volume;
        const finish = () => token === this.token && onDone();
        audio.onended = finish;
        audio.onerror = finish;
        this.audio = audio;
        return audio.play().catch(() => token === this.token && onFail());
      })
      .catch(() => token === this.token && onFail());
  }

  cancel() {
    this.token++;
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause?.();
      this.audio = null;
    }
  }
}
