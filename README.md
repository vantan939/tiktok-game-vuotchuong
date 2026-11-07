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
| `chat` | `{ type: 'chat', text }` | Client chỉ nhận lệnh `join`, bình luận khác bỏ qua |
| `like` | `{ type: 'like', likeCount }` | Lần thả đầu của một người phát **ngay**; các lần sau trong cửa sổ 1 giây gom thành một sự kiện. TikTok tự gửi tim theo lô (khoảng 15 lần chạm mỗi lần) nên có độ trễ không tránh được ở phía TikTok |
| `gift` | `{ type: 'gift', giftName, diamonds }` | Quà liên hoàn: sự kiện **đầu chuỗi** phát ngay với giá trị một quà (hiệu lực liền), giữa chuỗi bỏ qua, cuối chuỗi phát thêm một sự kiện `followUp: true` với tổng giá trị (kim cương mỗi quà x số lần) chỉ khi chuỗi dài đủ để lên bậc quà cao hơn; game không tính hai lần |
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

## Quay cho TikTok Live Studio

Chế độ quay: mở `http://localhost:5173/?live=1`. Trang sẽ:

- ẩn panel debug (và tắt phím B), ẩn con trỏ chuột;
- cố định khung game đúng **1080x1920 px ở góc trên trái** cửa sổ, không co giãn theo cửa sổ (nên hình chụp luôn đầy đủ, không bị cắt hai bên);
- tùy chọn thêm vào URL: `&scale=0.5` (thu nhỏ khung, từ 0.25 đến 2, dùng khi màn hình không đủ cao, ví dụ 0.5 ra khung 540x960) và `&fps=30` (giới hạn thật 30 khung hình/giây cho nhẹ máy khi chạy cùng Live Studio; 15 đến 60).

### Thêm vào Live Studio

> Các bước dưới đây dựa trên tên chức năng thường gặp của Live Studio; giao diện có thể khác theo phiên bản. Hãy kiểm tra bằng live thử (bên dưới) trước khi quay thật.

1. Chạy `npm run dev` (server và client), điền `TIKTOK_USERNAME` trong `.env` nếu muốn nhận bình luận thật.
2. Đặt khung hình của Live Studio là **dọc 9:16** (độ phân giải 1080x1920, hoặc 720x1280 nếu máy yếu).
3. Thêm nguồn, chọn một trong hai cách:
   - **Web source** (nguồn web/trình duyệt): địa chỉ `http://localhost:5173/?live=1`, rộng 1080, cao 1920 (nếu có ô nhập kích thước). Đây là cách gọn nhất vì không cần mở cửa sổ trình duyệt.
   - **Window capture** (chụp cửa sổ): chạy `npm run live:window` (thêm `-- -Scale 0.75 -Fps 60` nếu muốn khung to hơn hoặc 60 FPS) để mở cửa sổ game dành riêng cho quay, rồi chụp cửa sổ có tên "Đại Chiến Vượt Chướng Ngại". **Nên dùng lệnh này thay vì mở Chrome thường**, vì nó thêm các cờ cần thiết (xem bên dưới). Màn hình thường không đủ cao cho 1920 px nên mặc định dùng `scale` 0.5; kéo khung nguồn giãn đầy khung dọc của Live Studio (hình sẽ bớt nét hơn một chút so với Web source).

   Lệnh `npm run live:window` (`scripts/open-live-window.ps1`) mở Chrome hoặc Edge ở chế độ ứng dụng với hồ sơ riêng và các cờ: `--autoplay-policy=no-user-gesture-required` (MC và âm thanh phát ngay, **không cần bấm vào cửa sổ**; mở Chrome thường thì MC im lặng cho tới khi bạn bấm vào trang), `--disable-features=CalculateNativeWinOcclusion` cùng các cờ `--disable-backgrounding-...` (Chrome mặc định **ngừng vẽ và ngừng chạy cửa sổ bị Live Studio hay cửa sổ khác che**, làm game đứng, MC im sau vài câu và hình chụp đứng hoặc đen), và `--force-device-scale-factor=1` (không bị lệch kích thước khi Windows đặt phóng to 125% hay 150%). Các cờ chỉ có hiệu lực nếu Chrome mở bằng hồ sơ riêng này, không phải Chrome đang chạy sẵn.
4. Kéo nguồn đầy khung dọc, không để lòi viền đen và không kéo ra ngoài khung.
5. Nếu dùng Web source hoặc Chrome thường thì phải bấm vào trang game một lần (hoặc nhấn một phím) để trình duyệt cho phát âm thanh và MC; cửa sổ mở bằng `npm run live:window` thì không cần. Kiểm tra Live Studio có thu được tiếng game không; nếu không thì bật thu âm thanh hệ thống hoặc âm thanh của nguồn.

### Kiểm tra hình ảnh khi live thử

1. Bắt đầu một buổi live thử (hoặc xem bản xem trước của Live Studio) và mở bằng điện thoại để xem đúng như người xem.
2. Kiểm tra: biểu ngữ tiêu đề phía trên, hai khung ĐANG ĐUA và THỜI GIAN, bảng TOP và các thẻ bên phải, thanh HÀNG ĐỢI và thẻ thể lệ ở dưới **đều hiện đủ, không bị cắt**. Lưu ý phần giao diện của chính TikTok (khung bình luận, nút quà, tên chủ phòng) phủ lên video ở phía dưới và bên phải, nếu che mất thanh hàng đợi thì dịch khung nguồn lên một chút trong Live Studio.
3. Dùng `npm run replay` để có sẵn sự kiện giả khi chưa có người xem thật.
4. Chấm tròn nhỏ ở góc trên phải là trạng thái kết nối (xanh/vàng/đỏ). Bấm `T` để ẩn nó trước khi quay chính thức.

### Phím tắt cho streamer

| Phím | Tác dụng |
|---|---|
| `P` | Tạm dừng / tiếp tục lượt đua (hiện dải chữ TẠM DỪNG, MC im) |
| `R` | Bắt đầu lại lượt hiện tại: giữ số lượt, người chơi và hàng đợi, nhân vật về vạch xuất phát |
| `M` / `N` / `V` | Tắt/bật tiếng chung / nhạc nền / MC |
| `T` | Ẩn/hiện chấm trạng thái kết nối |

Phím chỉ có tác dụng khi cửa sổ game đang được chọn (bấm vào cửa sổ trước), không có tác dụng khi gõ vào ô nhập.

## Giọng MC, âm thanh

Xem `ASSETS.md` (mục Giọng MC, Âm thanh) và `.env.example` (`GENMAX_*`). Phím tắt: `M` tắt/bật tiếng, `N` tắt/bật nhạc, `V` tắt/bật MC.

## Cấu trúc thư mục

Xem `CLAUDE.md`.
