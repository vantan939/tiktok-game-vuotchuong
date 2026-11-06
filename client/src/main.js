import Phaser from 'phaser';
import { CONFIG } from './config.js';
import { RaceScene } from './scenes/RaceScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CONFIG.width,
  height: CONFIG.height,
  backgroundColor: CONFIG.backgroundColor,
  fps: { target: CONFIG.targetFps },
  // Co giãn giữ tỉ lệ 9:16, nền đen hai bên (từ CSS của body)
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [RaceScene],
});
