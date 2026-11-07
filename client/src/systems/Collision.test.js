import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { findHit } from './Collision.js';
import { ObstacleField, hitReach, spikeDist } from './Obstacles.js';

const hammer = { id: 0, type: 'hammer', dist: 500, lane: 1, phase: 0, warn: 0.8 };
const spike = { id: 1, type: 'spike', dist: 500, lane: 1, phase: 0, warn: 0 };
const IMPACT = 1.5; // giữa pha búa nằm dưới sàn (1,4 đến 1,75 giây trong chu kỳ)
const racer = (over = {}) => ({ dist: 0, lane: 1, stun: 0, shield: 0, jump: 0, ...over });

test('búa: chỉ dính khi đang trong vùng gây dính và búa đang nằm dưới sàn', () => {
  const f = new ObstacleField([hammer]);
  const reach = hitReach(hammer);
  assert.equal(findHit(racer({ dist: 500 + reach - 0.05 }), f, IMPACT), hammer);
  assert.equal(findHit(racer({ dist: 500 - reach + 0.05 }), f, IMPACT), hammer);
  assert.equal(findHit(racer({ dist: 500 + reach + 0.05 }), f, IMPACT), null, 'đã đi qua khỏi vùng thì không còn dính');
  assert.equal(findHit(racer({ dist: 500 - reach - 0.05 }), f, IMPACT), null, 'chưa tới vùng');
  assert.equal(findHit(racer({ dist: 500 }), f, 0.5), null, 'búa đang nâng cao thì chạy dưới được');
});

test('vùng gây dính không rộng hơn nhiều so với hình: dưới 6 đơn vị mỗi phía', () => {
  assert.ok(hitReach(hammer) <= 5, `búa ${hitReach(hammer)}`);
  assert.ok(hitReach(spike) <= 4, `cầu gai ${hitReach(spike)}`);
});

test('quét theo đường đi: một bước dài băng qua vùng nguy hiểm vẫn bị tính dính', () => {
  const f = new ObstacleField([hammer]);
  const reach = hitReach(hammer);
  const r = racer({ dist: 500 + reach + 3 });
  assert.equal(findHit(r, f, IMPACT, CONFIG, 500 - reach - 3), hammer, 'bước nhảy qua cả vùng');
  assert.equal(findHit(r, f, 0.5, CONFIG, 500 - reach - 3), null, 'nhưng búa đang nâng thì không');
  assert.equal(findHit(racer({ dist: 500 + reach + 3 }), f, IMPACT, CONFIG, 500 + reach + 1), null, 'đã ở sau vùng cả hai bước');
});

test('cầu gai: tính theo vị trí đang lăn, không theo vị trí gốc', () => {
  const f = new ObstacleField([spike]);
  const now = CONFIG.spikeRollPeriod / 4; // sin = 1: lệch hẳn ra phía xa
  const at = spikeDist(spike, now);
  assert.ok(at > 500 + CONFIG.spikeRollAmp - 0.01);
  assert.equal(findHit(racer({ dist: at }), f, now), spike);
  assert.equal(findHit(racer({ dist: 500 }), f, now), null, 'vị trí gốc nay đã trống');
});

test('miễn nhiễm: khiên, choáng, nhảy qua cầu gai; làn khác thì không dính', () => {
  const f = new ObstacleField([hammer]);
  assert.equal(findHit(racer({ dist: 500, shield: 1 }), f, IMPACT), null);
  assert.equal(findHit(racer({ dist: 500, stun: 1 }), f, IMPACT), null);
  assert.equal(findHit(racer({ dist: 500, jump: 0.4 }), new ObstacleField([spike]), 0), null);
  assert.equal(findHit(racer({ dist: 500, jump: 0.4 }), new ObstacleField([hammer]), IMPACT), hammer, 'nhảy không tránh được búa');
  assert.equal(findHit(racer({ dist: 500, lane: 1 + CONFIG.hitLaneWidth + 0.01 }), f, IMPACT), null);
  assert.equal(findHit(racer({ dist: 500, lane: 1 + CONFIG.hitLaneWidth - 0.01 }), f, IMPACT), hammer);
});
