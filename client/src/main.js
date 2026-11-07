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
import { NetStatus } from './systems/NetStatus.js';
import { liveSize, parseLive } from './liveMode.js';
import { serverWsUrl } from './core/serverUrl.js';
import { installGlobalErrorReporting } from './core/errorReport.js';
import { DebugPanel } from './ui/DebugPanel.js';

const params = new URLSearchParams(location.search);
const bus = new EventBus();
const mode = parseLive(location.search); // chế độ quay ?live=1
const net = params.get('demo') === '1' ? null : new NetStatus(CONFIG.net, performance.now()); // chỉ có khi nhận sự kiện từ server

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
  installGlobalErrorReporting();
  applyTheme();
  if (mode.live) {
    // Quay: ẩn con trỏ, cố định kích thước khung game ở góc trên trái
    document.body.classList.add('live');
    const { width, height } = liveSize(mode);
    Object.assign(document.getElementById('game').style, { width: `${width}px`, height: `${height}px` });
  }
  await loadFonts();

  if (params.get('demo') === '1') {
    const demo = new DemoSource(bus, Math.random, { users: Number(params.get('users')) || CONFIG.demoUserCount, spam: params.get('spam') === '1' }); // ?users=N, ?spam=1: thử tải
    if (!mode.live) new DebugPanel(demo); // quay thì ẩn panel debug
    // In luồng sự kiện ra console để kiểm tra (tắt khi thử tải / soak: hàng nghìn dòng log tự nó làm chậm trang)
    if (params.get('spam') !== '1' && params.get('soak') !== '1') bus.on('*', (e) => {
      const detail = e.text ?? e.likeCount ?? `${e.giftName} (${e.diamonds} kim cương)`;
      console.log(`[sự kiện] ${e.type.padEnd(4)} ${e.nickname}: ${detail}`);
    });
    demo.start();
  } else {
    new WebSocketSource(bus, serverWsUrl(), { net }).start(); // ?server=ws://host:cổng để trỏ tới server khác
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: CONFIG.width,
    height: CONFIG.height,
    backgroundColor: CONFIG.backgroundColor,
    fps: mode.fps < 60 ? { target: mode.fps, limit: mode.fps } : { target: mode.fps }, // ?fps=30 giới hạn thật (nhẹ máy khi chạy cùng Live Studio)
    // Thường: co giãn giữ tỉ lệ 9:16, nền đen hai bên. Quay: kích thước cố định 1080x1920 (nhân scale), không co theo cửa sổ
    scale: mode.live
      ? { mode: Phaser.Scale.NONE, zoom: mode.scale }
      : { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, RaceScene],
    // Gắn EventBus trước khi scene đầu tiên chạy create()
    callbacks: { preBoot: (game) => { game.registry.set('bus', bus); game.registry.set('net', net); game.registry.set('live', mode); } },
  });
}

main();
