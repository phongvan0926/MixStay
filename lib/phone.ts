/**
 * Kiểm tra & bóc số điện thoại Việt Nam. Client-safe (không import prisma).
 *
 * Vì sao có file này (rà soát 06/08/2026):
 *  1. Công ty BNBHOLDING lưu "09366258556" — 11 chữ số, bấm gọi không ra. Không ai biết
 *     vì hệ thống chưa từng kiểm định dạng SĐT ở bất kỳ đâu.
 *  2. NẶNG HƠN: 176/464 tòa ghi `zaloPhone` kèm tên người liên hệ ("Lâm 0394632595",
 *     "TÙNG: 037.337.2543"). Kho CTV dựng link bằng `phone.replace(/\s/g,'')` — chỉ bỏ
 *     dấu cách, KHÔNG lọc chữ → ra `zalo.me/Lâm0394632595` và `tel:TÙNG: 037.337.2543`.
 *     Nút Zalo/gọi của CTV hỏng câm trên 38% số tòa.
 *
 * Quy tắc số VN: 10 chữ số, bắt đầu bằng 0, chữ số thứ 2 ∈ {2,3,5,7,8,9}
 * (02x cố định; 03/05/07/08/09 di động). Chấp nhận +84/84 và các dấu . - ( ) khoảng trắng.
 */

const VN_MOBILE_HEADS = '235789';

/** Chuỗi này có phải một số VN hợp lệ (đã bóc sạch) không */
export function isValidVNPhone(digits: string): boolean {
  return digits.length === 10 && digits[0] === '0' && VN_MOBILE_HEADS.includes(digits[1]);
}

/**
 * Bóc số điện thoại dùng được từ chuỗi người dùng gõ tự do.
 * "Lâm 0394632595" → "0394632595" | "+84912345678" → "0912345678" | "09366258556" → null
 * Trả null khi KHÔNG chắc chắn (không có số hợp lệ, hoặc có nhiều số khác nhau → không đoán bừa).
 */
export function extractVNPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const compact = String(raw).replace(/[.\-\s()]/g, '');
  const runs = (compact.match(/\d{9,12}/g) || []).map(run =>
    // +84912345678 / 84912345678 → 0912345678
    /^84\d{9}$/.test(run) ? '0' + run.slice(2) : run,
  );
  const valid = Array.from(new Set(runs.filter(isValidVNPhone)));
  return valid.length === 1 ? valid[0] : null;
}

export type PhoneCheck =
  | { status: 'empty'; phone: null; reason: null }
  /** Sạch: đúng 10 số, không lẫn ký tự nào khác */
  | { status: 'ok'; phone: string; reason: null }
  /** Bóc được số dùng tốt nhưng còn lẫn tên/dấu — link vẫn chạy, chỉ nên dọn cho gọn */
  | { status: 'messy'; phone: string; reason: string }
  /** KHÔNG bóc được số nào dùng được — phải có người sửa */
  | { status: 'invalid'; phone: null; reason: string };

/** Phân loại một ô SĐT để quyết định có cảnh báo hay không */
export function checkPhone(raw?: string | null): PhoneCheck {
  if (!raw || !String(raw).trim()) return { status: 'empty', phone: null, reason: null };
  const v = String(raw).trim();

  const phone = extractVNPhone(v);
  if (phone) {
    if (/^0\d{9}$/.test(v)) return { status: 'ok', phone, reason: null };
    return { status: 'messy', phone, reason: 'còn lẫn tên/ký tự — nên để lại đúng 10 số' };
  }

  // Không bóc được → nói rõ SAI Ở ĐÂU để người dùng biết đường sửa
  const digits = v.replace(/\D/g, '');
  let reason: string;
  if (!digits) reason = 'không có chữ số nào';
  else if (digits.length > 10) reason = `thừa số — đang có ${digits.length} chữ số, số Việt Nam chỉ 10`;
  else if (digits.length < 10) reason = `thiếu số — đang có ${digits.length} chữ số, số Việt Nam cần 10`;
  else if (digits[0] !== '0') reason = 'số Việt Nam phải bắt đầu bằng 0';
  else reason = `đầu số "0${digits[1]}" không có thật ở Việt Nam`;

  return { status: 'invalid', phone: null, reason };
}

/** Chỉ cảnh báo khi THỰC SỰ không gọi được — "messy" vẫn bấm gọi ngon nên không làm phiền */
export function needsPhoneWarning(raw?: string | null): boolean {
  return checkPhone(raw).status === 'invalid';
}

/** href="tel:..." an toàn — null nếu không có số dùng được (để ẩn nút thay vì đưa link hỏng) */
export function telHref(raw?: string | null): string | null {
  const phone = extractVNPhone(raw);
  return phone ? `tel:${phone}` : null;
}

/** Link Zalo an toàn — null nếu không có số dùng được */
export function zaloHref(raw?: string | null): string | null {
  const phone = extractVNPhone(raw);
  return phone ? `https://zalo.me/${phone}` : null;
}

/** Hiển thị gọn: "0912 345 678" */
export function formatPhone(raw?: string | null): string {
  const phone = extractVNPhone(raw);
  if (!phone) return String(raw ?? '');
  return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}
