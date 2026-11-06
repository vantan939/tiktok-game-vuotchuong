import Phaser from 'phaser';

/** Nạp atlas hình ảnh (PNG 2x do tools/bake.html tạo) rồi vào màn đua. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.multiatlas('atlas', 'assets/atlas.json', 'assets');
  }

  create() {
    document.getElementById('boot')?.remove();
    this.scene.start('RaceScene');
  }
}
