import { STR } from '../../strings.js';
import { createFrame, el } from './Frame.js';
import { iconSvg } from './svgIcons.js';

/**
 * Banner tiêu đề: tấm nền tím viền neon hồng và tím, hai dòng chữ nổi khối (ĐẠI CHIẾN trắng xanh,
 * VƯỢT CHƯỚNG NGẠI vàng cam), hai lá cờ ca-rô hai bên, vương miện vàng ở trên, vài ánh sao lấp lánh.
 * Đặt ở khoảng 2 đến 15% chiều cao khung, canh giữa. Hoạt ảnh "thở" nằm ở banner.css.
 */
export function createBanner() {
  const H = STR.hud;
  const banner = el('div', 'abs banner');

  const plate = createFrame({ variant: 'title', className: 'abs banner__plate' });
  plate.innerHTML = `
    <span class="title-text title-text--blue banner__l1" data-text="${H.titleLine1}"><span>${H.titleLine1}</span></span>
    <span class="title-text banner__l2" data-text="${H.titleLine2}"><span>${H.titleLine2}</span></span>`;

  banner.append(
    el('div', 'abs banner__flag banner__flag--l', iconSvg('flag')),
    el('div', 'abs banner__flag banner__flag--r', iconSvg('flag')),
    plate,
    el('div', 'abs banner__shine'),
    el('div', 'abs banner__crown', iconSvg('crown')),
    el('div', 'abs banner__spark banner__spark--a', iconSvg('star')),
    el('div', 'abs banner__spark banner__spark--b', iconSvg('star')),
    el('div', 'abs banner__spark banner__spark--c', iconSvg('star')),
  );
  return banner;
}
