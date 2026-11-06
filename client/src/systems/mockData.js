// Dữ liệu cho chế độ ?mock=1: đúng như ảnh docs/mockup.png để so sánh giao diện công bằng.
// Toàn bộ là dữ liệu thuần; scenes/mockMode.js dùng nó để dựng cảnh đóng băng.

export const MOCK = {
  elapsed: 156, // 02:36
  total: 180, // 03:00
  racing: 30,
  maxPlayers: 30,
  camsUsed: 2,
  queueTotal: 12,
  queueBase: 30, // #31 trở đi
  queueShown: 5,
  top: [
    { name: 'RainDev', percent: 68, skin: 0 }, // khủng long xanh, đi đầu, có vương miện
    { name: 'MinhGaming', percent: 66, skin: 1 }, // bò
    { name: 'Cherry', percent: 64, skin: 2 },
    { name: 'KhoaVN', percent: 62, skin: 3 },
    { name: 'Gamer88', percent: 60, skin: 6 }, // tím
    { name: 'LinhCute', percent: 58, skin: 4 },
    { name: 'BaoPro', percent: 56, skin: 5 },
    { name: 'NấmNè', percent: 55, skin: 7 },
    { name: 'TuấnAnh', percent: 54, skin: 0 },
    { name: 'MèoMập', percent: 53, skin: 1 },
  ],
  // Nhãn tên hiện trên đầu nhân vật (theo mockup)
  tagged: ['MinhGaming', 'RainDev', 'Cherry', 'Gamer88'],
};

// Camera cố định cho cảnh mock: độ zoom và vị trí người đi đầu, tính theo đơn vị focal
export const MOCK_CAMERA = { focal: 120, heroZ: 0.887 };

// Vị trí hiển thị của các nhân vật có tên: lane (số thực, 0 là trái, 1 giữa, 2 phải) và z (khoảng cách phía trước camera, đơn vị focal)
export const MOCK_NAMED = {
  RainDev: { lane: 1.0, z: 0.887 },
  MinhGaming: { lane: 0.18, z: 1.5 },
  Gamer88: { lane: 1.9, z: 1.45 },
  Cherry: { lane: 1.15, z: 2.5 },
  KhoaVN: { lane: 0.45, z: 1.85 },
  LinhCute: { lane: 1.65, z: 2.0 },
  BaoPro: { lane: 0.85, z: 3.2 },
  'NấmNè': { lane: 1.4, z: 3.5 },
  'TuấnAnh': { lane: 0.3, z: 3.8 },
  'MèoMập': { lane: 1.9, z: 4.2 },
};

/** Vị trí cho n nhân vật còn lại (không tên): rải thành đoàn nhỏ dần về phía chân trời, cố định theo chỉ số. */
export function mockFillers(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const hash = (k) => {
      let h = Math.imul((i + 1) * 2654435761 + k * 40503, 0x45d9f3b);
      h ^= h >>> 15;
      return ((h >>> 0) % 1000) / 1000;
    };
    out.push({
      lane: -0.45 + hash(1) * 2.9,
      z: 1.75 + t * 1.6 + hash(2) * 0.3, // từ gần tới xa, đều nằm trước cổng đích
      scale: 0.66, // nhỏ hơn thật cho giống đoàn nhỏ trong mockup
      skin: Math.floor(hash(3) * 8),
    });
  }
  return out;
}

/** Đặt cảnh mock trong URL: ?mock=1 */
export const isMock = (search = location.search) => new URLSearchParams(search).get('mock') === '1';
