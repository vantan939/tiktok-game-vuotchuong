// Mọi chữ hiển thị cho người xem (tiếng Việt)
export const STR = {
  title: 'Đại Chiến Vượt Chướng Ngại',

  // HUD
  hud: {
    titleLine1: 'ĐẠI CHIẾN',
    titleLine2: 'VƯỢT CHƯỚNG NGẠI',
    racing: 'ĐANG ĐUA',
    time: 'THỜI GIAN',
    camTitle: 'Camera cận',
    camHint: '(bình luận S)',
    heartLine1: 'Thả tim =',
    heartLine2: 'Tăng tốc',
    giftLine1: 'Tặng quà =',
    giftLine2: 'Tăng tốc',
    giftLine3: 'cao độ!!',
    joinHint1: 'Gõ',
    joinHint2: 'để tham gia',
    autoLine1: 'Nhân vật tự động né,',
    autoLine2: 'bạn chỉ cần',
    autoLine3: 'tăng tốc',
    top: (n) => `TOP ${n}`,
    queue: 'HÀNG ĐỢI',
    queueCount: (n) => `(${n} người)`,
    queueEmpty: 'Chưa ai chờ, gõ join nhé',
    ruleRound: (minutes) => `Mỗi lượt: ${minutes} phút`,
    ruleMax: (max) => `Tối đa: ${max} người`,
  },

  // Thông báo tham gia
  joinRacing: (name) => `${name} vào đua`,
  joinRacingNext: (name) => `${name} vào đua ở lượt sau`,
  joinQueued: (name) => `${name} vào hàng đợi`,
  joinDuplicate: (name) => `${name} đã tham gia rồi`,

  // Thông báo camera cận (lệnh s)
  camFull: (name, max) => `${name}: Đã đủ ${max} camera cận, thử lại sau`,
  camNotJoined: (name) => `${name}: hãy gõ join trước`,
  camNextRound: (name) => `${name}: camera cận dùng được từ lượt sau`,
  camIdle: (name) => `${name}: camera cận mở lại khi lượt mới bắt đầu`,

  // Thông báo quà lớn
  giftAnnounce: (name, gift) => `${name} tặng ${gift}, bay vút!`,

  // Chữ nổi trên đầu nhân vật
  fx: {
    dodge: 'Né hoàn hảo!',
    stun: 'Choáng!',
    boost: 'Bay vút!',
    gift: (name, gift) => `${name} tặng ${gift}`,
  },

  // Lời MC đọc to (giọng đọc của trình duyệt). Mỗi mục là danh sách câu để chọn ngẫu nhiên cho đỡ lặp.
  mc: {
    welcome: [
      () => 'Chào mừng các bạn đến với Đại Chiến Vượt Chướng Ngại! Gõ join để vào đua nào!',
      () => 'Xin chào cả nhà! Gõ join để tham gia cuộc đua ngay thôi!',
    ],
    ready: [() => 'Chuẩn bị nào! Các tay đua vào vị trí!', () => 'Sẵn sàng chưa? Các tay đua vào vị trí nhé!'],
    countdown: [() => 'Ba! Hai! Một!'],
    go: [() => 'Xuất phát!', () => 'Chạy thôi!'],
    join: [(n) => `${n} vào đua rồi! Cố lên nào!`, (n) => `Chào mừng ${n} tham gia cuộc đua!`],
    leader: [(n) => `${n} đang dẫn đầu!`, (n) => `Quá đỉnh! ${n} đang chạy đầu đoàn!`, (n) => `${n} vượt lên dẫn đầu rồi!`],
    dodge: [() => 'Né đẹp quá!', (n) => `${n} né cực đỉnh!`, () => 'Né hoàn hảo luôn!'],
    hit: [(n) => `Ối! ${n} dính chiêu rồi!`, () => 'Ui da! Choáng thật rồi!', (n) => `${n} bị choáng, cố lên nào!`],
    boost: [(n) => `${n} tăng tốc, bay vút!`, (n) => `${n} lao đi như tên bắn!`],
    gift: [(n, g) => `Cảm ơn ${n} đã tặng ${g}! Bay vút luôn!`, (n, g) => `${n} tặng ${g}! Quá tuyệt vời, cảm ơn bạn!`],
    gift_large: [(n, g) => `Wow! ${n} tặng ${g}! Cảm ơn bạn rất nhiều, bay vút lên nào!`],
    nearFinish: [() => 'Sắp về đích rồi! Ai sẽ về nhất đây?', () => 'Những mét cuối cùng! Hồi hộp quá!'],
    lastSeconds: [() => 'Còn mười giây cuối cùng!'],
    win: [(n) => `${n} về nhất! Chúc mừng nhà vô địch!`, (n) => `Chiến thắng thuộc về ${n}! Xin chúc mừng!`],
    timeUp: [(n) => `Hết giờ! ${n} dẫn đầu và giành chiến thắng! Chúc mừng!`],
    next: [() => 'Lượt mới sắp bắt đầu, gõ join để vào đua nhé!'],
    // Nói xen kẽ khi quá lâu chưa có gì để bình luận, cho không khí luôn sôi nổi
    filler: [
      () => 'Cuộc đua đang rất gay cấn!',
      () => 'Chạy nhanh lên nào các tay đua!',
      () => 'Thả tim để tăng tốc cho nhân vật của bạn nhé!',
      () => 'Gõ join để vào cuộc đua nào!',
      () => 'Nhân vật tự động né, bạn chỉ cần tăng tốc thôi!',
      () => 'Ai sẽ là người về nhất đây?',
      () => 'Hồi hộp quá, chưa biết ai thắng đây!',
      () => 'Bạn thấy cuộc đua này thế nào? Cùng cổ vũ nào!',
      () => 'Chướng ngại vật đang rình rập khắp nơi!',
      () => 'Các nhân vật tự động né đấy, tuyệt vời chưa!',
      () => 'Nhanh nữa lên, nhanh nữa lên!',
      () => 'Đừng chớp mắt nhé, cuộc đua đang rất hay!',
    ],
    // Câu xen kẽ theo chặng đua của người dẫn đầu (đầu, giữa, cuối)
    fillerEarly: [
      () => 'Mới những mét đầu tiên thôi, còn dài lắm!',
      () => 'Các tay đua đang bứt tốc rồi!',
      () => 'Đường đua còn dài, ai cũng có cơ hội!',
      () => 'Cẩn thận chướng ngại vật phía trước nhé!',
      () => 'Mở màn thật sôi nổi luôn!',
    ],
    fillerMid: [
      () => 'Đã đi được nửa đường rồi, cuộc đua chưa ngã ngũ!',
      () => 'Búa và cầu gai đang chờ phía trước đấy!',
      () => 'Cuộc đua càng lúc càng gay cấn!',
      () => 'Giữ vững tốc độ nào các tay đua!',
      () => 'Còn rất nhiều bất ngờ phía trước!',
    ],
    fillerLate: [
      () => 'Chặng cuối rồi, tăng tốc thôi nào!',
      () => 'Gần tới đích rồi, nghẹt thở quá!',
      () => 'Từng mét một, ai sẽ chạm đích trước đây?',
      () => 'Quyết định chiến thắng sắp được định đoạt!',
      () => 'Cố lên, cố lên, sắp tới đích rồi!',
    ],
    gap: [(a, b) => `${a} đang dẫn đầu, ${b} bám sát phía sau!`],
  },

  // Vòng lặp lượt đua
  round: (n) => `LƯỢT ${n}`,
  getReady: 'Chuẩn bị...',
  go: 'XUẤT PHÁT!',
  winnerTitle: 'NGƯỜI CHIẾN THẮNG',
  finishedIn: (time) => `Về đích sau ${time}`,
  leadedWith: (percent) => `Dẫn đầu với ${percent}% quãng đường`,
  nextRound: (seconds) => `Lượt mới sau ${seconds} giây`,

  // Panel debug (chỉ ở chế độ demo)
  debug: {
    title: 'Debug (phím D để ẩn)',
    namePlaceholder: 'Tên người dùng bất kỳ',
    join: 'join',
    camera: 's',
    like: 'Thả tim',
    gift: 'Quà nhỏ',
    midGift: 'Quà vừa',
    bigGift: 'Quà lớn',
    hint: 'Tên chưa có sẽ tự tạo người dùng mới',
  },

  // 40 tên giả cho chế độ demo
  demoNames: [
    'RainDev', 'MinhGaming', 'Cherry', 'KhoaVN', 'Gamer88', 'LinhCute', 'BaoPro', 'NấmNè',
    'TuấnAnh', 'MèoMập', 'HoaiNam', 'BảoNgọc', 'ThuHà', 'ĐứcAnh', 'MinhThư', 'GấuCon',
    'BéHeo', 'KenĐen', 'SócNâu', 'PhươngLinh', 'AnhKhoa', 'TràMy', 'HảiĐăng', 'LanAnh',
    'ThànhĐạt', 'NgọcTrinh', 'CuTí', 'BinBon', 'ThỏCon', 'QuangHuy', 'MaiPhương', 'ĐạtG',
    'YếnNhi', 'HưngThịnh', 'KiênVN', 'SaoBăng', 'VịtCon', 'NhậtMinh', 'ThảoVy', 'TiTi',
  ],
};
