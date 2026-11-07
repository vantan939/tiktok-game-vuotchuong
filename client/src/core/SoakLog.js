import { serverHttpUrl } from './serverUrl.js';

export const SOAK_HEADER = 'time,minutes,round,heap_min_mb,heap_peak_mb,phaser_objects,dom_nodes,racers,fps';

// Chế độ soak (?demo=1&soak=1): chạy demo lâu và ghi mức RAM (JS heap) định kỳ để tìm rò bộ nhớ.
// Lấy mẫu heap mỗi sampleEverySeconds; mỗi reportEverySeconds ghi một dòng gồm heap thấp nhất (gần mức sau khi trình duyệt dọn rác,
// ít nhiễu) và cao nhất trong khoảng đó, FPS trung bình, số đối tượng Phaser, số phần tử DOM. Heap chỉ đọc được ở Chrome / Edge.
// Ghi ra file memory-log.csv qua server (POST /memlog); không có server thì in CSV ra console và lưu ở window.__soakCsv
// (gõ downloadSoakLog() ở Console để tải về).
export class SoakLog {
  constructor({
    reportEverySeconds = 300, sampleEverySeconds = 10, getHeap = defaultHeap, getExtra = () => ({}),
    sink = defaultSink, now = () => Date.now(), setTimer = (fn, ms) => setInterval(fn, ms),
  } = {}) {
    Object.assign(this, { reportEverySeconds, getHeap, getExtra, sink, now });
    this.startedAt = now();
    this.lastReportAt = this.startedAt;
    this.window = [];
    this.frames = 0;
    this.rows = [];
    setTimer(() => this.sample(), sampleEverySeconds * 1000);
    this.sample();
    this.report(); // dòng đầu: mức lúc khởi động
  }

  /** Gọi mỗi khung hình để tính FPS trung bình. */
  frame() {
    this.frames++;
  }

  sample() {
    const heap = this.getHeap();
    if (heap != null) this.window.push(heap);
    if (this.now() - this.lastReportAt >= this.reportEverySeconds * 1000) this.report();
  }

  report() {
    const t = this.now();
    const seconds = Math.max(0.001, (t - this.lastReportAt) / 1000);
    const heaps = this.window;
    let x = {};
    try {
      x = this.getExtra();
    } catch { /* thiếu số liệu phụ thì bỏ trống cột */ }
    const row = [
      new Date(t).toISOString(),
      ((t - this.startedAt) / 60000).toFixed(1),
      x.round ?? '',
      heaps.length ? mb(Math.min(...heaps)) : 'n/a',
      heaps.length ? mb(Math.max(...heaps)) : 'n/a',
      x.phaser ?? '',
      x.dom ?? '',
      x.racers ?? '',
      this.frames ? (this.frames / seconds).toFixed(1) : '',
    ].join(',');
    this.window = [];
    this.frames = 0;
    this.lastReportAt = t;
    this.rows.push(row);
    this.sink(SOAK_HEADER, row);
  }
}

const mb = (bytes) => (bytes / 1048576).toFixed(1);

function defaultHeap() {
  return globalThis.performance?.memory?.usedJSHeapSize ?? null;
}

// Ghi qua server; lỗi (không có server, hay chạy ?demo=1 không kèm server) thì in console và giữ trong window.__soakCsv
function defaultSink(header, line) {
  const keep = () => {
    const csv = globalThis.__soakCsv ?? (globalThis.__soakCsv = `${header}\n`);
    globalThis.__soakCsv = `${csv}${line}\n`;
    globalThis.downloadSoakLog ??= () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([globalThis.__soakCsv], { type: 'text/csv' }));
      a.download = 'memory-log.csv';
      a.click();
    };
    console.log(`[soak] ${line}`);
  };
  if (typeof fetch === 'undefined') return keep();
  fetch(`${serverHttpUrl()}/memlog`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ header, line }) })
    .then((res) => { if (!res.ok) keep(); else console.log(`[soak] ${line}`); })
    .catch(keep);
}
