/**
 * Client-safe. GIÁ THEO ĐẦU NGƯỜI khi ở ghép — tính năng mùa sinh viên nhập học.
 *
 * ⚠️ VÌ SAO CÓ FILE NÀY: đo kho ngày 14/08/2026 — 45 khách xin xem phòng có giá giữa 4tr,
 * cao nhất 5tr, KHÔNG ai hỏi tin trên 5tr; trong khi 206 tin (32% kho) từ 5tr trở lên chỉ
 * sinh đúng 2 lead. Sinh viên gần như luôn ở ghép: bạn ngân sách 3tr/người mà rủ thêm 1 bạn
 * thì kham được phòng 6tr — nhưng bộ lọc cũ chỉ hiểu giá NGUYÊN PHÒNG nên cắt sạch nhóm tin
 * đó khỏi kết quả. Cho khách khai "ở mấy người" là mở lại đúng phần kho đang chết.
 *
 * Con số ở đây là GỢI Ý sức chứa hợp lý, không phải cam kết của chủ nhà — chủ nhà có thể
 * giới hạn số người. Vì vậy chữ hiển thị luôn ghi "ở ghép N người" chứ không hứa "được ở N".
 */

/** Số người ở ghép hợp lý nhất cho 1 tin — theo loại phòng và diện tích. */
export function suggestedOccupancy(typeName?: string | null, areaSqm?: number | null): number {
  // Nhiều phòng ngủ → ghép được nhiều hơn, không phụ thuộc diện tích
  if (typeName === '2k1n' || typeName === 'duplex') return 3;
  const area = areaSqm || 0;
  if (area >= 35) return 3;
  if (area >= 15) return 2;
  // Dưới 15m² (hoặc chưa khai diện tích) → chỉ tính 1 người cho chắc
  return 1;
}

/** Giá mỗi người khi chia đều cho `people`. Trả null khi không chia (1 người). */
export function pricePerPerson(priceMonthly: number, people: number): number | null {
  if (!priceMonthly || people < 2) return null;
  return Math.round(priceMonthly / people);
}

/** "≈2,4tr/người" — chuỗi ngắn gọn cho thẻ tin, làm tròn tới 0,1 triệu. */
export function formatPerPerson(priceMonthly: number, people: number): string | null {
  const per = pricePerPerson(priceMonthly, people);
  if (per === null) return null;
  return `≈${(per / 1e6).toFixed(1).replace('.', ',')}tr/người`;
}

/** Các lựa chọn "ở mấy người" cho bộ lọc công khai. */
export const OCCUPANCY_OPTIONS = [
  { value: 1, label: 'Ở một mình' },
  { value: 2, label: 'Ở ghép 2 người' },
  { value: 3, label: 'Ở ghép 3 người' },
] as const;
