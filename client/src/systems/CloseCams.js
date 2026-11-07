import { CONFIG } from '../config.js';

/**
 * Camera cận tự động cho người chơi (logic thuần). Khán giả xem cảnh toàn đoàn như thường; mỗi người ĐANG CHƠI trong lượt
 * (người thật, không phải bot) có một cửa sổ cận cảnh riêng bám nhân vật của mình, xếp theo thứ tự xuất phát,
 * tối đa maxCloseCams cửa sổ. Không cần gõ lệnh. Hết lượt (màn kết quả) thì tắt hết, lượt mới tự bật lại.
 */
export class CloseCams {
  constructor(manager, cfg = CONFIG) {
    this.manager = manager;
    this.cfg = cfg;
    this.cams = []; // { racer, since }
    manager.addListener((e) => {
      if ((e.type === 'state' && e.state === 'result') || e.type === 'round') this.clear();
    });
  }

  /** Gọi mỗi khung hình: đồng bộ danh sách cửa sổ với những người thật đang có mặt (vào đua giữa chừng thì tự có cửa sổ). */
  update(now) {
    const m = this.manager;
    if (m.state === 'result') {
      this.clear();
      return;
    }
    const players = m.racers.filter((r) => !r.isBot).slice(0, this.cfg.maxCloseCams);
    const same = players.length === this.cams.length && players.every((r, i) => this.cams[i].racer === r);
    if (same) return;
    // Giữ nguyên mốc thời gian của cửa sổ đã có
    this.cams = players.map((racer) => this.cams.find((c) => c.racer === racer) ?? { racer, since: now });
  }

  clear() {
    this.cams = [];
  }
}
