import Phaser from 'phaser';
import { CONFIG } from './config.js';
import { RaceScene } from './scenes/RaceScene.js';
import { EventBus } from './core/EventBus.js';
import { DemoSource } from './sources/DemoSource.js';
import { WebSocketSource } from './sources/WebSocketSource.js';
import { DebugPanel } from './ui/DebugPanel.js';

const params = new URLSearchParams(location.search);
const bus = new EventBus();

if (params.get('demo') === '1') {
  const demo = new DemoSource(bus);
  new DebugPanel(demo);
  // In luồng sự kiện ra console để kiểm tra
  bus.on('*', (e) => {
    const detail = e.text ?? e.likeCount ?? `${e.giftName} (${e.diamonds} kim cương)`;
    console.log(`[sự kiện] ${e.type.padEnd(4)} ${e.nickname}: ${detail}`);
  });
  demo.start();
} else {
  new WebSocketSource(bus).start();
}

const game = new Phaser.Game({
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
game.registry.set('bus', bus);
