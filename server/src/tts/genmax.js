import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Lỗi có mã HTTP để route trả về cho client. */
export class TtsError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Model mặc định theo nhà cung cấp trong genmax (xem docs/api: text-to-speech, models)
const DEFAULT_MODEL = { elevenlabs: 'eleven_multilingual_v2', minimax: 'speech-2.8-turbo', capcut: 'capcut' };

/** MiniMax dùng tên ngôn ngữ đầy đủ, còn ElevenLabs và CapCut dùng mã (vi, en...). */
export function languageFor(provider, language) {
  if (provider !== 'minimax') return language;
  return { vi: 'Vietnamese', en: 'English' }[language] ?? language;
}

/**
 * Chuyển văn bản thành giọng nói qua API genmax (https://api.genmax.io). Quy trình của API là bất đồng bộ:
 * gửi yêu cầu (nhận id), hỏi trạng thái tới khi xong, tải file mp3. Mỗi ký tự tốn credit nên:
 *  - kết quả được lưu đĩa theo nội dung (cùng câu, cùng giọng thì không tạo lại),
 *  - yêu cầu trùng đang chạy dùng chung một lần gọi,
 *  - có hạn mức ký tự mỗi giờ (budgetChars) để không cạn credit khi có lỗi lặp hoặc bị lạm dụng.
 * Khóa API chỉ ở phía server, không bao giờ gửi xuống trình duyệt.
 */
export class GenmaxTts {
  constructor({
    apiKey, voiceId, provider = 'elevenlabs', model, language = 'vi', speed = 1, pitch = 0,
    baseUrl = 'https://api.genmax.io', cacheDir = null, fetchFn = globalThis.fetch,
    pollMs = 700, timeoutMs = 25000, maxChars = 160, budgetChars = 6000, budgetWindowMs = 3600000,
    now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = {}) {
    Object.assign(this, { apiKey, voiceId, provider, language, speed, pitch, baseUrl, cacheDir, fetchFn, pollMs, timeoutMs, maxChars, budgetChars, budgetWindowMs, now, sleep });
    this.model = model || DEFAULT_MODEL[provider] || DEFAULT_MODEL.elevenlabs;
    this.inflight = new Map(); // khóa cache -> Promise đang chạy
    this.spent = []; // [{ at, chars }] các lần tạo giọng mới trong khung giờ gần nhất
    this.memory = new Map(); // khóa -> Buffer (khi không có thư mục cache)
  }

  get enabled() {
    return Boolean(this.apiKey && this.voiceId);
  }

  // Khóa cache gồm mọi thứ ảnh hưởng tới âm thanh: đổi giọng, model hay tốc độ thì tạo lại
  keyFor(text) {
    const parts = [this.provider, this.model, this.voiceId, this.language, this.speed, this.pitch, text];
    return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 40);
  }

  validate(text) {
    if (!this.enabled) throw new TtsError(503, 'Chưa cấu hình GENMAX_API_KEY và GENMAX_VOICE_ID trong .env');
    if (typeof text !== 'string' || !text.trim()) throw new TtsError(400, 'Thiếu văn bản');
    if ([...text].length > this.maxChars) throw new TtsError(400, `Văn bản quá dài (tối đa ${this.maxChars} ký tự)`);
  }

  // Hạn mức ký tự trong budgetWindowMs gần nhất; còn chỗ thì ghi nhận luôn
  charge(chars) {
    const t = this.now();
    this.spent = this.spent.filter((s) => t - s.at < this.budgetWindowMs);
    const used = this.spent.reduce((sum, s) => sum + s.chars, 0);
    if (used + chars > this.budgetChars) throw new TtsError(429, 'Hết hạn mức ký tự giọng nói trong giờ này');
    this.spent.push({ at: t, chars });
  }

  async readCache(key) {
    if (this.memory.has(key)) return this.memory.get(key);
    if (!this.cacheDir) return null;
    try {
      return await readFile(join(this.cacheDir, `${key}.mp3`));
    } catch {
      return null;
    }
  }

  async writeCache(key, buffer) {
    this.memory.set(key, buffer);
    if (this.memory.size > 200) this.memory.delete(this.memory.keys().next().value);
    if (!this.cacheDir) return;
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(join(this.cacheDir, `${key}.mp3`), buffer);
  }

  /** Trả về Buffer mp3 của câu text (từ cache nếu có). Ném TtsError khi lỗi. */
  async synthesize(text) {
    this.validate(text);
    const key = this.keyFor(text);
    const cached = await this.readCache(key);
    if (cached) return cached;
    if (this.inflight.has(key)) return this.inflight.get(key);
    const job = this.generate(text, key).finally(() => this.inflight.delete(key));
    this.inflight.set(key, job);
    return job;
  }

  /** Tạo sẵn nhiều câu cố định (tuần tự, bỏ qua câu lỗi) để lúc live phát ngay. Trả về số câu đã có trong cache. */
  async prefetch(texts) {
    let ready = 0;
    for (const text of texts) {
      try {
        await this.synthesize(text);
        ready++;
      } catch (err) {
        if (err.status === 429 || err.status === 503) break; // hết hạn mức hoặc chưa cấu hình thì dừng
      }
    }
    return ready;
  }

  headers() {
    return { 'xi-api-key': this.apiKey, 'Content-Type': 'application/json' };
  }

  async generate(text, key) {
    this.charge([...text].length);
    const body = {
      text,
      provider: this.provider,
      model_id: this.model,
      language_code: languageFor(this.provider, this.language),
      voice_settings: { speed: this.speed, ...(this.provider === 'elevenlabs' ? {} : { pitch: this.pitch }) },
    };
    const created = await this.call(`${this.baseUrl}/v1/text-to-speech/${encodeURIComponent(this.voiceId)}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    if (!created.id) throw new TtsError(502, 'genmax không trả về id tác vụ');
    const task = await this.waitFor(created.id);
    const audioUrl = task.result?.audio_url;
    if (!audioUrl) throw new TtsError(502, 'genmax không trả về đường dẫn âm thanh');
    const buffer = await this.download(audioUrl);
    await this.writeCache(key, buffer);
    return buffer;
  }

  // Gọi API trả JSON; không bao giờ đưa khóa API vào thông báo lỗi
  async call(url, init) {
    let res;
    try {
      res = await this.fetchFn(url, init);
    } catch {
      throw new TtsError(502, 'Không kết nối được tới genmax');
    }
    if (!res.ok) {
      throw new TtsError(res.status === 429 ? 429 : 502, `genmax trả về lỗi ${res.status}${res.status === 401 ? ' (kiểm tra GENMAX_API_KEY)' : ''}`);
    }
    return res.json();
  }

  async waitFor(id) {
    const start = this.now();
    for (;;) {
      const task = await this.call(`${this.baseUrl}/v1/history/${encodeURIComponent(id)}`, { headers: { 'xi-api-key': this.apiKey } });
      if (task.status === 'completed') return task;
      if (task.status === 'failed') throw new TtsError(502, `genmax tạo giọng thất bại: ${String(task.error ?? 'không rõ')}`.slice(0, 200));
      if (this.now() - start > this.timeoutMs) throw new TtsError(504, 'genmax tạo giọng quá lâu');
      await this.sleep(this.pollMs);
    }
  }

  // Chỉ gửi khóa API tới đúng máy chủ genmax, không gửi tới địa chỉ khác
  async download(url) {
    const sameHost = new URL(url).origin === new URL(this.baseUrl).origin;
    let res;
    try {
      res = await this.fetchFn(url, sameHost ? { headers: { 'xi-api-key': this.apiKey } } : undefined);
    } catch {
      throw new TtsError(502, 'Không tải được file âm thanh');
    }
    if (!res.ok) throw new TtsError(502, `Tải file âm thanh lỗi ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

/** Dựng từ biến môi trường (.env): GENMAX_API_KEY, GENMAX_VOICE_ID (bắt buộc); GENMAX_PROVIDER, GENMAX_MODEL, GENMAX_LANGUAGE, GENMAX_SPEED, GENMAX_PITCH, GENMAX_BUDGET_CHARS_PER_HOUR (tùy chọn). */
export function genmaxFromEnv(env = process.env, extra = {}) {
  const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
  return new GenmaxTts({
    apiKey: env.GENMAX_API_KEY?.trim(),
    voiceId: env.GENMAX_VOICE_ID?.trim(),
    provider: env.GENMAX_PROVIDER?.trim() || 'elevenlabs',
    model: env.GENMAX_MODEL?.trim() || undefined,
    language: env.GENMAX_LANGUAGE?.trim() || 'vi',
    speed: num(env.GENMAX_SPEED, 1),
    pitch: num(env.GENMAX_PITCH, 0),
    budgetChars: num(env.GENMAX_BUDGET_CHARS_PER_HOUR, 6000),
    ...extra,
  });
}
