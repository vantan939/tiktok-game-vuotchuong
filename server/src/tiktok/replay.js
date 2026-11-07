import { readFile, writeFile } from 'node:fs/promises';
import { isValidEvent } from '../../../shared/events.js';

const DEFAULT_GAP_MS = 500; // nếu mục không ghi thời điểm t thì cách mục trước chừng này

/**
 * Chuẩn hóa nội dung file replay thành [{ t, event }] theo thứ tự thời gian. Chấp nhận:
 *  - mảng { t: mili giây từ lúc bắt đầu, event: GameEvent } (định dạng do --record ghi ra),
 *  - hoặc mảng GameEvent thẳng (có thể kèm trường t), cách nhau DEFAULT_GAP_MS.
 * Sự kiện sai dạng bị bỏ và đếm vào skipped.
 */
export function parseReplay(json) {
  const list = Array.isArray(json) ? json : json?.events;
  if (!Array.isArray(list)) throw new Error('File replay phải là một mảng sự kiện (hoặc { "events": [...] })');
  const items = [];
  let skipped = 0;
  let last = -DEFAULT_GAP_MS;
  for (const raw of list) {
    const event = raw?.event ?? raw;
    const { t: _t, ...clean } = event && typeof event === 'object' ? event : {};
    if (!isValidEvent(clean)) {
      skipped++;
      continue;
    }
    const t = Number.isFinite(raw?.t) ? raw.t : Number.isFinite(event?.t) ? event.t : last + DEFAULT_GAP_MS;
    last = Math.max(last, t);
    items.push({ t, event: clean });
  }
  items.sort((a, b) => a.t - b.t);
  return { items, skipped };
}

export async function loadReplay(path) {
  return parseReplay(JSON.parse(await readFile(path, 'utf8')));
}

/**
 * Phát lại các sự kiện theo đúng nhịp thời gian đã ghi. speed > 1 phát nhanh hơn, loop = lặp lại mãi.
 * Trả về { stop() }. Có thể truyền setTimer giả để test.
 */
export function playReplay(items, emit, { speed = 1, loop = false, setTimer = setTimeout, clearTimer = clearTimeout, onEnd = () => {} } = {}) {
  let timer = null;
  let stopped = false;
  const total = items.length ? items[items.length - 1].t : 0;

  const run = () => {
    let i = 0;
    let clock = 0; // thời điểm (đã chia tốc độ) của sự kiện đang chờ
    const next = () => {
      if (stopped) return;
      if (i >= items.length) {
        if (loop && items.length) {
          timer = setTimer(run, 1000 / speed); // nghỉ một nhịp rồi lặp
        } else onEnd();
        return;
      }
      const { t, event } = items[i];
      const wait = Math.max(0, (t - clock) / speed);
      timer = setTimer(() => {
        clock = t;
        i++;
        emit(event);
        next();
      }, wait);
    };
    next();
  };
  run();
  return { stop: () => { stopped = true; clearTimer(timer); }, total };
}

/** Ghi lại các sự kiện đang phát để dùng làm file replay. */
export function createRecorder(path, now = () => Date.now()) {
  const start = now();
  const items = [];
  return {
    record: (event) => items.push({ t: now() - start, event }),
    get count() {
      return items.length;
    },
    save: () => writeFile(path, JSON.stringify(items, null, 2)),
  };
}
