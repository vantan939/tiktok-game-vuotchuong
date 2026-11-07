// Chuyển sự kiện thô của tiktok-live-connector sang GameEvent chung (shared/events.js). Logic thuần, test được.
// Thư viện không chính thức nên tên trường có thể khác giữa các phiên bản (comment/content, likeCount/count,
// userId/id, uniqueId/displayId, giftDetails/gift...). Các hàm ở đây chấp nhận cả hai kiểu để chịu được thay đổi nhỏ.

import { sanitizeNickname } from '../../../shared/names.js';

const first = (...values) => values.find((v) => v !== undefined && v !== null && v !== '');
const str = (v) => (v === undefined || v === null ? '' : String(v));

/** Lấy đường dẫn ảnh đầu tiên từ ImageModel ({ url: [] } hoặc { urlList: [] }). */
function imageUrl(image) {
  const list = image?.url ?? image?.urlList ?? [];
  return typeof list === 'string' ? list : (list[0] ?? '');
}

/** { userId, nickname, avatarUrl } từ đối tượng user của TikTok; null nếu không xác định được người dùng. */
export function userOf(user) {
  if (!user) return null;
  const userId = str(first(user.userId, user.id, user.idStr, user.uniqueId, user.displayId));
  if (!userId) return null;
  const uniqueId = str(first(user.uniqueId, user.displayId));
  return {
    userId,
    nickname: sanitizeNickname(str(first(user.nickname, uniqueId)), userId), // lọc từ nhạy cảm, tên dài, ký tự lạ
    avatarUrl: imageUrl(first(user.profilePicture, user.profilePictureMedium, user.avatarThumb, user.avatarMedium)),
  };
}

/** Bình luận → { type: 'chat', text }. Bình luận trống bị bỏ. */
export function fromChat(data) {
  const user = userOf(data?.user);
  const text = str(first(data?.comment, data?.content));
  if (!user || !text.trim()) return null;
  return { type: 'chat', ...user, text };
}

/** Thả tim → { type: 'like', likeCount }. Số lần chạm lấy từ likeCount (hoặc count). */
export function fromLike(data) {
  const user = userOf(data?.user);
  const likeCount = Number(first(data?.likeCount, data?.count));
  if (!user || !(likeCount > 0)) return null;
  return { type: 'like', ...user, likeCount };
}

/** Người xem vào phòng live → { type: 'join' } (không phải lệnh gõ join để vào đua). */
export function fromMember(data) {
  const user = userOf(data?.user);
  return user ? { type: 'join', ...user } : null;
}

/**
 * Quà → { type: 'gift', giftName, diamonds }, chỉ khi quà KẾT THÚC chuỗi.
 * Quà liên hoàn (giftType 1) bắn nhiều sự kiện với repeatCount tăng dần rồi một sự kiện cuối có repeatEnd;
 * chỉ tính sự kiện cuối để không đếm lặp. Quà không liên hoàn tính ngay một lần.
 * diamonds là tổng giá trị: kim cương mỗi quà nhân số lần trong chuỗi.
 */
export function fromGift(data) {
  const user = userOf(data?.user);
  if (!user) return null;
  const detail = first(data.giftDetails, data.gift, data.extendedGiftInfo) ?? {};
  const giftType = Number(first(detail.giftType, detail.type));
  if (giftType === 1 && !data.repeatEnd) return null; // chuỗi quà đang chạy, chờ sự kiện kết thúc
  const unit = Number(first(detail.diamondCount, detail.diamond_count));
  const repeat = Math.max(1, Number(first(data.repeatCount, data.comboCount)) || 1);
  const diamonds = Number.isFinite(unit) ? unit * repeat : 0;
  const giftName = str(first(detail.giftName, detail.name, data.giftName)) || `Quà ${str(data.giftId)}`.trim();
  return { type: 'gift', ...user, giftName, diamonds };
}
