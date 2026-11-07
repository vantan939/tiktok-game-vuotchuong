import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../core/EventBus.js';
import { CommandRouter } from './CommandRouter.js';

const user = { userId: 'u1', nickname: 'Lan', avatarUrl: '' };

test('CommandRouter: chỉ bình luận join là lệnh, lệnh s cũ không còn', () => {
  const bus = new EventBus();
  const router = new CommandRouter(bus, () => 0);
  const got = [];
  router.onCommand((c) => got.push(c.command));
  bus.emit({ type: 'chat', ...user, text: 'JOIN' });
  bus.emit({ type: 'chat', ...user, userId: 'u2', text: ' s ' }); // lệnh s đã bỏ
  assert.deepEqual(got, ['join']);
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
