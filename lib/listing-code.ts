/**
 * Mã tin đăng (listingCode) — phần CLIENT-SAFE (không import 'crypto').
 *
 * Format: "MS-" + 6 ký tự IN HOA chữ-số, BỎ ký tự dễ nhầm (0/O, 1/I/L) → vd MS-7K3P9Q.
 * Sinh mã (cần crypto) nằm ở lib/listing-code-server.ts để KHÔNG kéo 'crypto' vào client bundle.
 */

export const LISTING_CODE_PREFIX = 'MS-';
/** Regex kiểm tra một chuỗi có đúng format mã tin đăng đầy đủ không (tìm kiếm/validate). */
export const LISTING_CODE_REGEX = /^MS-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/** Chuẩn hóa input người dùng nhập để tìm theo mã: trim, upper, tự thêm tiền tố MS- nếu thiếu. */
export function normalizeListingCode(input: string): string {
  let v = (input || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!v) return v;
  if (v.startsWith(LISTING_CODE_PREFIX)) return v;
  if (v.startsWith('MS')) return LISTING_CODE_PREFIX + v.slice(2);
  return LISTING_CODE_PREFIX + v;
}
