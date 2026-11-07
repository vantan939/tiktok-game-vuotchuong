import { fromGift } from './adapt.js';

const MAX_OPEN = 500;

/**
 * Quà liên hoàn (giftType 1) bắn nhiều sự kiện rồi một sự kiện kết thúc (repeatEnd). Chờ tới lúc kết thúc mới báo thì nhân vật
 * nhận quà rất trễ (cả chuỗi có thể kéo dài nhiều giây). Nên:
 *  - sự kiện ĐẦU của chuỗi báo ngay với giá trị một quà (khiên và tăng tốc có hiệu lực liền);
 *  - các sự kiện giữa chuỗi bỏ qua (không tính lặp);
 *  - sự kiện KẾT THÚC báo thêm một lần với tổng giá trị (followUp: true, kèm unitDiamonds) chỉ khi chuỗi dài đủ để có thể
 *    đổi bậc quà; client chỉ áp dụng khi thật sự lên bậc cao hơn, nên không tính hai lần.
 * Quà thường (không liên hoàn) báo ngay như bình thường. Nếu lỡ sự kiện đầu thì tính trọn chuỗi lúc kết thúc.
 */
export class GiftStreaks {
  constructor() {
    this.open = new Set(); // khóa chuỗi đang chạy đã báo sự kiện đầu
  }

  /** Dữ liệu gift thô của thư viện -> GameEvent gift hoặc null. */
  handle(data) {
    const detail = data?.giftDetails ?? data?.gift ?? data?.extendedGiftInfo ?? {};
    const type = Number(detail.giftType ?? detail.type);
    if (type !== 1) return fromGift(data);
    const u = data?.user ?? {};
    const key = [u.userId ?? u.id ?? u.uniqueId, data.giftId ?? detail.id, data.groupId ?? ''].join('|');

    if (!data.repeatEnd) {
      if (this.open.has(key)) return null; // chuỗi đang chạy, đã báo sự kiện đầu rồi
      this.open.add(key);
      if (this.open.size > MAX_OPEN) this.open.delete(this.open.values().next().value);
      return fromGift({ ...data, repeatCount: 1, repeatEnd: true }); // báo ngay một quà
    }

    const hadStart = this.open.delete(key);
    const total = fromGift(data);
    if (!total || !hadStart) return total; // lỡ sự kiện đầu: tính trọn chuỗi như cũ
    const unit = fromGift({ ...data, repeatCount: 1 });
    if (!unit || total.diamonds <= unit.diamonds) return null; // chuỗi chỉ một quà: đã báo rồi
    return { ...total, followUp: true, unitDiamonds: unit.diamonds };
  }
}
