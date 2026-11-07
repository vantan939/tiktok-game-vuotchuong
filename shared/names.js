// Lọc nickname trước khi hiển thị (dùng chung client và server). Logic thuần.
// Nickname lấy từ người xem TikTok nên có thể chứa từ nhạy cảm, quá dài, hoặc ký tự font game không vẽ được
// (chữ nước khác, emoji, ký tự điều khiển). Không dùng được thì thay bằng tên dự phòng ổn định theo userId.

export const MAX_NAME_LENGTH = 24;
const MIN_NAME_LENGTH = 1;

// Ký tự được giữ: chữ Latin (có dấu tiếng Việt), số, khoảng trắng và vài dấu thông dụng. Font game chỉ vẽ được các ký tự này.
const KEEP = /[\p{Script=Latin}\p{N} _.\-']/u;
// Ký tự vô hình hoặc điều khiển (zero-width, đảo chiều chữ...) dùng để lừa hiển thị
const INVISIBLE = /[\p{C}​-‏‪-‮⁠-⁯﻿]/gu;

// Từ nhạy cảm. 'chuoi' khớp nằm trong tên (đã bỏ dấu, bỏ khoảng trắng và ký tự thay thế như 0 cho o);
// 'tu' chỉ khớp khi là một từ riêng (tránh nhầm với tên bình thường như Essex, Dickens, Massa).
const SUBSTRING = [
  'ditme', 'dumaa', 'dume', 'concac', 'caclon', 'cailon', 'dithang', 'conditmay', 'lonmay',
  'fuck', 'shit', 'bitch', 'nigger', 'nigga', 'faggot', 'whore', 'cunt', 'pussy', 'asshole', 'motherfucker',
  'hitler', 'nazi', 'jihad', 'isis',
];
const WORDS = new Set(['dm', 'dmm', 'dcm', 'dcl', 'vcl', 'vkl', 'cc', 'cac', 'lon', 'buoi', 'sex', 'dick', 'porn', 'xxx', 'ass', 'anal', 'rape']);
// Cụm từ nhiều chữ (khớp khi đứng riêng, đã bỏ dấu): tách rời thì vô hại nhưng đi liền là chửi thề
const PHRASES = ['du ma', 'dit me', 'dit con', 'con cac', 'cai lon', 'lon me', 'de me', 'dm may', 'cut me'];

// Ký tự thường dùng để viết lách từ nhạy cảm (0 -> o, 1 -> i, 3 -> e, 4 -> a, 5 -> s, @ -> a, $ -> s)
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', '@': 'a', $: 's' };

/** Bỏ dấu, thường hóa, thay ký tự viết lách; giữ khoảng trắng để tách từ. */
function skeleton(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[0134 5@$]/g, (c) => LEET[c] ?? c)
    .replace(/[_.\-']+/g, ' ');
}

/** Tên có chứa từ nhạy cảm, đường dẫn hoặc kiểu quảng cáo không. */
export function isSensitive(name) {
  const s = skeleton(String(name ?? ''));
  const compact = s.replace(/\s+/g, '');
  if (SUBSTRING.some((w) => compact.includes(w))) return true;
  if (s.split(/\s+/).some((w) => WORDS.has(w))) return true;
  const padded = ` ${s.replace(/\s+/g, ' ').trim()} `;
  if (PHRASES.some((p) => padded.includes(` ${p} `))) return true;
  if (/https?|www|\.com|\.vn|\.net|t\.me|zalo|inbox/i.test(String(name))) return true;
  return false;
}

/** Tên dự phòng ổn định theo userId, ví dụ "Người chơi 4821". */
export function fallbackName(userId) {
  let h = 2166136261;
  for (const c of String(userId ?? '')) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return `Người chơi ${1000 + ((h >>> 0) % 9000)}`;
}

/**
 * Nickname an toàn để hiển thị: bỏ ký tự vô hình và ký tự font không vẽ được; thay bằng tên dự phòng nếu còn
 * quá ngắn, quá dài (> MAX_NAME_LENGTH) hoặc chứa từ nhạy cảm.
 */
export function sanitizeNickname(nickname, userId) {
  const cleaned = [...String(nickname ?? '').normalize('NFC').replace(INVISIBLE, '')]
    .filter((c) => KEEP.test(c))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  const letters = [...cleaned].filter((c) => /[\p{L}\p{N}]/u.test(c)).length;
  if (letters < MIN_NAME_LENGTH || [...cleaned].length > MAX_NAME_LENGTH || isSensitive(cleaned) || isSensitive(nickname)) {
    return fallbackName(userId);
  }
  return cleaned;
}
