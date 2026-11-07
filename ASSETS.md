# ASSETS.md

Danh sách mọi asset (hình, font, âm thanh) dùng trong game, nguồn gốc và giấy phép. Mỗi asset mới phải được ghi vào đây.

## Font

| Asset | Nguồn | Giấy phép | Ghi chú |
|---|---|---|---|
| Baloo 2 (đậm 600, 700, 800) | Google Fonts, https://fonts.google.com/specimen/Baloo+2 | SIL Open Font License 1.1 (dùng miễn phí, kể cả thương mại) | Có đủ dấu tiếng Việt. Nạp từ Google Fonts qua `client/index.html`. Máy phát live cần có mạng khi mở game; nếu mất mạng chữ rơi về `Segoe UI`. Nên tải file font về lưu trong `client/public/fonts/` nếu muốn chạy ngoại tuyến. |

Đã kiểm tra hiển thị đủ chữ cái có dấu (hoa và thường) ở các cỡ 28 đến 120 px bằng `client/tools/font-check.html`.

## Hình ảnh (atlas)

Toàn bộ hình trong atlas là **tác phẩm gốc do dự án tự vẽ bằng mã** (SVG sinh từ các hàm trong `client/art/`), không cắt, không lấy lại từ ảnh mockup và không dùng công cụ tạo ảnh. Vì vậy không có vấn đề bản quyền với bên thứ ba. Ảnh `docs/mockup.png` chỉ dùng làm tham chiếu phong cách (màu, bố cục).

| Nhóm | Khung trong atlas | Nguồn vẽ |
|---|---|---|
| Nhân vật 8 skin (khủng long, bò, robot, người ngoài hành tinh, mèo, cáo, nho, dâu) | `char_<id>` | `client/art/characters.js` |
| Búa đập, quả cầu gai, cờ ca-rô, cổng đích | `hammer_head`, `hammer_handle`, `spike_ball`, `flag`, `gate` | `client/art/props.js` |
| Biểu tượng: tim, hộp quà, khóa, camera, đồng hồ bấm giờ, đồng hồ cát, vương miện, nhóm người, sao | `icon_<tên>` | `client/art/icons.js` |
| Khinh khí cầu, mây, núi, bóng đổ, bụi, giấy pháo | `balloon_*`, `cloud_*`, `mountains`, `shadow`, `dust`, `confetti` | `client/art/scenery.js` |

Atlas thật là `client/public/assets/atlas0.png` và `atlas.json` (độ phân giải 2x, nền trong suốt), do `client/tools/bake.html` tạo.

### Sửa hoặc thay hình

1. Sửa hàm vẽ trong `client/art/`, xem nhanh ở `http://localhost:5173/tools/art-preview.html` (`?only=char_` để lọc).
2. Chạy `npm run dev`, mở `http://localhost:5173/tools/bake.html` để bake lại atlas. Bake xong, `npm test` kiểm tra atlas khớp nguồn.
3. Muốn dùng hình do họa sĩ hoặc công cụ tạo ảnh làm: giữ đúng tên khung và tỉ lệ kích thước trong `client/art/index.js`, đưa PNG 2x vào atlas, và **ghi nguồn và giấy phép vào bảng trên** (xem Task 24).

## Âm thanh

Không có file âm thanh nào. Nhạc nền và mọi tiếng (đếm ngược, xuất phát, boost, quà, va chạm, búa, né, thắng) do `client/src/audio/AudioEngine.js` tổng hợp bằng Web Audio, giai điệu là mẫu tự soạn trong `client/src/audio/music.js`. Vì vậy không vướng giấy phép bên thứ ba. Phím M tắt/bật tất cả, N tắt/bật nhạc nền, `?mute=1` tắt từ đầu; chỉnh âm lượng ở `CONFIG.audio`.

## Giọng MC

Hai nguồn, không có file giọng nói nào trong repo:

1. **genmax** (https://api.genmax.io): server gọi API text-to-speech bằng GENMAX_API_KEY và GENMAX_VOICE_ID trong `.env` (xem `.env.example`), lưu mp3 vào `server/.cache/tts/` (không commit). Âm thanh tạo ra tuân theo điều khoản của genmax và nhà cung cấp giọng (ElevenLabs, MiniMax hoặc CapCut); kiểm tra giấy phép giọng đã chọn trước khi dùng thương mại. Tốn credit theo ký tự nên có cache và hạn mức mỗi giờ (`GENMAX_BUDGET_CHARS_PER_HOUR`).
2. **Giọng của trình duyệt** (Web Speech API): dự phòng khi server chưa có khóa hoặc genmax lỗi; cần giọng tiếng Việt cài trong máy (thường là Microsoft An trên Windows).

Lời thoại ở `STR.mc` trong `client/src/strings.js`. Phím `V` tắt/bật MC, `?mc=0` tắt từ đầu, `CONFIG.mc.provider = 'browser'` để luôn dùng giọng trình duyệt.

## Thư viện chương trình

Phaser 3 (MIT), Vite (MIT), ws (MIT). tiktok-live-connector 2.5.0 (MIT, phía server; kéo theo tiktok-live-proto theo giấy phép AGPL-3.0 và gọi máy chủ ký của Euler Stream). Xem README mục TikTok Live.
