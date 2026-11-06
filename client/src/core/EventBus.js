import { isValidEvent } from '../../../shared/events.js';

// Mọi sự kiện từ TikTok/demo đi qua đây. Đăng ký theo type hoặc '*' để nhận tất cả.
export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  /** Trả về hàm hủy đăng ký. */
  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  emit(event) {
    if (!isValidEvent(event)) {
      console.warn('[EventBus] bỏ qua sự kiện sai dạng', event);
      return;
    }
    this.handlers.get(event.type)?.forEach((h) => h(event));
    this.handlers.get('*')?.forEach((h) => h(event));
  }
}
