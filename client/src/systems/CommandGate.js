import { CONFIG } from '../config.js';
import { parseCommand } from '../../../shared/events.js';

// Lọc bình luận: chỉ cho qua lệnh hợp lệ ('join'), mỗi người tối đa 1 lệnh mỗi cooldown.
// Logic thuần, thời gian truyền vào nên test được.
export class CommandGate {
  constructor(cooldownSeconds = CONFIG.commandCooldownSeconds) {
    this.cooldownMs = cooldownSeconds * 1000;
    this.lastAccepted = new Map(); // userId -> thời điểm lệnh được nhận gần nhất (ms)
  }

  /** Trả về 'join' nếu nhận, null nếu bỏ qua (không phải lệnh hoặc đang cooldown). */
  accept(userId, text, nowMs) {
    const command = parseCommand(text);
    if (!command) return null;

    const last = this.lastAccepted.get(userId);
    if (last !== undefined && nowMs - last < this.cooldownMs) return null;

    this.lastAccepted.set(userId, nowMs);
    this.prune(nowMs);
    return command;
  }

  // Dọn người đã hết cooldown để Map không phình mãi trong buổi live dài
  prune(nowMs) {
    if (this.lastAccepted.size < CONFIG.commandGateMaxEntries) return;
    for (const [id, t] of this.lastAccepted) {
      if (nowMs - t >= this.cooldownMs) this.lastAccepted.delete(id);
    }
  }
}
