import { CONFIG } from '../config.js';

// Cache tải ảnh avatar theo url (logic thuần). loadImage(url) trả về Promise<ảnh>.
// Mỗi url chỉ tải một lần; lỗi hoặc quá hạn thì nhớ là lỗi để khỏi tải lại, người gọi dùng ảnh mặc định.
export class AvatarCache {
  constructor(loadImage, timeoutSeconds = CONFIG.avatarTimeoutSeconds) {
    this.loadImage = loadImage;
    this.timeoutMs = timeoutSeconds * 1000;
    this.entries = new Map(); // url -> Promise<ảnh | null>
  }

  /** Trả về Promise<ảnh | null>. null nghĩa là không có url, tải lỗi hoặc quá hạn. */
  request(url) {
    if (!url) return Promise.resolve(null);
    if (!this.entries.has(url)) this.entries.set(url, this.load(url));
    return this.entries.get(url);
  }

  load(url) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), this.timeoutMs);
      Promise.resolve()
        .then(() => this.loadImage(url))
        .catch(() => null)
        .then((img) => {
          clearTimeout(timer);
          resolve(img ?? null);
        });
    });
  }
}
