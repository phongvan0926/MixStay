/**
 * Client-safe. Diễn giải LỊCH HẸN XEM PHÒNG (ViewingRequest.preferredDate + preferredSlot).
 *
 * Trước v9.59 khách gõ giờ hẹn vào ô ghi chú tự do — dữ liệu thật đọc được: "8h sáng Chủ
 * nhật 16.8", "sáng mai", "19/8/2026 em sẽ ra xem", "Hôm nay 9h và sáng hoặc tối t2". Admin
 * phải đọc từng dòng mới biết ai hẹn khi nào; 45 lead dồn vào một tháng là lỡ hẹn.
 */

export const SLOT_LABEL: Record<string, string> = {
  morning: 'sáng',
  afternoon: 'chiều',
  evening: 'tối',
};

/** Số ngày từ HÔM NAY tới ngày hẹn (0 = hôm nay, 1 = mai, âm = đã qua). */
export function daysUntil(date: string | Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/**
 * "Hẹn sáng nay" / "Hẹn chiều mai" / "Hẹn 19/08 tối" — chuỗi ngắn cho bảng lead.
 * `urgent` = hẹn hôm nay hoặc mai → tô nổi bật, đây là việc phải làm ngay.
 * `past` = ngày hẹn đã trôi qua mà lead vẫn chưa xử lý xong.
 */
export function appointmentLabel(
  preferredDate?: string | Date | null,
  preferredSlot?: string | null,
): { text: string; urgent: boolean; past: boolean } | null {
  if (!preferredDate) return null;
  const diff = daysUntil(preferredDate);
  const slot = preferredSlot ? SLOT_LABEL[preferredSlot] || '' : '';

  let when: string;
  if (diff === 0) when = slot ? `${slot} nay` : 'hôm nay';
  else if (diff === 1) when = slot ? `${slot} mai` : 'ngày mai';
  else if (diff === 2) when = slot ? `${slot} ngày kia` : 'ngày kia';
  else {
    const d = new Date(preferredDate);
    when = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}${slot ? ` ${slot}` : ''}`;
  }
  return { text: `Hẹn ${when}`, urgent: diff >= 0 && diff <= 1, past: diff < 0 };
}
