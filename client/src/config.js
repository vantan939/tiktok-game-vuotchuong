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
  countdownSeconds: 3,
  resultSeconds: 8,
  maxPlayers: 30,
  queueShown: 5,
  trackLength: 5500,
  lanes: 3,

  // Camera cận
  maxCloseCams: 4,

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
  likeSpamDecay: 0.8,

  // Quà: khiên + tăng tốc mạnh
  giftShieldSeconds: 5,
  giftBoostMultiplier: 2.2,
  giftBoostSeconds: 4,

  // Chướng ngại
  obstacleGapMin: 55,
  obstacleGapMax: 90,
  hammerCycleSeconds: 2,
  hammerWarnSeconds: 0.8,
  stunSeconds: 1,
  knockback: 25,

  // Bình luận
  commandCooldownSeconds: 1,

  // Kết nối server
  serverUrl: 'ws://localhost:8080',
};
