// Kiểu sự kiện dùng chung cho client và server.
// Mọi nguồn (TikTok thật, demo, replay) đều phát cùng một dạng sự kiện này.

export const EVENT_TYPES = ['chat', 'like', 'gift', 'join'];

/**
 * @typedef {Object} GameEvent
 * @property {'chat'|'like'|'gift'|'join'} type
 * @property {string} userId
 * @property {string} nickname
 * @property {string} avatarUrl
 * @property {string} [text]        với chat
 * @property {number} [likeCount]   với like
 * @property {string} [giftName]    với gift
 * @property {number} [diamonds]    với gift
 */

/** Chuẩn hóa bình luận: chữ thường, bỏ dấu, bỏ khoảng trắng thừa. Dùng lại mọi nơi. */
export function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Trả về 'join' nếu bình luận là lệnh hợp lệ (chỉ có một lệnh), ngược lại null. */
export function parseCommand(text) {
  const t = normalizeText(text);
  return t === 'join' ? t : null;
}

/** Kiểm tra một object có đúng dạng GameEvent không. */
export function isValidEvent(e) {
  if (!e || typeof e !== 'object') return false;
  if (!EVENT_TYPES.includes(e.type)) return false;
  if (typeof e.userId !== 'string' || !e.userId) return false;
  if (typeof e.nickname !== 'string') return false;
  if (e.type === 'chat' && typeof e.text !== 'string') return false;
  if (e.type === 'like' && !(e.likeCount > 0)) return false;
  if (e.type === 'gift' && typeof e.giftName !== 'string') return false;
  return true;
}
