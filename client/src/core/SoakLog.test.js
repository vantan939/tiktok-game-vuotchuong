import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SoakLog, SOAK_HEADER } from './SoakLog.js';

function make(over = {}) {
  let t = Date.parse('2026-01-01T00:00:00Z');
  const rows = [];
  let fire;
  const heaps = over.heaps ?? [];
  let i = 0;
  const log = new SoakLog({
    reportEverySeconds: 30, sampleEverySeconds: 10,
    getHeap: () => (heaps.length ? heaps[i++] * 1048576 : null),
    getExtra: () => ({ round: 3, phaser: 120, dom: 340, racers: 30 }),
    sink: (h, line) => rows.push([h, line]),
    now: () => t, setTimer: (fn) => { fire = fn; },
  });
  return { log, rows, step: (ms) => { t += ms; fire(); } };
}

test('ghi dòng đầu lúc khởi động, rồi mỗi mốc một dòng với heap thấp nhất, cao nhất và FPS', () => {
  const { log, rows, step } = make({ heaps: [50, 80, 60, 70, 90, 55] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], SOAK_HEADER);
  for (let k = 0; k < 60 * 30; k++) log.frame(); // 1800 khung trong 30 giây
  step(10000); step(10000); step(10000);
  assert.equal(rows.length, 2);
  const cols = rows[1][1].split(',');
  assert.equal(cols.length, SOAK_HEADER.split(',').length);
  assert.deepEqual(cols.slice(1), ['0.5', '3', '60.0', '80.0', '120', '340', '30', '60.0']);
});

test('không đọc được heap thì ghi n/a, không lỗi', () => {
  const { rows, step } = make();
  step(30000);
  assert.equal(rows[1][1].split(',')[3], 'n/a');
});
