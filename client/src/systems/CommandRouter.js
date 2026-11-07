import { CommandGate } from './CommandGate.js';

// Nghe EventBus, lọc bằng CommandGate rồi gọi handler cho từng lệnh hợp lệ.
// Chỉ bình luận (chat) mới là lệnh. Sự kiện type 'join' (người xem vào phòng live, TikTok member) KHÔNG tự động
// cho vào đua: luật là phải gõ join; không thì ai vào phòng cũng chiếm suất.
export class CommandRouter {
  constructor(bus, now = () => performance.now()) {
    this.gate = new CommandGate();
    this.now = now;
    this.handlers = [];
    bus.on('chat', (e) => this.route(e, e.text));
  }

  /** handler({ command: 'join', user: { userId, nickname, avatarUrl } }) */
  onCommand(handler) {
    this.handlers.push(handler);
  }

  route(event, text) {
    const command = this.gate.accept(event.userId, text, this.now());
    if (!command) return;
    const user = { userId: event.userId, nickname: event.nickname, avatarUrl: event.avatarUrl };
    this.handlers.forEach((h) => h({ command, user }));
  }
}
