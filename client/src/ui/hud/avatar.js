import { AvatarCache } from '../../core/AvatarCache.js';
import { hashString } from '../../systems/Racer.js';

// Avatar tròn bằng HTML: hiện ảnh mặc định ngay (màu theo userId), tải xong ảnh thật thì thay.
// Ảnh nạp bằng thẻ <img> thường nên không cần CORS; lỗi hoặc quá hạn thì giữ ảnh mặc định (AvatarCache nhớ url lỗi).

const COLORS = ['#ff8a1f', '#35c759', '#8a4bff', '#ff4fa8', '#1e9bff', '#e0243c'];
const PERSON = '<svg viewBox="0 0 100 100"><circle cx="50" cy="40" r="19" fill="#fff"/><path d="M14 104 Q14 64 50 64 Q86 64 86 104Z" fill="#fff"/></svg>';

const cache = new AvatarCache(
  (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('không tải được avatar'));
      img.src = url;
    }),
);

/** Tạo avatar kích thước size (px). Trả về phần tử <span class="avatar">. */
export function createAvatar(userId, url, size, extraClass = '') {
  const node = document.createElement('span');
  node.className = `avatar ${extraClass}`.trim();
  node.style.width = `${size}px`;
  node.style.height = `${size}px`;
  node.style.setProperty('--av', COLORS[hashString(String(userId)) % COLORS.length]);
  node.innerHTML = PERSON;
  if (url) {
    cache.request(url).then((loaded) => {
      if (!loaded || !node.isConnected) return;
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      node.replaceChildren(img);
    });
  }
  return node;
}
