import { CONFIG } from '../config.js';

const TEX_W = 300;
const TEX_H = 380;

// Hình nhân vật tạm (nhìn từ sau lưng) để thử đường đua và camera. Sẽ thay bằng nhân vật thật.
export class RunnerView {
  static makeTexture(scene) {
    if (scene.textures.exists('runner')) return;
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(TEX_W / 2, TEX_H - 14, 230, 36); // bóng dưới chân
    g.fillStyle(0xffc21a, 1);
    g.fillEllipse(100, TEX_H - 40, 70, 46); // chân
    g.fillEllipse(200, TEX_H - 40, 70, 46);
    g.fillStyle(0x2f7bff, 1);
    g.fillCircle(TEX_W / 2, 210, 140); // thân
    g.fillStyle(0x5c9bff, 1);
    g.fillCircle(TEX_W / 2 - 40, 160, 60); // mảng sáng
    g.fillStyle(0xffc21a, 1);
    for (const dy of [-15, 35, 85]) g.fillTriangle(TEX_W / 2 - 24, 80 + dy, TEX_W / 2 + 24, 80 + dy, TEX_W / 2, 30 + dy); // gai lưng
    g.fillRect(TEX_W / 2 - 140, 250, 280, 26); // thắt lưng
    g.generateTexture('runner', TEX_W, TEX_H);
    g.destroy();
  }

  constructor(scene, name) {
    RunnerView.makeTexture(scene);
    this.body = scene.add.image(0, 0, 'runner').setOrigin(0.5, 1);
    this.label = scene.add
      .text(0, -TEX_H - 6, name, {
        fontFamily: '"Segoe UI", Arial, sans-serif',
        fontStyle: 'bold',
        fontSize: '56px',
        color: '#ffffff',
        backgroundColor: '#1b2a6bcc',
        padding: { x: 24, y: 6 },
      })
      .setOrigin(0.5, 1);
    this.root = scene.add.container(0, 0, [this.body, this.label]);
  }

  /** Đặt theo tọa độ chiếu (x, y, s). bob là pha nhún khi chạy. */
  place(x, y, s, bob, depth) {
    const k = (CONFIG.runnerHeight / TEX_H) * s;
    const hop = Math.abs(Math.sin(bob)) * 18 * k;
    this.root.setPosition(x, y - hop).setScale(k * (1 + 0.03 * Math.cos(bob * 2)), k).setDepth(depth);
  }

  destroy() {
    this.root.destroy();
  }
}
