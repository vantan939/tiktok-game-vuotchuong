import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportError, resetErrorReportForTest } from './errorReport.js';

test('reportError: gửi lỗi về server, cùng lỗi lặp lại trong 30 giây thì chỉ báo một lần, không bao giờ ném lỗi', () => {
  resetErrorReportForTest();
  const realErr = console.error;
  console.error = () => {};
  try {
    const sent = [];
    const send = (b) => sent.push(b);
    const e = new Error('Cannot read properties of undefined');
    assert.equal(reportError('game', e, 1000, send), true);
    assert.equal(reportError('game', e, 5000, send), false, 'lặp quá sớm');
    assert.equal(reportError('game', new Error('lỗi khác'), 5000, send), true);
    assert.equal(reportError('game', e, 40000, send), true, 'quá 30 giây thì báo lại');
    assert.equal(sent.length, 3);
    assert.equal(sent[0].source, 'game');
    assert.match(sent[0].message, /Cannot read/);
    assert.ok(sent[0].stack.length > 0);
    assert.doesNotThrow(() => reportError('game', 'chuỗi thường', 99999, () => { throw new Error('gửi hỏng'); }));
  } finally {
    console.error = realErr;
  }
});
