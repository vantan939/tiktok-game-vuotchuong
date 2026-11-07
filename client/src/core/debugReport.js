import { CONFIG } from '../config.js';
import { serverHttpUrl } from './serverUrl.js';

// Báo trạng thái game về terminal của server (npm run dev) để streamer xem khi quay, vì cửa sổ game không có Console.
// Chỉ gửi khi nội dung đổi và không quá dày. Không bao giờ ném lỗi.

/** Chuỗi mô tả ai đang đua và ai trong hàng đợi (chỉ người thật, bỏ bot). ✓ là người sẽ vào đua ở lượt kế. */
export function describeLobby({ round, state, racers, lobby }) {
  const names = (list) => (list.length ? list.join(', ') : '-');
  const racing = racers.filter((r) => !r.isBot).map((r) => r.nickname);
  const queued = lobby.queue.map((p, i) => (i < CONFIG.maxPlayers ? `${p.nickname}✓` : p.nickname));
  return `lượt ${round} (${state}) | đang đua ${racing.length}/${CONFIG.maxPlayers}: ${names(racing)} | hàng đợi ${queued.length} (✓ = vào đua lượt kế): ${names(queued)}`;
}

export class DebugReporter {
  constructor(send = defaultSend, now = () => Date.now(), minGapMs = 500) {
    this.send = send;
    this.now = now;
    this.minGapMs = minGapMs;
    this.lastText = '';
    this.lastAt = -Infinity;
  }

  /** Gửi dòng trạng thái nếu khác lần trước và đã quá khoảng nghỉ tối thiểu. Trả về true nếu đã gửi. */
  state(text) {
    const t = this.now();
    if (text === this.lastText || t - this.lastAt < this.minGapMs) return false;
    this.lastText = text;
    this.lastAt = t;
    this.push(text);
    return true;
  }

  /** Gửi một sự kiện rời (ví dụ kết quả join), không bị gộp. */
  event(text) {
    this.push(text);
  }

  push(text) {
    try {
      this.send({ kind: 'info', message: text });
    } catch {
      // báo thất bại thì thôi
    }
  }
}

function defaultSend(body) {
  if (typeof fetch === 'undefined') return;
  fetch(`${serverHttpUrl()}/log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}
