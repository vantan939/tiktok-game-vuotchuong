import { CONFIG } from '../config.js';
import { ObstacleField } from '../systems/Obstacles.js';
import { MOCK, MOCK_CAMERA, MOCK_NAMED, mockFillers } from '../systems/mockData.js';
import { formatClock } from '../systems/HudModel.js';
import { SKINS } from '../entities/skins.js';

// Chế độ ?mock=1: dựng cảnh đóng băng đúng như ảnh docs/mockup.png để so sánh giao diện.
// Không chạy logic game; mọi thứ đứng yên ở trạng thái đua, đồng hồ 02:36.

/** Đưa 10 người có tên vào lobby (là người thật) trước khi dựng lượt đua. */
export function seedMockLobby(lobby) {
  for (const t of MOCK.top) lobby.players.push({ userId: `mock_${t.name}`, nickname: t.name, avatarUrl: '', isBot: false });
}

/** Sau manager.begin(): đóng băng ở trạng thái đua, xếp nhân vật, chướng ngại và camera theo mockup. */
export function applyMock(scene) {
  const m = scene.manager;
  const cfg = m.cfg;
  const f = MOCK_CAMERA.focal;
  // Người đi đầu đứng sao cho cổng đích hiện ở xa như mockup (cổng cách camera khoảng 3,8 focal)
  const heroDist = cfg.trackLength - 2.91 * f;
  const z0 = heroDist - MOCK_CAMERA.heroZ * f;

  m.state = 'race';
  m.now = 200; // 200 mod 2 = 0: búa ở trạng thái nâng cao
  m.raceStart = m.now - MOCK.elapsed;
  m.stateTime = 10;

  const fillers = mockFillers(m.racers.length - MOCK.top.length);
  let next = 0;
  for (const r of m.racers) {
    const idx = MOCK.top.findIndex((t) => t.name === r.nickname);
    const spot = idx >= 0 ? MOCK_NAMED[r.nickname] : fillers[next];
    if (idx < 0) next++;
    r.dist = z0 + spot.z * f;
    scene.mockScale.set(r, spot.scale ?? 1);
    r.lane = spot.lane;
    r.targetLane = Math.round(spot.lane);
    r.skinIndex = idx >= 0 ? MOCK.top[idx].skin : spot.skin % SKINS.length;
    r.rank = idx >= 0 ? idx + 1 : MOCK.top.length + next;
    r.finished = false;
    r.stun = 0;
  }
  // Người đi đầu đang tăng tốc: vệt sáng như mockup
  const hero = m.racers.find((r) => r.nickname === MOCK.top[0].name);
  hero.boost = 999;
  hero.boostMul = 1.6;

  // Chướng ngại như mockup: búa nâng cao bên trái, quả cầu gai gần đó
  m.field = new ObstacleField([
    { id: 0, type: 'spike', dist: z0 + 2.05 * f, lane: 0.05, phase: 0, warn: 0.8 },
    { id: 1, type: 'hammer', dist: z0 + 1.2 * f, lane: -1.35, phase: 0.2, warn: 0.8 },
    { id: 2, type: 'spike', dist: z0 + 5 * f, lane: 2, phase: 1, warn: 0.8 },
  ]);

  scene.buildViews(); // dựng lại hình theo skin đã đổi (việc này đặt lại camera nên đặt camera ngay sau)
  scene.camera.z0 = z0;
  scene.camera.focal = f;
  scene.camera.ready = true;
  scene.mock = { tagged: MOCK.tagged, z0, f };
}

/** Ghi đè dữ liệu HUD bằng số liệu trong mockup. */
export function mockHudModel(base) {
  return {
    ...base,
    racing: MOCK.racing,
    max: MOCK.maxPlayers,
    time: formatClock(MOCK.elapsed),
    total: formatClock(MOCK.total),
    low: false,
    top: MOCK.top.map((t) => ({ id: `mock_${t.name}`, name: t.name, avatarUrl: '', percent: t.percent, cam: false })),
    queueTotal: MOCK.queueTotal,
    queueFirst: Array.from({ length: MOCK.queueShown }, (_, i) => ({ id: `mock_queue_${i}`, avatarUrl: '' })),
    queueBase: MOCK.queueBase,
  };
}
