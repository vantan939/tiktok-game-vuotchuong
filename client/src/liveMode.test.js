import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from './config.js';
import { liveSize, parseLive } from './liveMode.js';

test('parseLive: mặc định không phải chế độ quay, fps theo config', () => {
  assert.deepEqual(parseLive(''), { live: false, scale: 1, fps: CONFIG.targetFps });
  assert.equal(parseLive('?demo=1').live, false);
  assert.equal(parseLive('?live=0').live, false);
  assert.equal(parseLive('?scale=0.5').scale, 1, 'scale chỉ có tác dụng khi quay');
});

test('parseLive: ?live=1 bật quay, scale và fps được kiểm tra giới hạn', () => {
  assert.deepEqual(parseLive('?live=1'), { live: true, scale: 1, fps: CONFIG.targetFps });
  assert.equal(parseLive('?live=1&scale=0.5').scale, 0.5);
  assert.equal(parseLive('?live=1&scale=0.01').scale, CONFIG.live.minScale);
  assert.equal(parseLive('?live=1&scale=9').scale, CONFIG.live.maxScale);
  assert.equal(parseLive('?live=1&scale=abc').scale, 1);
  assert.equal(parseLive('?live=1&fps=30').fps, 30);
  assert.equal(parseLive('?live=1&fps=5').fps, 15);
  assert.equal(parseLive('?live=1&fps=240').fps, 60);
  assert.equal(parseLive('?live=1&fps=x').fps, CONFIG.targetFps);
});

test('liveSize: 1080x1920 nhân scale, giữ tỉ lệ 9:16', () => {
  assert.deepEqual(liveSize(parseLive('?live=1')), { width: 1080, height: 1920 });
  assert.deepEqual(liveSize(parseLive('?live=1&scale=0.5')), { width: 540, height: 960 });
});
