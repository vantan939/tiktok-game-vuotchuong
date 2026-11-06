// Component khung dùng chung cho mọi khung giao diện (HUD, Top 10, thẻ hướng dẫn, hàng đợi, camera cận, thông báo).
// Kiểu dáng (nền, viền gradient, vầng sáng, bóng) nằm ở token trong theme.js và lớp .frame--<variant>.

/** Tạo phần tử HTML nhanh. */
export function el(tag, className = '', html = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

/**
 * Tạo một khung. variant: 'blue' | 'purple' | 'gold' | 'clear'.
 * rect: { x, y, w, h } đặt tuyệt đối trên khung 1080x1920 (bỏ trống nếu để CSS tự đặt).
 */
export function createFrame({ variant = 'blue', className = '', html = '', rect = null } = {}) {
  const node = el('div', `frame frame--${variant} ${className}`.trim(), html);
  if (rect) {
    node.style.position = 'absolute';
    node.style.left = `${rect.x}px`;
    node.style.top = `${rect.y}px`;
    node.style.width = `${rect.w}px`;
    node.style.height = `${rect.h}px`;
  }
  return node;
}
