import { el } from './Frame.js';

/**
 * Chấm trạng thái kết nối nhỏ ở góc trên phải: xanh (đang nhận sự kiện), vàng (đang kết nối lại), đỏ (mất kết nối).
 * Không chiếm chỗ và nhỏ để hợp khi quay; phím tắt (CONFIG.net.statusKey) ẩn hoặc hiện lại.
 */
export class NetDot {
  constructor(parent, net) {
    this.net = net;
    this.node = el('div', 'netdot');
    parent.append(this.node);
    this.color = '';
    this.label = '';
    this.hidden = false;
  }

  update(now) {
    const color = this.net.color(now);
    const label = this.net.label(now);
    if (color !== this.color) {
      this.color = color;
      this.node.className = `netdot netdot--${color}${this.hidden ? ' is-hidden' : ''}`;
    }
    if (label !== this.label) {
      this.label = label;
      this.node.title = label;
    }
  }

  toggle() {
    this.hidden = !this.hidden;
    this.node.classList.toggle('is-hidden', this.hidden);
    return !this.hidden;
  }
}
