// Nhạc nền nhẹ dạng mẫu: vòng 4 hợp âm Am - F - C - G, mỗi hợp âm 8 nốt móc đơn. Dữ liệu thuần, test được.
// AudioEngine đọc từng bước và tổng hợp tiếng; file này không đụng tới Web Audio.

export const STEPS_PER_BAR = 8;
export const BARS = 4;
export const LOOP_STEPS = STEPS_PER_BAR * BARS;

// Gốc (MIDI) và các quãng của hợp âm (3 nốt)
const CHORDS = [
  { root: 57, tones: [0, 3, 7] }, // Am
  { root: 53, tones: [0, 4, 7] }, // F
  { root: 48, tones: [0, 4, 7] }, // C
  { root: 55, tones: [0, 4, 7] }, // G
];
const ARP = [0, 1, 2, 1, 2, 1, 0, 1]; // thứ tự nốt rải trong một ô nhịp

export const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/**
 * Các nốt của một bước (0 đến LOOP_STEPS-1, tự quay vòng).
 * voice: 'bass' | 'pluck' | 'hat'; beats: độ dài tính theo nốt móc đơn; vel: 0 đến 1.
 * intense: lúc đang đua thì thêm tiếng chũm chọe nhẹ ở nhịp lẻ cho thêm nhịp điệu.
 */
export function musicStep(step, intense = false) {
  const s = ((step % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
  const chord = CHORDS[Math.floor(s / STEPS_PER_BAR)];
  const inBar = s % STEPS_PER_BAR;
  const notes = [];
  if (inBar === 0 || inBar === 4) notes.push({ voice: 'bass', midi: chord.root - 12, beats: 3.5, vel: inBar === 0 ? 1 : 0.7 });
  const tone = chord.tones[ARP[inBar] % chord.tones.length];
  notes.push({ voice: 'pluck', midi: chord.root + 12 + tone, beats: 1.6, vel: inBar % 2 === 0 ? 0.8 : 0.55 });
  if (intense && inBar % 2 === 1) notes.push({ voice: 'hat', midi: 0, beats: 0.4, vel: 0.5 });
  return notes;
}
