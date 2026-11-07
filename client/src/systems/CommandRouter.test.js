import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../core/EventBus.js';
import { CommandRouter } from './CommandRouter.js';

const user = { userId: 'u1', nickname: 'Lan', avatarUrl: '' };

test('CommandRouter: bình luận join và s thành lệnh', () => {
  const bus = new EventBus();
  const router = new CommandRouter(bus, () => 0);
  const got = [];
  router.onCommand((c) => got.push(c.command));
  bus.emit({ type: 'chat', ...user, text: 'JOIN' });
  bus.emit({ type: 'chat', ...user, userId: 'u2', text: ' s ' });
  assert.deepEqual(got, ['join', 's']);
});

test('CommandRouter: người xem chỉ vào phòng live (sự kiện join) thì KHÔNG tự vào đua', () => {
  const bus = new EventBus();
  const router = new CommandRouter(bus, () => 0);
  const got = [];
  router.onCommand((c) => got.push(c));
  bus.emit({ type: 'join', ...user });
  assert.deepEqual(got, []);
  bus.emit({ type: 'chat', ...user, text: 'join' });
  assert.equal(got.length, 1, 'gõ join thì vào');
});
