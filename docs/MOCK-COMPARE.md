# So sánh `?mock=1` với mockup (Task 17A)

Mở `http://localhost:5173/?mock=1` ở khung 1080x1920. Cảnh đóng băng, dữ liệu đúng như `docs/mockup.png`
(02:36/03:00, 30/30 đang đua, hàng đợi 12 người, TOP 10 từ RainDev 68% đến MèoMập 53%).
Ảnh chụp: `docs/mock-screenshot.jpg`; ảnh ghép mockup | game: `docs/mock-compare.png` (chụp ở vòng 5).

## Các vòng đã làm
1. Dựng mock mode, khung HUD, màu nền và bảng TOP 10 theo mockup.
2. Đường rộng hơn (`roadHalfWidth` 800), nhân vật chính lớn hơn (`runnerHeight` 560), chướng ngại và viền đường co theo độ rộng đường.
3. Đổi màu trời, mặt đất, đường, bóng bay và ống hai bên sang tông xanh - tím - hồng; chỉnh biểu ngữ và viền khung phát sáng.
4. Đưa cả đoàn về trước cổng đích, cổng đích nằm trên lớp sương; thêm tia tốc độ quanh người dẫn đầu.
5. Tia tốc độ vàng ấm đậm hơn, ánh sáng ở hai mép đường, khung vàng đậm màu hơn.
6. Dàn lại vị trí MinhGaming / Gamer88 sát RainDev hơn, đoàn phía sau gần hơn, chướng ngại gần nhân vật chính hơn, giảm sương mặt đất.

## Khác biệt còn lại (đề nghị bỏ qua)
- Nhân vật vẽ vector đơn giản hơn ảnh mockup (ít chi tiết bóng, mặt và phụ kiện).
- Avatar trong bảng TOP 10 và hàng đợi là hình người cách điệu, không phải ảnh thật như mockup.
- Búa và ống hai bên đường nhìn dọc, chưa có độ nghiêng và đổ bóng như mockup.
- Biểu ngữ tiêu đề bố cục hơi khác (cờ, bóng bay, vương miện đặt lệch vài chục px).
- Tên dài ở TOP 10 (MinhGaming) bị cắt, mockup co chữ cho vừa.
- Thẻ hướng dẫn bên trái: cỡ chữ và nút bật/tắt "2/4" khác một chút.
- Tia tốc độ và vầng sáng dưới chân nhẹ hơn mockup.
- Số lượng và vị trí từng nhân vật ở phía sau không giống từng người trong mockup (chỉ giống tổng thể).
- Không đo được 60 FPS thật trong trình duyệt tích hợp; chi phí vẽ đo được khoảng 0,6 - 1,3 ms mỗi frame.
