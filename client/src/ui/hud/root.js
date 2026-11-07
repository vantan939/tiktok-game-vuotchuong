// Gốc của HUD: một khối 1080x1920 đặt giữa cửa sổ, co giãn đúng như canvas Phaser (FIT, giữ tỉ lệ 9:16).

export function createHudRoot({ live = false, scale = 1 } = {}) {
  const root = document.createElement('div');
  root.id = 'hud-root';
  const hud = document.createElement('div');
  hud.id = 'hud';
  root.append(hud);
  document.body.append(root);

  const fit = () => {
    if (live) {
      // Chế độ quay: khối cố định ở góc trên trái, kích thước 1080x1920 nhân scale, không phụ thuộc cửa sổ
      hud.style.left = '0';
      hud.style.top = '0';
      hud.style.transformOrigin = '0 0';
      hud.style.transform = `scale(${scale})`;
      return;
    }
    const k = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
    hud.style.transform = `translate(-50%, -50%) scale(${k})`;
  };
  fit();
  window.addEventListener('resize', fit);
  return hud;
}
