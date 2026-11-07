import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOP_STEPS, midiToHz, musicStep } from './music.js';

test('midiToHz: A4 = 440 Hz, lên một quãng tám thì gấp đôi', () => {
  assert.equal(midiToHz(69), 440);
  assert.equal(midiToHz(81), 880);
});

test('musicStep: quay vòng, luôn có nốt rải, bass ở đầu mỗi ô nhịp, nốt trong khoảng nghe êm', () => {
  assert.deepEqual(musicStep(3), musicStep(3 + LOOP_STEPS));
  for (let i = 0; i < LOOP_STEPS; i++) {
    const notes = musicStep(i, true);
    assert.ok(notes.some((n) => n.voice === 'pluck'));
    for (const n of notes.filter((x) => x.voice !== 'hat')) assert.ok(n.midi >= 36 && n.midi <= 84, `bước ${i}`);
    for (const n of notes) assert.ok(n.vel > 0 && n.vel <= 1);
  }
  assert.ok(musicStep(0).some((n) => n.voice === 'bass'));
  assert.ok(musicStep(8).some((n) => n.voice === 'bass'));
});

test('musicStep: chỉ có chũm chọe khi intense, và chỉ ở nhịp lẻ', () => {
  for (let i = 0; i < LOOP_STEPS; i++) {
    assert.ok(!musicStep(i, false).some((n) => n.voice === 'hat'));
    assert.equal(musicStep(i, true).some((n) => n.voice === 'hat'), i % 2 === 1);
  }
});
