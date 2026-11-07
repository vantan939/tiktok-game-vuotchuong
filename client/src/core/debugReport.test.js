import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DebugReporter, describeLobby } from './debugReport.js';

test('describeLobby: liệt kê người thật đang đua, người chờ lượt sau (✓) và hàng đợi, bỏ bot', () => {
  const racers = [
    { userId: 'a', nickname: 'Rain', isBot: false },
    { userId: 'b1', nickname: 'Bot1', isBot: true },
    { userId: 'b', nickname: 'Nam', isBot: false },
  ];
  const lobby = {
    players: [{ userId: 'a', nickname: 'Rain' }, { userId: 'b', nickname: 'Nam' }, { userId: 'c', nickname: 'Lan' }],
    queue: [{ userId: 'd', nickname: 'Minh' }, { userId: 'e', nickname: 'Hà' }],
  };
  assert.equal(
    describeLobby({ round: 3, state: 'race', racers, lobby }),
    'lượt 3 (race) | đang đua 2/3: Rain, Nam | chờ lượt sau (✓) 1: Lan | hàng đợi 2: Minh, Hà',
  );
  assert.match(describeLobby({ round: 1, state: 'wait', racers: [], lobby: { players: [], queue: [] } }), /đang đua 0\/3: - \| chờ lượt sau \(✓\) 0: - \| hàng đợi 0: -/);
});

test('DebugReporter: chỉ gửi khi nội dung đổi và đã quá khoảng nghỉ; sự kiện rời luôn gửi; không ném lỗi', () => {
  let t = 0;
  const sent = [];
  const r = new DebugReporter((b) => sent.push(b), () => t, 500);
  assert.equal(r.state('A'), true);
  assert.equal(r.state('A'), false, 'không đổi');
  t = 100;
  assert.equal(r.state('B'), false, 'đổi nhưng còn quá sớm');
  t = 700;
  assert.equal(r.state('B'), true);
  r.event('join: Nam -> queued');
  assert.deepEqual(sent.map((b) => b.message), ['A', 'B', 'join: Nam -> queued']);
  assert.ok(sent.every((b) => b.kind === 'info'));
  const bad = new DebugReporter(() => { throw new Error('mạng'); });
  assert.doesNotThrow(() => bad.event('x'));
});
