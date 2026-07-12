import { headers } from 'next/headers';

/**
 * Ảnh OG dùng chung cho mọi trang chia sẻ (/tin/[id], /share/[token], /p/[token], /share/system/[token]).
 *
 * LUÔN trỏ về /api/og/[id] (JPEG 1200×630) thay vì URL ảnh gốc trên Supabase:
 * ảnh gốc phần lớn là .webp — Zalo KHÔNG hiển thị được WebP nên link share lên Zalo mất thumbnail.
 *
 * Dựng URL TUYỆT ĐỐI từ host thật của request (không dựa vào metadataBase — Next ghi đè
 * metadataBase thành localhost khi chạy dev, và crawler chỉ chấp nhận URL tuyệt đối).
 */
function absUrl(path: string): string {
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'mixstay.vn';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}${path}`;
}

export function ogImage(roomTypeId: string, alt = 'MixStay') {
  return { url: absUrl(`/api/og/${roomTypeId}`), width: 1200, height: 630, type: 'image/jpeg', alt };
}

/** Ảnh mặc định (đã là .jpg — Zalo đọc được) khi không gắn với tin đăng cụ thể nào. */
export function ogDefaultImage(alt = 'MixStay') {
  return { url: absUrl('/default.jpg'), width: 1200, height: 630, type: 'image/jpeg', alt };
}

/** Twitter/Zalo card lớn — dùng kèm ogImage() để preview hiện ảnh khổ rộng. */
export const largeCard = { card: 'summary_large_image' as const };
