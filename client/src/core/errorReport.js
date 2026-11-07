import { serverHttpUrl } from './serverUrl.js';

const REPEAT_MS = 30000; // cùng một lỗi chỉ báo lại sau bấy lâu, tránh tràn log khi lỗi lặp mỗi khung hình
const last = new Map();

/**
 * Báo lỗi: ghi console và gửi về server (terminal của server in ra), vì cửa sổ game khi quay không có Console để xem.
 * Không bao giờ ném lỗi và không làm chậm game (gửi không chờ).
 */
export function reportError(source, err, now = Date.now(), send = defaultSend) {
  const message = String(err?.message ?? err ?? 'lỗi không rõ');
  const key = `${source}:${message}`;
  if (now - (last.get(key) ?? -Infinity) < REPEAT_MS) return false;
  last.set(key, now);
  console.error(`[lỗi ${source}]`, err);
  try {
    send({ source, message, stack: String(err?.stack ?? '').split('\n').slice(0, 3).join(' | ') });
  } catch {
    // báo lỗi thất bại thì thôi
  }
  return true;
}

function defaultSend(body) {
  if (typeof fetch === 'undefined') return;
  fetch(`${serverHttpUrl()}/log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}

/** Bắt cả lỗi không ai xử lý (sự kiện, Promise) của cả trang. */
export function installGlobalErrorReporting() {
  window.addEventListener('error', (e) => reportError('trang', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => reportError('promise', e.reason));
}

export function resetErrorReportForTest() {
  last.clear();
}
