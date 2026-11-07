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
  maxPlayers: 3,
  botFillTo: 3,             // thiếu người thật thì thêm bot cho đủ số này, để luôn có đoàn đua
  queueShown: 5,
  topShown: 1,              // bảng xếp hạng hiển thị bấy nhiêu người đứng đầu (cũng là số người trong kết quả lượt)
  trackLength: 6200,        // chọn để người thắng về đích khoảng 2 phút 40 đến 3 phút khi chạy bình thường (đo bằng client/scripts/tracklen.js)
  lanes: 3,

  // Đường đua: hiển thị (px tính tại tỉ lệ phối cảnh s = 1, tức mép dưới màn hình)
  horizonY: 634,            // đường chân trời
  roadHalfWidth: 800,       // nửa bề rộng mặt đường (px tại s = 1)
  designRoadHalfWidth: 495, // bề rộng đường mà kích thước chướng ngại, viền, vạch làn được thiết kế theo (để co theo unit)
  curbWidth: 44,            // dải viền hồng/vàng hai bên
  segmentLength: 16,        // chiều dài một đoạn kẻ sọc (đơn vị đường đua)
  laneDashSegments: [2, 4], // vạch kẻ làn: [số đoạn sáng, chu kỳ]
  minDrawScale: 0.03,       // xa hơn mức này thì không vẽ nữa
  maxSegments: 260,
  gatePillarHeight: 380,
  gateArcHeight: 330,

  // Camera chính: nhân vật cuối ở tỉ lệ cameraBackScale, người đầu ở cameraFarScale khi đoàn dàn dài
  cameraBackScale: 0.52,
  cameraFarScale: 0.25,
  cameraMinFocal: 110,      // nhỏ nhất = zoom gần nhất; càng lớn càng zoom xa
  cameraSmooth: 6,          // độ mượt (lớn = bám nhanh)

  // Nhân vật mẫu (tới khi có join thật ở Task 8). Ghi đè bằng ?runners=N khi debug
  sampleRunners: 30,
  runnerHeight: 560,        // chiều cao nhân vật tại s = 1
  closeCamRunnerHeight: 380, // chiều cao nhân vật trong cửa sổ camera cận (px tại s = 1, trước khi nhân unit)
  startRowGap: 18,          // khoảng cách giữa các hàng ở vạch xuất phát
  topNamesShown: 5,         // camera chính hiện tên top N (một lượt chỉ 3 người nên hiện hết để ai cũng tìm được mình)
  avatarTimeoutSeconds: 8,

  // Hành vi tự đổi làn "sống động" khi đường phía trước thoáng
  wanderInterval: [3, 8],   // [min, max] giây giữa hai lần cân nhắc đổi làn
  crowdRange: 14,           // hai nhân vật cùng làn và cách nhau dưới mức này (đơn vị) thì coi là chen nhau; tự đổi làn để tách ra
  laneChangeSmooth: 4,      // độ mượt khi trượt sang làn khác

  // Camera cận (lệnh s)
  maxCloseCams: 4,
  closeCamSeconds: 30,      // tự tắt sau bấy lâu để không chiếm chỗ; 0 = không tự tắt
  closeCamWindow: { x: 730, y: 784, w: 340, h: 168, gap: 12 }, // cửa sổ đầu tiên (px khung 1080x1920), các cửa sổ sau xếp dọc xuống
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
  lookAheadSeconds: 2.5,     // nhìn trước chướng ngại bấy lâu: né sớm một đoạn cho đẹp mắt, không sát mới né
  hammerLookAheadSeconds: 2, // búa phải canh nhịp nên chỉ quyết định khi đã gần hơn một chút (dự đoán xa dễ sai)
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
  obstacleGapMin: 160,
  obstacleGapMax: 240,
  obstacleFirstDist: 160,    // hàng chướng ngại đầu tiên
  obstacleEndMargin: 200,    // chừa đoạn cuối trước đích không có chướng ngại
  obstacleDoubleChance: 0,    // xác suất một hàng có 2 làn bị chặn (luôn chừa ít nhất 1 làn trống)
  hammerChance: 0.5,         // còn lại là quả cầu gai
  hammerHalfLength: 3,       // nửa chiều dài vùng búa đập (đơn vị đường đua); cùng bán kính nhân vật = vùng đỏ trên đường
  spikeHalfLength: 2,
  spikeRollAmp: 5,           // cầu gai lăn qua lại quanh vị trí gốc ± đoạn này
  spikeRollPeriod: 3.6,
  hammerCycleSeconds: 2,
  hammerImpactAt: 1.4,       // giây trong chu kỳ lúc búa chạm sàn
  hammerImpactSeconds: 0.35, // búa nằm dưới sàn (gây choáng) trong khoảng này
  hammerFallSeconds: 0.15,   // thời gian búa giáng xuống
  hammerWarnMin: 0.5,        // vùng đỏ cảnh báo hiện trước khi đập, mỗi búa chọn một giá trị trong khoảng này
  hammerWarnMax: 1.0,
  runnerRadius: 1,           // bán kính nhân vật khi xét va chạm (đơn vị đường đua)
  hitLaneWidth: 0.65,        // lệch làn nhỏ hơn mức này thì coi là cùng làn (khớp bề rộng hình: nhân vật khoảng 0,8 làn, cầu gai 0,7, búa 0,9)
  stunSeconds: 1,
  knockback: 25,
  jumpSeconds: 1,
  jumpClearFraction: 0.65,   // chỉ miễn nhiễm cầu gai khi độ cao nhảy đạt bấy nhiêu phần của đỉnh (chân đã cao hơn quả cầu)
  jumpHeight: 300,           // độ cao nhảy (px thiết kế tại s = 1, nhân với unit); phải cao hơn quả cầu gai (khoảng 200) để thấy rõ nhảy qua
  dodgeLaneSmooth: 5,        // trượt sang làn khác nhanh hơn khi đang né
  obstacleMinScale: 0.07,    // chướng ngại xa hơn mức này thì không vẽ
  obstaclePoolSize: 24,

  // Hiệu ứng "độ phê": chữ nổi, rung màn hình, pháo giấy. Chỉnh nhỏ lại nếu thấy chói hoặc giật.
  fx: {
    floatTextSeconds: 1.2,    // chữ nổi bay lên và mờ dần trong bấy lâu
    floatTextPool: 8,         // tối đa bấy nhiêu chữ nổi cùng lúc
    floatTextGap: 0.35,       // hai chữ nổi (không phải quà) cách nhau tối thiểu bấy nhiêu giây, tránh dày đặc
    floatTextPerRacer: 2.5,   // một nhân vật không nhận chữ nổi liên tiếp trong khoảng này
    floatTextTopRank: 3,      // bot chỉ nhận chữ nổi khi đang trong top này; người thật luôn được
    likeTextGap: 3,           // "Bay vút!" cho tim: cùng một nhân vật cách nhau tối thiểu
    shakeScale: 1,            // hệ số rung màn hình khi búa đập (0 = tắt rung)
    winnerBursts: [0, 0.9],   // giây (từ lúc vào màn kết quả) bắn pháo giấy; mỗi lần 70 mảnh
  },

  // Âm thanh tổng hợp bằng Web Audio (không dùng file). Phím M: tắt/bật tất cả, N: tắt/bật nhạc nền. URL ?mute=1 tắt từ đầu
  audio: {
    enabled: true,
    music: true,
    sfx: true,
    master: 0.8,
    musicVolume: 0.2,         // nhạc nền nhỏ để không lấn tiếng người dẫn
    sfxVolume: 0.55,
    muteKey: 'm',
    musicKey: 'n',
    sfxMinGap: 0.07,          // cùng một tiếng không phát dày hơn mức này (giây)
    maxVoices: 14,            // số tiếng chồng nhau tối đa
    musicBpm: 108,
  },

  // MC đọc to bằng giọng của trình duyệt (Web Speech, cần giọng tiếng Việt cài trong máy). Phím V: tắt/bật MC. URL ?mc=0 tắt từ đầu
  mc: {
    enabled: true,
    provider: 'auto',         // 'auto': dùng giọng genmax từ server nếu server có khóa trong .env, không thì giọng trình duyệt; 'browser': luôn dùng giọng trình duyệt
    remoteTimeoutMs: 8000,    // chờ server tạo giọng tối đa bấy lâu cho mỗi câu
    lang: 'vi',               // giọng trình duyệt: chọn giọng bắt đầu bằng mã này
    volume: 1,
    rate: 1.12,               // tốc độ nói, 1 là bình thường; cao hơn một chút cho sôi nổi
    pitch: 1.1,
    key: 'v',
    maxQueue: 2,              // hàng đợi câu chờ nói tối đa; đầy thì bỏ câu phụ
    leaderHoldSeconds: 1.5,   // người dẫn đầu giữ vị trí bấy lâu mới xướng tên
    nearFinishFraction: 0.88, // người dẫn đầu chạy được bấy nhiêu phần đường thì báo sắp về đích
    // Khoảng nghỉ tối thiểu (giây game) giữa hai câu cùng loại
    gaps: { welcome: 120, join: 4, leader: 6, dodge: 5, hit: 5, boost: 7 },
    idleSeconds: 4,           // đang đua mà MC im quá bấy lâu thì nói một câu xen kẽ cho sôi nổi
    topRankCommented: 3,      // bot nằm trong top này cũng được bình luận (né, dính), người thật thì luôn được
    watchdogMs: 25000,        // một câu bị kẹt (không báo xong) quá bấy lâu thì bỏ để MC nói tiếp
  },

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
