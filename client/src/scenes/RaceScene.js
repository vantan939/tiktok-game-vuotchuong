import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { STR } from '../strings.js';

export class RaceScene extends Phaser.Scene {
  constructor() {
    super('RaceScene');
  }

  create() {
    // Chữ tạm giữa màn hình để kiểm tra khung 9:16
    this.add
      .text(CONFIG.width / 2, CONFIG.height / 2, STR.title, {
        fontFamily: '"Segoe UI", Arial, sans-serif',
        fontStyle: 'bold',
        fontSize: '84px',
        color: '#ffffff',
        stroke: '#1b1450',
        strokeThickness: 12,
        align: 'center',
        wordWrap: { width: CONFIG.width - 160 },
      })
      .setOrigin(0.5);
  }
}
