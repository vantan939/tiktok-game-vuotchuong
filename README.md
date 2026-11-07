# Đại Chiến Vượt Chướng Ngại

Game đua vượt chướng ngại chạy trên browser (khung dọc 1080x1920) để live TikTok. Người xem gõ `join` để vào đua, thả tim để tăng tốc, tặng quà để có khiên và tăng tốc mạnh. Nhân vật tự chạy và tự né. Luật chơi và thiết kế ở `CONTEXT.md`, giao diện ở `docs/UI-SPEC.md`.

## Chạy thử

```bash
npm install
npm run dev          # client (http://localhost:5173) và server (ws://localhost:8080)
```

- `http://localhost:5173/?demo=1`: chế độ demo, người xem giả, không cần TikTok.
- `http://localhost:5173/`: nhận sự kiện thật từ server (live TikTok hoặc replay, xem bên dưới).
- `npm test`: chạy toàn bộ test. `npm run sim`: mô phỏng nhiều lượt đua.

## TikTok Live (server)

> **Cảnh báo: đây là cách KHÔNG chính thức.** Server dùng thư viện [`tiktok-live-connector`](https://github.com/zerodytrash/TikTok-Live-Connector) đọc dữ liệu từ giao thức nội bộ của TikTok. TikTok có thể đổi giao thức, chặn hoặc giới hạn tốc độ bất cứ lúc nào làm việc kết nối hỏng mà không báo trước. Thư viện còn gọi **máy chủ ký của bên thứ ba (Euler Stream)** để tạo chữ ký kết nối; nếu dịch vụ này lỗi hoặc đổi chính sách thì cũng không kết nối được. Không có gì đảm bảo ổn định cho buổi live quan trọng: luôn chuẩn bị phương án dự phòng (chạy `?demo=1` hoặc replay).
>
> Giấy phép: `tiktok-live-connector` là MIT; gói `tiktok-live-proto` mà nó kéo theo dùng AGPL-3.0 (chỉ chạy ở server của bạn, không phân phối lại).

### Cấu hình

1. Sao chép `.env.example` thành `.env` (file này không được commit).
2. Điền `TIKTOK_USERNAME` là username của chủ phòng (ví dụ `abc` cho `tiktok.com/@abc`). Phòng phải **đang live** mới kết nối được.
3. (Tùy chọn) `EULER_API_KEY`: khóa Euler Stream, giúp kết nối ổn định hơn khi dùng nhiều.
4. `npm run dev`, mở `http://localhost:5173/`, rồi bình luận `join` trong live: nhân vật xuất hiện trong game.

Server in log rõ ràng: đang kết nối, đã kết nối (roomId), bị ngắt (mã và lý do), lỗi, chưa live. Khi bị ngắt hoặc chưa live, server tự thử lại (chờ 5, 10, 20... tối đa 60 giây; chưa live thì thử lại sau 30 giây). Mỗi phút có một dòng thống kê số bình luận, tim, quà, người vào phòng.

### Sự kiện được chuyển đổi

Server chuyển sự kiện TikTok sang kiểu chung `GameEvent` (`shared/events.js`) rồi phát JSON qua WebSocket cho mọi client:

| TikTok | GameEvent | Ghi chú |
|---|---|---|
| `chat` | `{ type: 'chat', text }` | Client chỉ nhận lệnh `join` và `s`, bình luận khác bỏ qua |
| `like` | `{ type: 'like', likeCount }` | Gộp theo người dùng trong cửa sổ 1 giây (cộng dồn số lần chạm) |
| `gift` | `{ type: 'gift', giftName, diamonds }` | Quà liên hoàn chỉ tính khi **kết thúc chuỗi**; `diamonds` = kim cương mỗi quà x số lần trong chuỗi |
| `member` | `{ type: 'join' }` | Người xem vào phòng live. **Không** tự cho vào đua: phải gõ `join` |

Mỗi sự kiện có `userId`, `nickname`, `avatarUrl`. Tên trường của thư viện không chính thức có thể thay đổi giữa các phiên bản nên bộ chuyển đổi (`server/src/tiktok/adapt.js`) chấp nhận cả vài tên trường cũ và mới; nếu một bản thư viện mới đổi hẳn cấu trúc, sửa ở file đó (có test).

### Replay và ghi lại sự kiện (không cần live)

```bash
npm run dev:client
npm run replay                                    # phát server/replays/sample.json (dừng npm run dev:server trước, vì dùng chung cổng 8080)
node server/src/index.js --replay file.json --speed=2 --loop
node server/src/index.js --record ghi.json        # nhận live thật và ghi lại; Ctrl+C để lưu file
```

Replay chờ client đầu tiên kết nối rồi mới phát (để không mất sự kiện đầu). File là mảng `{ "t": mili giây, "event": GameEvent }` (định dạng `--record` ghi ra); cũng nhận mảng `GameEvent` thẳng. Sự kiện sai dạng bị bỏ và báo trong log. Có thể trỏ client tới server khác bằng `?server=ws://host:cổng`.

## Độ ổn định

- **Tự kết nối lại:** client nối lại server với thời gian chờ 1, 2, 4, 8, 16, 30 giây (tối đa 30 giây) và nối ngay khi mạng quay lại. Server cũng gửi nhịp tim mỗi 5 giây; quá 15 giây im lặng thì client coi là đã chết và nối lại, nên rút mạng rồi cắm lại, game tự khôi phục mà không cần tải lại trang. Server nối lại TikTok với thời gian chờ tăng dần tối đa 30 giây.
- **Chấm trạng thái** ở góc trên phải (đưa chuột vào để xem chữ): xanh = đang nhận sự kiện, vàng = đang kết nối lại, đỏ = mất kết nối (đứt quá 10 giây, hoặc server báo chưa live / không nối được TikTok). Phím `T` ẩn hoặc hiện chấm, nên ẩn khi quay. Chế độ `?demo=1` không có chấm.
- **Mất kết nối thì game vẫn chạy** với bot, không đứng hình; người xem vào lại bình thường khi nối lại được.
- **Lọc nickname** (`shared/names.js`): tên có từ nhạy cảm (tiếng Việt, tiếng Anh, kể cả viết lách như sh1t, d.u m4), đường dẫn quảng cáo, quá dài (trên 24 ký tự) hoặc không còn ký tự vẽ được thì thay bằng tên dự phòng dạng "Người chơi 4821" (cố định theo người dùng). Emoji, ký hiệu và chữ nước khác (font game chỉ vẽ chữ Latin có dấu tiếng Việt) bị bỏ khỏi tên. Danh sách từ nhạy cảm chỉ là mức cơ bản, sửa trong file đó nếu cần.

## Giọng MC, âm thanh

Xem `ASSETS.md` (mục Giọng MC, Âm thanh) và `.env.example` (`GENMAX_*`). Phím tắt: `M` tắt/bật tiếng, `N` tắt/bật nhạc, `V` tắt/bật MC.

## Cấu trúc thư mục

Xem `CLAUDE.md`.
