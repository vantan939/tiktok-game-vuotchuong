import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEvent } from '../../../shared/events.js';
import { GiftStreaks } from './gifts.js';

const user = { userId: '123', nickname: 'Lan', profilePicture: { url: ['https://cdn/a.jpg'] } };
const rose = { giftType: 1, giftName: 'Hoa hồng', diamondCount: 1 };
const lion = { giftType: 2, giftName: 'Sư tử', diamondCount: 29999 };
const msg = (detail, repeatCount, repeatEnd, extra = {}) => ({ user, giftDetails: detail, giftId: 5655, groupId: 'g1', repeatCount, repeatEnd, ...extra });

test('quà liên hoàn: sự kiện đầu báo ngay một quà, giữa chuỗi bỏ qua, cuối chuỗi báo nâng cấp với tổng giá trị', () => {
  const g = new GiftStreaks();
  const first = g.handle(msg(rose, 1, 0));
  assert.deepEqual([first.diamonds, first.followUp], [1, undefined]);
  assert.ok(isValidEvent(first));
  assert.equal(g.handle(msg(rose, 2, 0)), null);
  assert.equal(g.handle(msg(rose, 9, 0)), null);
  const end = g.handle(msg(rose, 12, 1));
  assert.deepEqual([end.diamonds, end.followUp, end.unitDiamonds, end.giftName], [12, true, 1, 'Hoa hồng']);
  assert.ok(isValidEvent(end));
});

test('quà liên hoàn chỉ một lần: báo ngay ở sự kiện đầu, sự kiện kết thúc không báo thêm', () => {
  const g = new GiftStreaks();
  assert.equal(g.handle(msg(rose, 1, 0)).diamonds, 1);
  assert.equal(g.handle(msg(rose, 1, 1)), null);
});

test('quà thường (không liên hoàn) báo ngay, một lần duy nhất', () => {
  const g = new GiftStreaks();
  const e = g.handle(msg(lion, 1, 0));
  assert.deepEqual([e.giftName, e.diamonds, e.followUp], ['Sư tử', 29999, undefined]);
});

test('lỡ sự kiện đầu của chuỗi thì tính trọn chuỗi lúc kết thúc như cũ; hai người cùng lúc không lẫn nhau', () => {
  const g = new GiftStreaks();
  const late = g.handle(msg(rose, 7, 1));
  assert.deepEqual([late.diamonds, late.followUp], [7, undefined]);
  const other = { ...user, userId: '999' };
  const a = g.handle(msg(rose, 1, 0));
  const b = g.handle({ ...msg(rose, 1, 0), user: other });
  assert.ok(a && b, 'mỗi người có chuỗi riêng');
  assert.equal(g.handle(msg(rose, 3, 0)), null);
  assert.equal(g.handle({ ...msg(rose, 4, 1), user: other }).diamonds, 4);
});
