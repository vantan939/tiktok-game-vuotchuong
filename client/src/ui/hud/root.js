// Gốc của HUD: một khối 1080x1920 đặt giữa cửa sổ, co giãn đúng như canvas Phaser (FIT, giữ tỉ lệ 9:16).

export function createHudRoot() {
  const root = document.createElement('div');
  root.id = 'hud-root';
  const hud = document.createElement('div');
  hud.id = 'hud';
  root.append(hud);
  document.body.append(root);

  const fit = () => {
    const k = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
    hud.style.transform = `translate(-50%, -50%) scale(${k})`;
  };
  fit();
  window.addEventListener('resize', fit);
  return hud;
}
