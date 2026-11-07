import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CommandGate } from './CommandGate.js';
import { CommandRouter } from './CommandRouter.js';
import { EventBus } from '../core/EventBus.js';

const user = { userId: 'u1', nickname: 'A', avatarUrl: '' };

test('CommandGate: spam 20 lệnh join trong 1 giây chỉ tính 1', () => {
  const gate = new CommandGate(1);
  let accepted = 0;
  for (let i = 0; i < 20; i++) {
    if (gate.accept('u1', 'join', i * 50)) accepted++; // 0 đến 950 ms
  }
  assert.equal(accepted, 1);
});

test('CommandGate: hết cooldown thì nhận lại', () => {
  const gate = new CommandGate(1);
  assert.equal(gate.accept('u1', 'join', 0), 'join');
  assert.equal(gate.accept('u1', 'join', 999), null);
  assert.equal(gate.accept('u1', 'join', 1000), 'join');
});

test('CommandGate: cooldown tính riêng từng người', () => {
  const gate = new CommandGate(1);
  assert.equal(gate.accept('u1', 'join', 0), 'join');
  assert.equal(gate.accept('u2', 'join', 10), 'join');
});

test('CommandGate: bình luận thường không tốn cooldown', () => {
  const gate = new CommandGate(1);
  assert.equal(gate.accept('u1', 'hello', 0), null);
  assert.equal(gate.accept('u1', 'JOIN', 10), 'join');
});

test('CommandGate: lệnh bị bỏ qua không làm trễ cooldown', () => {
  const gate = new CommandGate(1);
  gate.accept('u1', 'join', 0);
  gate.accept('u1', 'join', 900); // bị bỏ qua, không đẩy mốc cooldown
  assert.equal(gate.accept('u1', 'join', 1000), 'join');
});

test('CommandRouter: 20 bình luận join trong 1 giây chỉ gọi handler 1 lần', () => {
  const bus = new EventBus();
  let t = 0;
  const router = new CommandRouter(bus, () => t);
  const got = [];
  router.onCommand((c) => got.push(c));
  for (let i = 0; i < 20; i++) {
    t = i * 50;
    bus.emit({ type: 'chat', text: i % 2 ? 'S ' : 'join', ...user });
  }
  bus.emit({ type: 'chat', text: 'xin chào', ...user });
  assert.equal(got.length, 1);
  assert.equal(got[0].command, 'join');
  assert.equal(got[0].user.nickname, 'A');
});
