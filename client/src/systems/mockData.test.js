import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK, MOCK_NAMED, mockFillers } from './mockData.js';

test('dữ liệu mock đúng như mockup', () => {
  assert.deepEqual(
    MOCK.top.map((t) => `${t.name} ${t.percent}%`),
    ['RainDev 68%', 'MinhGaming 66%', 'Cherry 64%', 'KhoaVN 62%', 'Gamer88 60%', 'LinhCute 58%', 'BaoPro 56%', 'NấmNè 55%', 'TuấnAnh 54%', 'MèoMập 53%'],
  );
  assert.equal(MOCK.elapsed, 156);
  assert.equal(MOCK.total, 180);
  assert.equal(MOCK.racing, 30);
  assert.equal(MOCK.queueTotal, 12);
  assert.equal(MOCK.queueBase + 1, 31);
  assert.equal(MOCK.queueShown, 5);
});

test('mọi người có tên đều có vị trí, RainDev ở giữa trước, MinhGaming bên trái, Gamer88 bên phải', () => {
  for (const t of MOCK.top) assert.ok(MOCK_NAMED[t.name], `thiếu vị trí ${t.name}`);
  const { RainDev, MinhGaming, Gamer88 } = MOCK_NAMED;
  assert.equal(RainDev.lane, 1);
  assert.ok(MinhGaming.lane < RainDev.lane && Gamer88.lane > RainDev.lane);
  for (const [name, p] of Object.entries(MOCK_NAMED)) if (name !== 'RainDev') assert.ok(p.z > RainDev.z, `${name} phải xa hơn người đi đầu`);
});

test('nhân vật không tên rải cố định và xa dần', () => {
  const a = mockFillers(20);
  assert.deepEqual(a, mockFillers(20), 'cố định, không ngẫu nhiên');
  assert.equal(a.length, 20);
  assert.ok(a[19].z > a[0].z);
});
