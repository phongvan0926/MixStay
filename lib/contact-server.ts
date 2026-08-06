import { cache } from 'react';
import prisma from '@/lib/prisma';
import { SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, SUPPORT_ZALO } from '@/lib/contact';
import { extractVNPhone, formatPhone } from '@/lib/phone';

/**
 * SERVER-ONLY: đọc hotline công ty từ bảng `settings` để ADMIN đổi số trong
 * /admin/settings là toàn web đổi theo — không phải sửa code + deploy lại.
 *
 * Hằng số trong lib/contact.ts giờ chỉ còn là GIÁ TRỊ DỰ PHÒNG: dùng khi admin chưa
 * từng đặt, hoặc khi DB lỗi (trang công khai không được sập chỉ vì đọc settings hỏng).
 *
 * Khoá settings: `support_phone` (10 số) và `support_zalo` (link Zalo, để trống thì tự
 * dựng từ số hotline).
 *
 * ⚠️ Trang nào gọi hàm này phải có `export const revalidate = …` — nếu không Next dựng
 * tĩnh lúc build và số hotline sẽ đứng im mãi dù admin đã đổi.
 */
export const SETTING_SUPPORT_PHONE = 'support_phone';
export const SETTING_SUPPORT_ZALO = 'support_zalo';

export type SupportContact = {
  /** 10 số, dùng cho href="tel:" */
  phone: string;
  /** Dạng đẹp cho người đọc: "0352 871 177" */
  display: string;
  /** Link bấm vào mở Zalo */
  zalo: string;
};

export const getSupportContact = cache(async (): Promise<SupportContact> => {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: [SETTING_SUPPORT_PHONE, SETTING_SUPPORT_ZALO] } },
    });
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));

    // Số admin đặt phải hợp lệ mới dùng — settings hỏng không được làm chết nút gọi
    const phone = extractVNPhone(map[SETTING_SUPPORT_PHONE]) || SUPPORT_PHONE;
    const zaloRaw = (map[SETTING_SUPPORT_ZALO] || '').trim();

    return {
      phone,
      display: formatPhone(phone),
      zalo: zaloRaw || (phone === SUPPORT_PHONE ? SUPPORT_ZALO : `https://zalo.me/${phone}`),
    };
  } catch {
    return { phone: SUPPORT_PHONE, display: SUPPORT_PHONE_DISPLAY, zalo: SUPPORT_ZALO };
  }
});
