import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { depthForDist } from './Projection.js';

test('depthForDist: gần camera (dist nhỏ) nằm trên, xa (dist lớn) nằm dưới, luôn trong 10 đến 11', () => {
  assert.ok(depthForDist(100) > depthForDist(200), 'người đứng sau (gần camera) che người đứng trước');
  assert.ok(depthForDist(0) > depthForDist(CONFIG.trackLength));
  for (const d of [-60, 0, 1234, CONFIG.trackLength]) {
    const z = depthForDist(d);
    assert.ok(z >= 10 && z <= 11.02, `dist ${d} ra ${z}`);
  }
  // hai nhân vật cách nhau 1 đơn vị vẫn phân biệt được thứ tự
  assert.ok(depthForDist(2000) > depthForDist(2001));
});

test('chướng ngại vẽ ngay sau nhân vật khi cùng quãng đường, và nhân vật phía sau chướng ngại thì nằm trên nó', () => {
  const obstacle = (dist) => depthForDist(dist) - 0.0001;
  assert.ok(depthForDist(500) > obstacle(500), 'cùng chỗ thì nhân vật nằm trên');
  assert.ok(depthForDist(490) > obstacle(500), 'nhân vật còn ở phía trước chướng ngại (gần camera hơn) thì che nó');
  assert.ok(depthForDist(510) < obstacle(500), 'đã chạy qua chướng ngại thì nằm sau nó');
});
