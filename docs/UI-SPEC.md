# UI-SPEC: Đại Chiến Vượt Chướng Ngại

Nguồn: `docs/mockup.png` (942x1670, tỉ lệ ≈ 9:16). Khung thiết kế của game là **1080x1920**.

Quy ước:
- Vị trí và kích thước ghi theo **% khung** (x% = trái→phải, y% = trên→dưới) và **px trên 1080x1920** (làm tròn).
- Hệ số quy đổi từ ảnh mockup: x × 1.1465, y × 1.1497.
- Mọi chữ hiển thị bằng tiếng Việt. Chữ có dấu phải dùng font hỗ trợ tiếng Việt (gợi ý: Baloo 2 / Be Vietnam Pro đậm, hoặc font bo tròn tương tự).
- Mọi thẻ HUD có chung phong cách: nền xanh tím đậm bán trong suốt, bo góc lớn, viền neon (xem mục "Thẻ HUD chung").

## 0. Bảng màu

| Tên | Mã | Dùng cho |
|---|---|---|
| Trời xanh đậm | `#2F6BFF` | nền trời phía trên |
| Trời xanh nhạt | `#6FB8FF` | nền trời phía dưới, mây |
| Tím đêm (nền thẻ) | `#1B1450` (alpha ~0.85) | nền mọi thẻ HUD |
| Viền thẻ tím neon | `#B04BFF` | viền ngoài thẻ, bóng sáng |
| Vàng chủ đạo | `#FFC21A` | vương miện, chữ nhấn, thẻ thể lệ, hạng 1 |
| Cam | `#FF8A1F` | hạng 3, viền chữ logo |
| Hồng đậm | `#FF2D9B` | viền logo, búa, tim |
| Xanh lá bật | `#22D14F` | công tắc ON |
| Trắng | `#FFFFFF` | chữ chính |
| Xanh hạng 2 | `#1E9BFF` | huy hiệu hạng 2 |
| Đỏ cảnh báo | `#FF2A2A` (alpha 0.35) | vùng búa sắp đập |

## 1. Nền trời và khinh khí cầu

- **Vị trí:** phủ toàn khung (0–100% x, 0–100% y), nằm dưới mọi thứ.
- **Nền:** gradient dọc từ `#2F6BFF` (trên) sang xanh lam sáng ở khoảng y 40%, rồi chuyển sang xanh lam–tím đậm `#3A5BE0` ở nửa dưới (mặt đường).
- **Mây:** 3 cụm mây trắng phồng bo tròn, hơi ánh xanh, một cụm góc trái (x 0–9%, y 10–17%), một cụm góc phải (x 91–100%, y 11–20%), một cụm nhỏ sát mép trái (x 0–5%, y 20–25%).
- **Khinh khí cầu (4 quả, vẽ sọc hồng–trắng, giỏ nâu nhỏ bên dưới):**
  1. Lớn, trên phải: tâm x 77%, y 4% (≈ 830, 80 px), rộng ~8% (≈ 85 px). Nằm sau banner.
  2. Lớn nhất, phải: tâm x 88%, y 8% (≈ 950, 150 px), rộng ~10% (≈ 105 px).
  3. Trái: tâm x 15%, y 12% (≈ 165, 225 px), rộng ~8%.
  4. Nhỏ, xa, giữa đường (trên cổng ĐÍCH): tâm x 64%, y 26% (≈ 690, 500 px), rộng ~4%.
- **Hiệu ứng:** các khinh khí cầu trôi lên xuống nhẹ (biên độ 6–10 px, chu kỳ 3–5 s, lệch pha nhau). Mây trôi ngang rất chậm (parallax).

## 2. Banner tiêu đề

- **Vị trí:** giữa trên, x 23–79% (≈ 246–854 px), y 2.4–14.7% (≈ 46–282 px). Rộng ~608 px, cao ~236 px, căn giữa ngang.
- **Nội dung:** hai dòng chữ nghiêng, đậm, kiểu hoạt hình:
  - Dòng 1: **ĐẠI CHIẾN** — chữ trắng viền xanh dương đậm, cỡ nhỏ hơn.
  - Dòng 2: **VƯỢT CHƯỚNG NGẠI** — chữ vàng `#FFC21A` đổ gradient sang cam, viền nâu đậm, cỡ lớn hơn (~1.25 lần dòng 1).
- **Nền chữ:** khối hình thang bo tròn màu tím đậm, viền hồng neon `#FF2D9B` rồi viền sáng ngoài cùng, bóng đổ tím.
- **Trang trí:**
  - Vương miện vàng ở chính giữa phía trên khối chữ (rộng ~13%, cao ~7%, nhô lên trên banner), có ngọc đỏ ở giữa.
  - Hai lá cờ ca-rô đen–trắng hai bên dòng 1, nghiêng ngoài ~20°, gắn cột hồng có bi tròn đầu.
- **Hiệu ứng:** vương miện nhấp nhô nhẹ (±4 px); viền neon nhấp nháy sáng chậm; thỉnh thoảng có tia sáng lấp lánh chạy qua chữ.

## 3. Thanh ĐANG ĐUA

- **Vị trí:** trái, x 9.3–35.9% (≈ 101–388 px), y 15.7–20.5% (≈ 301–393 px). Rộng ~287, cao ~92.
- **Kiểu:** thẻ HUD chung, bo góc ~22 px.
- **Bố cục:** biểu tượng bên trái, chữ bên phải.
  - Biểu tượng: nhóm 3 người (silhouette trắng, người giữa lớn hơn), cao ~60% thẻ, ở x 12–35% của thẻ.
  - Dòng nhãn nhỏ: **ĐANG ĐUA** — trắng/xanh nhạt, đậm, cỡ ~26 px.
  - Dòng số lớn: **30 / 30** — trắng đậm, cỡ ~46 px (số hiện tại / số tối đa).
- **Dữ liệu:** `số người đang đua / tối đa 30`.
- **Hiệu ứng:** khi số người đổi, số "nảy" nhanh (scale 1 → 1.2 → 1, 150 ms).

## 4. Thanh THỜI GIAN

- **Vị trí:** phải, x 65.5–93.4% (≈ 707–1009 px), y 15.7–20.5% (≈ 301–393 px). Rộng ~302, cao ~92.
- **Kiểu:** thẻ HUD chung, cùng kích thước dòng với ĐANG ĐUA.
- **Bố cục:** biểu tượng đồng hồ bấm giờ (trắng, viền xanh) bên trái; chữ bên phải.
  - Nhãn: **THỜI GIAN** — trắng, đậm, ~26 px.
  - Giá trị: **02:36** trắng đậm ~46 px, theo sau là **/ 03:00** vàng `#FFC21A` cỡ nhỏ hơn (~30 px).
- **Dữ liệu:** thời gian còn lại hoặc đã trôi (mockup hiển thị mm:ss đã trôi / tổng 03:00). Định dạng `mm:ss`.
- **Hiệu ứng:** 10 giây cuối, số chuyển đỏ và nhấp nháy; kim đồng hồ rung nhẹ.

## 5. Ba thẻ bên trái

Cột thẻ dọc bên trái, mép trái x 1.3% (≈ 14 px), rộng ~21.5% (≈ 233 px), cách nhau ~22 px. Kiểu thẻ HUD chung, bo góc ~22 px, viền tím neon.

### 5.1 Thẻ "Khóa nhân vật"
- **Vị trí:** x 1.3–22.8%, y 22.6–30.7% (≈ 14–247 px, 435–590 px). Cao ~155 px.
- **Nội dung:**
  - Biểu tượng ổ khóa vàng (~54 px) ở trái trên.
  - Dòng 1: **Khóa nhân vật** — trắng, ~24 px.
  - Dòng 2: **(bình luận S)** — vàng `#FFC21A`, ~24 px.
  - Công tắc dạng viên thuốc, rộng ~170 px, cao ~56 px, nền xanh lá `#22D14F`, chữ **ON** trắng đậm bên trái, nút tròn trắng bên phải. Trạng thái tắt: nền xám `#6B6B8A`, chữ **OFF**, nút ở trái.
- **Ý nghĩa:** minh họa cho lệnh gõ "s" bật/tắt camera cận.
- **Hiệu ứng:** công tắc trượt nút tròn (200 ms) khi đổi trạng thái; viền xanh lá phát sáng khi ON.

### 5.2 Thẻ "Thả tim"
- **Vị trí:** x 1.3–22.8%, y 31.9–36.3% (≈ 14–247 px, 612–698 px). Cao ~86 px.
- **Nội dung:** biểu tượng tim hồng bóng (~64 px) ở trái, chữ hai dòng căn giữa: **Thả tim =** / **Tăng tốc**, trắng đậm ~28 px.
- **Hiệu ứng:** tim đập nhẹ (scale 1 → 1.12, nhịp ~0.8 s).

### 5.3 Thẻ "Tặng quà"
- **Vị trí:** x 1.3–22.8%, y 37.1–42.8% (≈ 14–247 px, 713–821 px). Cao ~108 px.
- **Nội dung:** biểu tượng hộp quà cam–vàng nơ đỏ (~70 px) ở trái, chữ ba dòng: **Tặng quà =** / **Tăng tốc** / **cao độ!!**, trắng đậm ~26 px, nhấn "cao độ!!" màu vàng.
- **Hiệu ứng:** hộp quà lắc nhẹ (xoay ±6°) mỗi ~3 s.

## 6. Bảng TOP 10

- **Vị trí:** phải, x 72.3–99% (≈ 781–1070 px), y 21.7–49.7% (≈ 416–954 px). Rộng ~289, cao ~538.
- **Kiểu:** thẻ HUD chung, bo góc ~24 px, nền tím đêm đậm hơn một chút.
- **Tiêu đề:** vương miện vàng nhỏ + chữ **TOP 10** trắng đậm ~34 px, căn giữa, cao ~56 px đầu thẻ.
- **Hàng (10 hàng, mỗi hàng cao ~46 px, cách hàng ~3 px):**
  - Huy hiệu hạng (tròn ~34 px): hạng 1 vàng `#FFC21A`, hạng 2 xanh `#1E9BFF`, hạng 3 cam `#FF8A1F`, từ hạng 4 chỉ là số trắng không nền.
  - Avatar tròn ~38 px, viền trắng mỏng (ảnh đại diện người chơi, thiếu thì dùng avatar hoạt hình mặc định).
  - Tên: trắng đậm ~24 px, cắt bằng dấu "…" nếu dài hơn ~110 px.
  - Phần trăm quãng đường: căn phải, trắng đậm ~24 px (vd. `68%`).
- **Hàng hạng 1:** nền pill vàng viền vàng sáng, làm nổi bật toàn hàng.
- **Dữ liệu mẫu:** RainDev 68%, MinhGaming 66%, Cherry 64%, KhoaVN 62%, Gamer88 60%, LinhCute 58%, BaoPro 56%, NấmNè 55%, TuấnAnh 54%, MèoMập 53%.
- **Hiệu ứng:** khi đổi thứ hạng, hàng trượt lên/xuống mượt (250 ms); phần trăm đếm tăng mượt; hàng vừa vượt hạng nháy sáng 300 ms.

## 7. Đường đua và cổng ĐÍCH

- **Vùng đường:** từ y ~25% đến đáy khung (y 100%), nhìn từ phía sau nhân vật, phối cảnh hướng vào điểm biến mất ở khoảng (x 55%, y 33%).
- **Mặt đường:** xanh lam đậm–tím `#3E5BE8` ở gần, sáng dần về xa; vạch phân làn nét đứt trắng; phần xa có các ô ca-rô vàng–hồng sọc ngang trước cổng.
- **Lề đường:** hai bên là các khối bậc thang hồng–tím–xanh ngọc nhạt (viền bo tròn, nổi khối), có ống/dầm hồng trang trí ở xa.
- **Cổng ĐÍCH:**
  - Vị trí: tâm x ~55% (≈ 595 px), y 26–36% (≈ 500–690 px), rộng ~21% (≈ 230 px), cao ~10%.
  - Hình vòm tròn hồng `#FF4FA8` có hoa văn thoi vàng–hồng ở hai chân; ở đỉnh có bảng chữ **ĐÍCH** trắng đậm trên nền đỏ cam, và vương miện vàng nhỏ ngay trên bảng.
  - Hai bên cổng có cờ ca-rô đen–trắng cắm cột.
- **Chướng ngại (tham chiếu hình dạng):**
  - **Búa đập:** búa khổng lồ hồng–vàng, đầu hình trụ nằm ngang, cán chéo, đặt bên trái đường (x 22–48%, y 19–41%). Khi chuẩn bị đập: hiện **vùng đỏ cảnh báo** `#FF2A2A` alpha 0.35 trên mặt đường dưới búa, nhấp nháy tăng dần trước khi búa hạ xuống.
  - **Quả cầu gai:** cầu đỏ–hồng gắn gai trắng ngà, đường kính ~12% (x 30–43%, y 35–41%), xoay chậm.
- **Nhân vật:** thân tròn đậm nét hoạt hình, nhìn từ sau lưng. Mỗi nhân vật có biệt danh trên đầu (xem mục 8). Kích thước nhân vật gần camera ~16% bề rộng khung, nhỏ dần theo phối cảnh về xa.
- **Nhân vật dẫn đầu (RainDev trong mockup):** tâm x ~48%, y ~65% (≈ 520, 1250 px), có vương miện vàng bay trên đầu và biển tên lớn hơn. Hiệu ứng tăng tốc: các vệt sáng vàng–trắng–hồng tỏa ra từ chân/phía sau nhân vật (speed lines), một đốm sáng chói ở chân.
- **Hiệu ứng nền đường khi chạy nhanh:** vệt sáng tím–vàng chạy dọc phối cảnh ở nửa dưới màn hình (y 70–100%), mờ dần.

## 8. Biển tên nhân vật

- Nhãn bo tròn (pill) nền xanh tím đậm `#1B2A6B` bán trong suốt, viền ngoài sáng mảnh, nằm ngay trên đầu nhân vật.
- Chữ trắng đậm. Kích thước theo phối cảnh: nhân vật gần ~30 px (vd. "RainDev", "MinhGaming", "Gamer88"), xa ~18 px (vd. "Cherry").
- Người đứng đầu có thêm vương miện vàng phía trên biển tên.
- Hiệu ứng: khi nhân vật bị choáng, biển tên rung; khi có khiên, viền biển tên chuyển xanh ngọc.

## 9. Thanh HÀNG ĐỢI

- **Vị trí:** dưới trái, x 2.3–70.8% (≈ 25–765 px), y 89.8–95.9% (≈ 1725–1842 px). Rộng ~740, cao ~117.
- **Kiểu:** thẻ HUD chung, bo góc ~28 px.
- **Bố cục từ trái sang phải:**
  1. Biểu tượng nhóm người trắng (~70 px), x 3–11% của thẻ.
  2. Văn bản hai dòng: **HÀNG ĐỢI** (trắng đậm, ~30 px) và **(12 người)** (vàng `#FFC21A`, ~30 px). Số người là số đang chờ thực tế.
  3. Vạch ngăn dọc mảnh.
  4. Dãy 5 avatar tròn (~64 px, viền trắng, cách nhau ~16 px), mỗi avatar có nhãn số thứ tự bên dưới: **#31, #32, #33, #34, #35** (trắng, ~22 px). Số thứ tự tiếp nối sau 30 người đang đua.
  5. Mũi tên **›** trắng ở cuối phải (báo còn nữa).
- **Dữ liệu:** 5 người đầu hàng đợi; nếu ít hơn 5 thì chỉ hiện số có thực.
- **Hiệu ứng:** khi người đầu hàng được vào đua, avatar trượt trái và người mới trượt vào từ phải; mũi tên nhấp nhẹ sang phải.

## 10. Thẻ thể lệ

- **Vị trí:** dưới phải, x 71.9–97.9% (≈ 776–1057 px), y 89.8–95.9% (≈ 1725–1842 px). Rộng ~281, cao ~117.
- **Kiểu:** nền **vàng** `#FFC21A` đổ gradient cam nhạt, viền cam đậm `#E08A00` rồi viền tím đậm ngoài cùng, bo góc ~28 px.
- **Nội dung:**
  - Biểu tượng đồng hồ cát (~56 px) ở trái, nâu–đen, cát vàng.
  - Hai dòng chữ nâu đậm `#3B1E00`, ~28 px, đậm: **Mỗi lượt: 3 phút** / **Tối đa: 30 người**.
- **Hiệu ứng:** đồng hồ cát lật 180° mỗi khi bắt đầu lượt mới; thẻ lấp lánh nhẹ.

## 11. Thẻ HUD chung

- Nền: tím đêm `#1B1450` alpha ~0.85 (hoặc gradient `#241868` → `#150F44`).
- Viền: 3–4 px `#B04BFF`, kèm lớp sáng ngoài (glow) tím ~10 px.
- Bo góc: 22–28 px (bo rất tròn, kiểu pill/viên thuốc cho thẻ ngang).
- Bóng: đổ xuống nhẹ, mờ, màu tím đậm.
- Chữ: trắng, đậm, có viền tối mỏng 2 px để dễ đọc trên nền sáng.

## 12. Thứ tự lớp (từ dưới lên)

1. Nền trời + mây + khinh khí cầu xa.
2. Cảnh đường đua: lề, dầm trang trí, mặt đường, cổng ĐÍCH.
3. Chướng ngại (búa, cầu gai, vùng đỏ cảnh báo).
4. Nhân vật + biển tên + hiệu ứng tốc độ.
5. Khinh khí cầu gần / banner.
6. HUD: ĐANG ĐUA, THỜI GIAN, 3 thẻ trái, TOP 10, HÀNG ĐỢI, thẻ thể lệ.
7. Cửa sổ camera cận (tối đa 4) và thông báo nổi (thắng cuộc, lượt mới).

## 13. Vùng an toàn cho TikTok Live Studio

- Giao diện TikTok che một phần ở mép trên (~8%) và mép dưới (~12%) khi phát dọc. Banner nằm từ 2.4%, nên chấp nhận bị che nhẹ phần cờ; thanh HÀNG ĐỢI và thẻ thể lệ (89.8–95.9%) nằm trong vùng có thể bị chat đè lên, nếu cần có thể đẩy lên ~4% khi chỉnh theo config.

## 14. Ghi chú triển khai (Task 11A)

HUD dựng bằng HTML/CSS đặt chồng lên canvas (chữ sắc nét, hiệu ứng CSS dễ làm, dùng chung một component khung), đã chỉnh so với các số ở trên để chữ phụ đạt tối thiểu 28px trên khung 1080:

- Khung THỜI GIAN rộng 364 (x 652 đến 1016) để vừa "02:36 / 03:00" không xuống dòng.
- Ba thẻ bên trái rộng 252 (x 14 đến 266).
- TOP 10 rộng 316 (x 754 đến 1070). Các cửa sổ camera cận cùng cột: x 754, rộng 316, cao 172.
- Hàng đợi x 25 đến 685, thẻ thể lệ x 700 đến 1056.
- Thẻ "Khóa nhân vật" đổi thành "Camera cận (bình luận S)" kèm nút hiển thị số camera, ví dụ `2/4` (theo CONTEXT.md).
- Thẻ quà ghi "Tặng quà = Tăng tốc cao độ" (bỏ dấu "!!" cho đỡ giục tặng quà).
