import { CONFIG } from '../config.js';
import { LOOP_STEPS, midiToHz, musicStep } from './music.js';

const LOOKAHEAD = 0.3; // xếp lịch nốt nhạc trước bấy nhiêu giây
const TICK_MS = 100;

// Âm thanh tổng hợp hoàn toàn bằng Web Audio (không có file âm thanh nên không vướng giấy phép).
// Mọi tiếng đi qua một bộ nén nhẹ để cộng dồn nhiều tiếng cũng không vỡ hay chói.
// Trình duyệt chỉ cho phát sau lần tương tác đầu tiên; unlock() gọi khi có phím hoặc nhấp chuột.
export class AudioEngine {
  constructor(cfg = CONFIG.audio) {
    this.cfg = cfg;
    this.enabled = cfg.enabled;
    this.musicOn = cfg.music;
    this.sfxOn = cfg.sfx;
    this.ctx = null;
    this.voices = 0;
    this.lastPlayed = new Map(); // tên tiếng -> thời điểm phát gần nhất
    this.intense = false;
    this.step = 0;
    this.nextStepAt = 0;
    this.timer = null;
  }

  // Dựng chuỗi Web Audio ở lần dùng đầu (cần trình duyệt có AudioContext)
  ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) return null;
    // Mọi âm thanh (nhạc, hiệu ứng, giọng MC) chạy chung một tần số lấy mẫu cố định cho khớp Live Studio / TikTok (48 kHz),
    // không phụ thuộc loa của máy. File mp3 giọng genmax (44,1 kHz) được trình duyệt đổi sang tần số này khi phát.
    let ctx;
    try {
      ctx = new Ctx({ sampleRate: this.cfg.sampleRate });
    } catch {
      ctx = new Ctx(); // trình duyệt không nhận tần số này thì dùng tần số mặc định của máy
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    this.master = ctx.createGain();
    this.sfxGain = ctx.createGain();
    this.musicGain = ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain.connect(this.master);
    this.master.connect(comp);
    comp.connect(ctx.destination);
    // Đường riêng cho giọng MC: giảm bớt rồi qua bộ giới hạn đỉnh để không bị vỡ tiếng (rè) khi bật loa to / Live Studio khuếch đại thêm
    const vcfg = this.cfg.voice;
    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.value = vcfg.gain;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = vcfg.limitDb;
    limiter.knee.value = 4;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    this.voiceGain.connect(limiter);
    limiter.connect(ctx.destination);
    // Bộ đệm nhiễu trắng dùng chung cho tiếng gió, va chạm, chũm chọe
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
    this.applyVolumes();
    this.nextStepAt = ctx.currentTime + 0.1;
    // Nhịp xếp lịch nhạc do RaceScene (BackgroundTicker, chạy trong Worker) gọi scheduleMusic để không bị chậm khi tab ẩn;
    // setInterval này chỉ là dự phòng khi chưa có ai gọi
    this.timer = setInterval(() => this.scheduleMusic(), TICK_MS);
    return ctx;
  }

  /** Đưa một phần tử <audio> (giọng MC) qua đường giảm + giới hạn đỉnh. Trả về false nếu chưa thể (khi đó phát bình thường). */
  routeVoice(el, gain = 1) {
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running' || !this.voiceGain) return false; // chưa mở khóa âm thanh: định tuyến lúc này sẽ im tiếng
    try {
      const g = ctx.createGain(); // hạ riêng từng câu để đỉnh về targetPeak (không vỡ tiếng)
      g.gain.value = gain;
      ctx.createMediaElementSource(el).connect(g);
      g.connect(this.voiceGain);
      return true;
    } catch {
      return false;
    }
  }

  /** Đỉnh biên độ lớn nhất (0 đến lớn hơn 1 nếu file vượt đỉnh) của một file âm thanh; null nếu không giải mã được. */
  async peakOf(arrayBuffer) {
    const ctx = this.ensure();
    if (!ctx) return null;
    try {
      const buf = await ctx.decodeAudioData(arrayBuffer);
      let peak = 0;
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < d.length; i++) {
          const v = d[i] < 0 ? -d[i] : d[i];
          if (v > peak) peak = v;
        }
      }
      return peak;
    } catch {
      return null;
    }
  }

  /** Gọi từ cử chỉ của người dùng để trình duyệt cho phát. */
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const c = this.cfg;
    this.master.gain.setTargetAtTime(this.enabled ? c.master : 0, t, 0.05);
    this.musicGain.gain.setTargetAtTime(this.musicOn ? c.musicVolume : 0, t, 0.15);
    this.sfxGain.gain.setTargetAtTime(this.sfxOn ? c.sfxVolume : 0, t, 0.02);
  }

  toggleAll() {
    this.enabled = !this.enabled;
    this.applyVolumes();
    return this.enabled;
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    this.applyVolumes();
    return this.musicOn;
  }

  /** Lúc đang đua nhạc có thêm nhịp chũm chọe; các trạng thái khác nhạc êm hơn. */
  setMood(state) {
    this.intense = state === 'race';
  }

  get silent() {
    return !this.enabled || !this.sfxOn;
  }

  /** Phát một tiếng theo tên. volume 0 đến 1. */
  play(name, volume = 1) {
    if (this.silent || !SOUNDS[name]) return;
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1) < this.cfg.sfxMinGap) return;
    if (this.voices >= this.cfg.maxVoices) return;
    this.lastPlayed.set(name, now);
    SOUNDS[name](this, now, volume);
  }

  // Một tiếng "ting": dao động có đường bao âm lượng, tần số trượt từ f0 sang f1
  tone({ type = 'sine', f0, f1 = f0, at, dur = 0.2, vol = 0.5, attack = 0.008, dest }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(dest ?? this.sfxGain);
    this.voices++;
    osc.onended = () => {
      this.voices--;
      g.disconnect();
    };
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  // Tiếng ồn qua bộ lọc (gió vút, va đập, chũm chọe). f1 khác f0 thì tần số lọc trượt dần
  hiss({ filter = 'lowpass', f0 = 1000, f1 = f0, q = 0.7, at, dur = 0.2, vol = 0.4, dest }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest ?? this.sfxGain);
    this.voices++;
    src.onended = () => {
      this.voices--;
      g.disconnect();
    };
    src.start(at);
    src.stop(at + dur + 0.05);
  }

  // Xếp lịch các nốt nhạc nền sắp tới (chạy mỗi 100 ms, xếp trước một chút để không đứt quãng)
  scheduleMusic() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state !== 'running') {
      this.nextStepAt = ctx.currentTime + 0.1; // đang bị treo thì đừng dồn nốt
      return;
    }
    const beat = 60 / this.cfg.musicBpm / 2; // một nốt móc đơn
    if (this.nextStepAt < ctx.currentTime) this.nextStepAt = ctx.currentTime + 0.05;
    while (this.nextStepAt < ctx.currentTime + LOOKAHEAD) {
      if (this.enabled && this.musicOn) this.playMusicStep(this.step, this.nextStepAt, beat);
      this.step = (this.step + 1) % LOOP_STEPS;
      this.nextStepAt += beat;
    }
  }

  playMusicStep(step, at, beat) {
    const dest = this.musicGain;
    for (const n of musicStep(step, this.intense)) {
      const dur = n.beats * beat;
      if (n.voice === 'bass') this.tone({ f0: midiToHz(n.midi), at, dur, vol: 0.5 * n.vel, attack: 0.02, dest });
      else if (n.voice === 'pluck') this.tone({ type: 'triangle', f0: midiToHz(n.midi), at, dur, vol: 0.32 * n.vel, dest });
      else this.hiss({ filter: 'highpass', f0: 7000, at, dur, vol: 0.12 * n.vel, dest });
    }
  }

  destroy() {
    clearInterval(this.timer);
    this.ctx?.close();
    this.ctx = null;
  }
}

// Bảng tiếng. Mỗi hàm nhận (engine, thời điểm, âm lượng) và dựng tiếng bằng tone/hiss. Giữ ngắn và dịu.
const SOUNDS = {
  tick: (a, t, v) => a.tone({ f0: 660, at: t, dur: 0.16, vol: 0.55 * v }), // đếm ngược 3, 2, 1
  go: (a, t, v) => {
    a.tone({ type: 'triangle', f0: 880, f1: 1320, at: t, dur: 0.35, vol: 0.6 * v });
    a.tone({ f0: 1320, at: t + 0.05, dur: 0.4, vol: 0.35 * v });
  },
  boost: (a, t, v) => {
    a.tone({ f0: 420, f1: 900, at: t, dur: 0.2, vol: 0.28 * v });
    a.hiss({ filter: 'highpass', f0: 3000, at: t, dur: 0.12, vol: 0.1 * v });
  },
  gift: (a, t, v) => [880, 1175, 1568].forEach((f, i) => a.tone({ type: 'triangle', f0: f, at: t + i * 0.08, dur: 0.22, vol: 0.4 * v })),
  hit: (a, t, v) => {
    a.hiss({ f0: 900, f1: 200, at: t, dur: 0.22, vol: 0.5 * v });
    a.tone({ f0: 170, f1: 60, at: t, dur: 0.22, vol: 0.55 * v });
  },
  hammer: (a, t, v) => {
    a.tone({ f0: 95, f1: 38, at: t, dur: 0.32, vol: 0.7 * v });
    a.hiss({ f0: 500, f1: 120, at: t, dur: 0.3, vol: 0.5 * v });
  },
  dodge: (a, t, v) => a.hiss({ filter: 'bandpass', f0: 700, f1: 2600, q: 1.2, at: t, dur: 0.16, vol: 0.28 * v }),
  win: (a, t, v) => {
    [523, 659, 784, 1047].forEach((f, i) => a.tone({ type: 'triangle', f0: f, at: t + i * 0.12, dur: 0.35, vol: 0.45 * v }));
    [523, 659, 784].forEach((f) => a.tone({ f0: f, at: t + 0.55, dur: 0.9, vol: 0.28 * v }));
  },
};
