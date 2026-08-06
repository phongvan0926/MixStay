/**
 * Nhúng JSON-LD an toàn vào <script type="application/ld+json">.
 *
 * JSON.stringify KHÔNG escape "</script>". Tên tin / mô tả là do chủ nhà tự gõ, nên chỉ cần
 * đặt tên tin là `Phòng đẹp</script><script>…</script>` là thoát khỏi thẻ script và chạy được
 * JS trên chính miền mixstay.vn (đánh cắp phiên admin đang xem trang, sửa nội dung…).
 * Phát hiện khi kiểm định 07/08/2026 — trang /tin/[id] là trang CÔNG KHAI, ai cũng mở được.
 *
 * Escape < > & thành dạng \u00XX: JSON vẫn hợp lệ, Google vẫn đọc được, nhưng không thể
 * đóng thẻ script.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
