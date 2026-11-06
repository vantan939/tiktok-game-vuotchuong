import { CommandGate } from './CommandGate.js';

// Nghe EventBus, lọc bằng CommandGate rồi gọi handler cho từng lệnh hợp lệ.
// Sự kiện type 'join' (nếu nguồn nào đó phát) được coi như lệnh join.
export class CommandRouter {
  constructor(bus, now = () => performance.now()) {
    this.gate = new CommandGate();
    this.now = now;
    this.handlers = [];
    bus.on('chat', (e) => this.route(e, e.text));
    bus.on('join', (e) => this.route(e, 'join'));
  }

  /** handler({ command: 'join'|'s', user: { userId, nickname, avatarUrl } }) */
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
