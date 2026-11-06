import Phaser from 'phaser';
import './ui/hud/hud.css';
import './ui/hud/banner.css';
import { CONFIG } from './config.js';
import { THEME, applyTheme } from './theme.js';
import { BootScene } from './scenes/BootScene.js';
import { RaceScene } from './scenes/RaceScene.js';
import { EventBus } from './core/EventBus.js';
import { DemoSource } from './sources/DemoSource.js';
import { WebSocketSource } from './sources/WebSocketSource.js';
import { DebugPanel } from './ui/DebugPanel.js';

const params = new URLSearchParams(location.search);
const bus = new EventBus();

// Chờ font Google (Baloo 2) tải xong, có kiểm tra dấu tiếng Việt; quá 4 giây thì dùng font dự phòng
async function loadFonts() {
  const sample = 'ĐẠI CHIẾN VƯỢT CHƯỚNG NGẠI ẰẲẴẶ ỒỔỖỘ ƯỨỪỬỮỰ';
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    await Promise.race([
      Promise.all([`${THEME.font.heavy} 40px "Baloo 2"`, `${THEME.font.bold} 40px "Baloo 2"`].map((f) => document.fonts.load(f, sample))),
      wait(4000),
    ]);
  } catch {
    // dùng font dự phòng
  }
}

async function main() {
  applyTheme();
  await loadFonts();

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
    scene: [BootScene, RaceScene],
    // Gắn EventBus trước khi scene đầu tiên chạy create()
    callbacks: { preBoot: (game) => game.registry.set('bus', bus) },
  });
}

main();
