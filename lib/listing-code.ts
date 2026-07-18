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

/** Chuẩn hoá mã công ty admin nhập: upper, bỏ khoảng trắng và dấu gạch (gạch là ký tự phân tách). */
export function normalizeCompanyCode(input: string): string {
  return (input || '').trim().toUpperCase().replace(/[\s-]+/g, '');
}

/**
 * Mã tin HIỂN THỊ: chèn mã công ty vào giữa để admin nhìn biết thuộc công ty nào.
 * MS-F76EAW + code "066" → "MS-066-F76EAW". Không có mã công ty → giữ nguyên.
 */
export function formatListingCode(listingCode?: string | null, companyCode?: string | null): string {
  if (!listingCode) return '';
  const cc = (companyCode || '').trim();
  if (!cc) return listingCode;
  if (listingCode.startsWith(LISTING_CODE_PREFIX)) {
    return LISTING_CODE_PREFIX + cc + '-' + listingCode.slice(LISTING_CODE_PREFIX.length);
  }
  return listingCode;
}

/**
 * Tách chuỗi tìm kiếm "MS-066-F76EAW" người dùng gõ → { companyCode:'066', baseCode:'MS-F76EAW' }.
 * Không có phần công ty ở giữa → companyCode='' và baseCode chuẩn hoá bình thường.
 */
export function parseComposedListingCode(input: string): { companyCode: string; baseCode: string } {
  const v = (input || '').trim().toUpperCase().replace(/\s+/g, '');
  const m = v.match(/^MS-([A-Z0-9]+)-([ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6})$/);
  if (m) return { companyCode: m[1], baseCode: LISTING_CODE_PREFIX + m[2] };
  return { companyCode: '', baseCode: normalizeListingCode(v) };
}
