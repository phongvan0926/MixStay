/**
 * Giữ `status` và `availableUnits` của RoomType KHÔNG BAO GIỜ mâu thuẫn nhau.
 *
 * Vì sao cần: trang chủ nhà cho sửa nhanh "số phòng trống" bằng 1 ô số, PUT /api/rooms
 * chỉ gửi mỗi `availableUnits` — trạng thái giữ nguyên 🟢. Chủ nhà cho thuê hết phòng,
 * gõ 0, thế là tin thành "AVAILABLE nhưng còn 0 phòng": thẻ tin in ra "Còn 0 phòng" cho
 * khách đọc, JSON-LD vẫn khai InStock nên Google quảng cáo là còn phòng. Hai tin thật đã
 * rơi vào tình trạng này (MS-8P68ST, MS-ETCR26 — phát hiện khi rà soát 06/08/2026).
 *
 * Quy tắc: SỬA CÁI NGƯỜI DÙNG KHÔNG ĐỘNG TỚI, giữ nguyên cái họ vừa đổi.
 *   - Vừa đổi trạng thái  → tin vào trạng thái, nắn lại con số.
 *   - Chỉ đổi con số      → tin vào con số, nắn lại trạng thái.
 * 🟡 UPCOMING không đụng tới: "sắp trống" thì hiện chưa có phòng nào là đúng, và
 * cron lifecycle đã tự bơm availableUnits ≥ 1 khi tới ngày chuyển sang 🟢.
 *
 * ⚠️ `changed` phải là "ĐỔI SANG GIÁ TRỊ MỚI", không phải "có gửi field lên". Kho đang có
 * 142 tin 🔴 mà availableUnits vẫn > 0 (dữ liệu cũ, khách không nhìn thấy vì tin 🔴 bị lọc
 * khỏi trang công khai). Nếu chỉ cần "có gửi field" là nắn, thì mọi thao tác lưu tin đi qua
 * đây sẽ ĐĂNG LẠI cả 142 tin đã cho thuê xong — hỏng việc nặng hơn lỗi đang sửa.
 */
export type RoomStatusValue = 'AVAILABLE' | 'UPCOMING' | 'UNAVAILABLE';

export function reconcileAvailability(
  /** Giá trị SAU khi trộn dữ liệu gửi lên với bản đang có trong DB */
  next: { status: RoomStatusValue; availableUnits: number; totalUnits?: number },
  /** Người dùng vừa ĐỔI field đó sang giá trị mới (không phải chỉ "có gửi lên") */
  changed: { status?: boolean; availableUnits?: boolean } = {},
): { status: RoomStatusValue; availableUnits: number; totalUnits?: number } {
  let status = next.status;
  let availableUnits = Math.max(0, Number.isFinite(next.availableUnits) ? next.availableUnits : 0);

  if (status === 'AVAILABLE' && availableUnits === 0) {
    // Vừa bấm "🟢 Còn phòng" mà số trống = 0 → họ muốn tin hiển thị, cho ít nhất 1 phòng.
    // (Cùng cách xử lý với cron lifecycle khi tin 🟡 tới ngày trống.)
    if (changed.status) availableUnits = 1;
    // Còn lại: gõ số trống về 0, hoặc lưu lại tin vốn đã lệch → hết phòng thật.
    else status = 'UNAVAILABLE';
  } else if (status === 'UNAVAILABLE' && availableUnits > 0) {
    // Vừa bấm "🔴 Hết phòng" → dọn số trống về 0 cho khớp.
    if (changed.status) availableUnits = 0;
    // Vừa GÕ LẠI số phòng trống trên tin đang 🔴 → chủ nhà có phòng trở lại, mở tin ra.
    else if (changed.availableUnits) status = 'AVAILABLE';
    // Không đổi gì cả → KHÔNG đụng vào (bảo vệ 142 tin 🔴 dữ liệu cũ, xem chú thích trên).
  }

  // "Còn 3/2 phòng" cũng là vô lý — tổng không bao giờ nhỏ hơn số đang trống.
  const totalUnits = next.totalUnits === undefined ? undefined : Math.max(next.totalUnits, availableUnits);

  return { status, availableUnits, ...(totalUnits === undefined ? {} : { totalUnits }) };
}
