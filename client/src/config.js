// Toàn bộ hằng số chỉnh được của game. Đơn vị đường đua: "đơn vị" (u), thời gian: giây.
export const CONFIG = {
  // Khung thiết kế dọc 9:16
  width: 1080,
  height: 1920,
  backgroundColor: 0x2f6bff,
  // Giới hạn FPS: 60 hoặc 30 (30 giúp nhẹ máy khi chạy cùng Live Studio)
  targetFps: 60,

  // Lượt đua
  roundSeconds: 180,
  waitSeconds: 2,           // nghỉ ngắn trước khi đếm ngược, để người xem thấy đoàn đua mới
  countdownSeconds: 3,
  resultSeconds: 8,
  maxPlayers: 30,
  botFillTo: 30,            // thiếu người thật thì thêm bot cho đủ số này, để luôn có đoàn đua
  queueShown: 5,
  trackLength: 5500,
  lanes: 3,

  // Đường đua: hiển thị (px tính tại tỉ lệ phối cảnh s = 1, tức mép dưới màn hình)
  horizonY: 634,            // đường chân trời
  roadHalfWidth: 495,       // nửa bề rộng mặt đường
  curbWidth: 70,            // dải viền hồng/vàng hai bên
  segmentLength: 16,        // chiều dài một đoạn kẻ sọc (đơn vị đường đua)
  laneDashSegments: [2, 4], // vạch kẻ làn: [số đoạn sáng, chu kỳ]
  minDrawScale: 0.03,       // xa hơn mức này thì không vẽ nữa
  maxSegments: 260,
  gatePillarHeight: 380,
  gateArcHeight: 330,

  // Camera chính: nhân vật cuối ở tỉ lệ cameraBackScale, người đầu ở cameraFarScale khi đoàn dàn dài
  cameraBackScale: 0.6,
  cameraFarScale: 0.25,
  cameraMinFocal: 110,      // nhỏ nhất = zoom gần nhất; càng lớn càng zoom xa
  cameraSmooth: 6,          // độ mượt (lớn = bám nhanh)

  // Nhân vật mẫu (tới khi có join thật ở Task 8). Ghi đè bằng ?runners=N khi debug
  sampleRunners: 30,
  runnerHeight: 380,        // chiều cao nhân vật tại s = 1
  startRowGap: 12,          // khoảng cách giữa các hàng ở vạch xuất phát
  topNamesShown: 3,         // camera chính chỉ hiện tên top N
  avatarTimeoutSeconds: 8,

  // Hành vi tự đổi làn "sống động" khi đường phía trước thoáng
  wanderInterval: [3, 8],   // [min, max] giây giữa hai lần cân nhắc đổi làn
  laneChangeSmooth: 4,      // độ mượt khi trượt sang làn khác

  // Camera cận (lệnh s)
  maxCloseCams: 4,
  closeCamSeconds: 30,      // tự tắt sau bấy lâu để không chiếm chỗ; 0 = không tự tắt
  closeCamWindow: { x: 781, y: 975, w: 289, h: 172, gap: 12 }, // cửa sổ đầu tiên (px khung 1080x1920), các cửa sổ sau xếp dọc xuống
  closeCamFocal: 55,        // nhỏ = zoom gần
  closeCamBackScale: 0.8,   // tỉ lệ phối cảnh của nhân vật được theo dõi
  closeCamHorizon: 0.3,     // chân trời ở bấy nhiêu phần chiều cao cửa sổ
  closeCamRoadHalfWidth: 130, // nửa bề rộng đường tại s = 1 trong cửa sổ (px)
  closeCamSmooth: 10,

  // Chỉ số nhân vật
  speedMin: 33,
  speedMax: 40,
  dodgeSkillMin: 0.4,
  dodgeSkillMax: 0.8,
  dodgeSkillCap: 0.9,
  dodgeSkillWinBonus: 0.02,
  reactionMin: 0.2,
  reactionMax: 0.6,
  lookAheadSeconds: 1.5,
  boostDodgePenalty: 0.1,
  minHitChance: 0.1,

  // Tim: tăng tốc
  likeBoostMultiplier: 1.6,
  likeBoostSeconds: 1,
  likeBoostMaxSeconds: 4,
  likeCooldownSeconds: 0.5,
  likeSpamDecay: 0.8,       // mỗi lần thả liên tục nhân hiệu quả với hệ số này mũ số lần thả gần đây
  likeStreakHalfLife: 5,    // giây để độ "nóng" của spam giảm một nửa
  likeMaxTapsPerEvent: 5,   // một sự kiện like gộp nhiều lần chạm thì chỉ tính tối đa bấy nhiêu

  // Quà: khiên (miễn nhiễm chướng ngại) + tăng tốc mạnh. Phân bậc theo số kim cương, xếp tăng dần.
  // fxScale: độ lớn của ánh sáng và vệt tốc độ; grow: nhân vật phóng to thêm bấy nhiêu; tint: màu ánh sáng;
  // announce: có thông báo to giữa màn hình hay không.
  giftTiers: [
    { id: 'small', minDiamonds: 1, boostMultiplier: 2.0, boostSeconds: 3, shieldSeconds: 5, fxScale: 1.0, grow: 0.06, tint: 0xffffff, announce: false },
    { id: 'medium', minDiamonds: 100, boostMultiplier: 2.2, boostSeconds: 4, shieldSeconds: 5, fxScale: 1.5, grow: 0.12, tint: 0xffa040, announce: false },
    { id: 'large', minDiamonds: 1000, boostMultiplier: 2.6, boostSeconds: 5, shieldSeconds: 5, fxScale: 2.1, grow: 0.2, tint: 0xff6ad5, announce: true },
  ],
  giftBannerSeconds: 2.8,   // thông báo quà lớn hiện bấy lâu

  // Chướng ngại
  obstacleGapMin: 55,
  obstacleGapMax: 90,
  obstacleFirstDist: 160,    // hàng chướng ngại đầu tiên
  obstacleEndMargin: 200,    // chừa đoạn cuối trước đích không có chướng ngại
  obstacleDoubleChance: 0.25, // xác suất một hàng có 2 làn bị chặn (luôn chừa ít nhất 1 làn trống)
  hammerChance: 0.5,         // còn lại là quả cầu gai
  hammerHalfLength: 5,       // nửa chiều dài vùng búa đập (đơn vị đường đua)
  spikeHalfLength: 3.5,
  spikeRollAmp: 5,           // cầu gai lăn qua lại quanh vị trí gốc ± đoạn này
  spikeRollPeriod: 3.6,
  hammerCycleSeconds: 2,
  hammerImpactAt: 1.4,       // giây trong chu kỳ lúc búa chạm sàn
  hammerImpactSeconds: 0.35, // búa nằm dưới sàn (gây choáng) trong khoảng này
  hammerFallSeconds: 0.15,   // thời gian búa giáng xuống
  hammerWarnMin: 0.5,        // vùng đỏ cảnh báo hiện trước khi đập, mỗi búa chọn một giá trị trong khoảng này
  hammerWarnMax: 1.0,
  runnerRadius: 1.5,         // bán kính nhân vật khi xét va chạm (đơn vị đường đua)
  hitLaneWidth: 0.45,        // lệch làn nhỏ hơn mức này thì coi là cùng làn
  stunSeconds: 1,
  knockback: 25,
  jumpSeconds: 0.8,
  jumpHeight: 150,           // độ cao nhảy (px tại s = 1)
  dodgeLaneSmooth: 8,        // trượt sang làn khác nhanh hơn khi đang né
  obstacleMinScale: 0.07,    // chướng ngại xa hơn mức này thì không vẽ
  obstaclePoolSize: 24,

  // Bình luận
  commandCooldownSeconds: 1,
  commandGateMaxEntries: 2000, // vượt số này thì dọn người đã hết cooldown

  // Kết nối server
  serverUrl: 'ws://localhost:8080',
  reconnectSeconds: 3,

  // Chế độ demo (?demo=1). Các khoảng [min, max] tính bằng giây
  demoUserCount: 40,
  demoFirstJoinSeconds: 1.5, // chờ game khởi động xong mới có người join đầu tiên
  demoJoinSpreadSeconds: 20,
  demoWarmupSeconds: 2,
  demoSComment: [2, 5],
  demoLike: [0.3, 1],
  demoLikeMax: 15,
  demoGift: [4, 9],
};
