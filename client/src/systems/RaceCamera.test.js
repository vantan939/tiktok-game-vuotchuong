import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../config.js';
import { RaceCamera } from './RaceCamera.js';
import { project, scaleAt, screenY } from './Projection.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('Projection: s = 1 ở mép dưới, nhỏ dần khi xa, về chân trời ở vô cực', () => {
  near(scaleAt(0, 100), 1);
  assert.ok(scaleAt(50, 100) < 1);
  assert.ok(scaleAt(500, 100) < scaleAt(50, 100));
  near(screenY(1), CONFIG.height);
  near(screenY(0), CONFIG.horizonY);
});

test('Projection: tâm đường ở giữa khung, làn trái lệch trái và hẹp dần khi xa', () => {
  const cam = { z0: 0, focal: 100 };
  near(project(0, 100, cam).x, CONFIG.width / 2);
  const a = project(-1, 0, cam);
  const b = project(-1, 300, cam);
  assert.ok(a.x < CONFIG.width / 2);
  assert.ok(CONFIG.width / 2 - b.x < CONFIG.width / 2 - a.x);
});

test('RaceCamera: một nhân vật thì người cuối ở đúng tỉ lệ cameraBackScale', () => {
  const cam = new RaceCamera();
  cam.snap([1000]);
  near(cam.focal, CONFIG.cameraMinFocal);
  near(scaleAt(1000 - cam.z0, cam.focal), CONFIG.cameraBackScale);
});

test('RaceCamera: đoàn dàn dài thì zoom xa hơn và người đầu ở cameraFarScale', () => {
  const cam = new RaceCamera();
  cam.snap([1000, 1400]);
  assert.ok(cam.focal > CONFIG.cameraMinFocal);
  near(scaleAt(1000 - cam.z0, cam.focal), CONFIG.cameraBackScale);
  near(scaleAt(1400 - cam.z0, cam.focal), CONFIG.cameraFarScale);
});

test('RaceCamera: đoàn dài thì camera zoom xa hơn đoàn ngắn', () => {
  const a = new RaceCamera();
  const b = new RaceCamera();
  a.snap([0, 300]);
  b.snap([0, 900]);
  assert.ok(b.focal > a.focal);
});

test('RaceCamera: người đầu luôn nằm trong khung (s >= cameraFarScale) dù đoàn dàn rất dài', () => {
  const cam = new RaceCamera();
  for (const spread of [0, 50, 400, 2000, 5000]) {
    cam.snap([100, 100 + spread]);
    assert.ok(scaleAt(100 + spread - cam.z0, cam.focal) >= CONFIG.cameraFarScale - 1e-9);
  }
});

test('RaceCamera: chuyển động mượt, không nhảy khi đổi người cuối', () => {
  const cam = new RaceCamera();
  cam.snap([500, 520]);
  const before = cam.z0;
  cam.update([300, 520], 1 / 60); // người cuối đổi đột ngột, tụt 200 đơn vị
  assert.ok(Math.abs(cam.z0 - before) < 30, 'camera chỉ được dịch một chút trong 1 frame');
  for (let i = 0; i < 600; i++) cam.update([300, 520], 1 / 60);
  near(cam.last, 300, 0.01);
});
