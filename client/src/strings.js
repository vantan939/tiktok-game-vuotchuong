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
