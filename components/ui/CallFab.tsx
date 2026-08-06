/**
 * Nút gọi nổi (Call FAB) cho HOTLINE CÔNG TY — kênh hỗ trợ chung, công khai.
 *
 * QUAN TRỌNG: hotline KHÁC hoàn toàn nút Zalo/SĐT trên share link (vốn định tuyến về
 * CTV/chủ nhà qua lib/zalo.ts). CallFab KHÔNG đi qua lib/zalo.ts — chỉ là tel: thẳng.
 *
 * Số mặc định lấy từ lib/contact.ts. Trang server nên truyền `phone`/`display` lấy từ
 * `getSupportContact()` (lib/contact-server.ts) để admin đổi hotline trong Cài đặt là
 * toàn web đổi theo, không phải sửa code.
 *
 * 📐 Hình dạng (sửa 06/08/2026 — người dùng báo "nút nhỏ và méo xấu" trên điện thoại):
 *  - Trên mobile chữ bị ẩn, nút cũ còn `h-14 px-3` → rộng 48px mà cao 56px = BẦU DỤC, không tròn.
 *    Nay ép `w-14 h-14` cho tròn đều, icon to lên 26px cho dễ bấm.
 *  - Nút cũ đặt `paddingBottom: env(safe-area-inset-bottom)` TRONG nút cao cố định → phần đệm
 *    ăn vào chiều cao, đẩy icon LỆCH LÊN. Nay safe-area đưa hết vào `bottom` (khoảng cách với
 *    mép màn hình), nút giữ nguyên hình.
 */
import { SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from '@/lib/contact';

interface Props {
  phone?: string;
  /** Số hiển thị trên nút (mặc định hotline công ty). */
  display?: string;
  /** Chữ trước số (mặc định "Hotline"; vd "Gọi ngay" cho link share). */
  label?: string;
  /** Hiện số điện thoại sau label. Tắt khi chỉ muốn CTA gọn "Gọi ngay" (vẫn gọi đúng số qua tel:). */
  showNumber?: boolean;
  /** Có ZaloFab bên dưới → nâng nút gọi lên cho khỏi chồng nhau. */
  stacked?: boolean;
}

export default function CallFab({
  phone = SUPPORT_PHONE,
  display,
  label = 'Hotline',
  showNumber = true,
  stacked = true,
}: Props) {
  const shown = display || SUPPORT_PHONE_DISPLAY;
  return (
    <a
      href={`tel:${phone}`}
      aria-label={`Gọi ${shown}`}
      className="fixed z-50 right-4 inline-flex items-center justify-center gap-2 rounded-full bg-brand-700 text-white shadow-lg shadow-brand-900/30 transition-all hover:scale-105 hover:bg-brand-800 hover:shadow-xl active:scale-95
        w-14 h-14 sm:w-auto sm:h-12 sm:px-5
        font-semibold text-sm"
      style={{
        // Safe-area iOS nằm ở KHOẢNG CÁCH đáy, không phải padding trong nút (padding làm méo nút).
        // stacked: chừa chỗ cho ZaloFab bên dưới (mobile 56px + khe, desktop 48px + khe).
        bottom: `calc(${stacked ? '5.5rem' : '1rem'} + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      <span className="hidden sm:inline whitespace-nowrap">{showNumber ? `${label} ${shown}` : label}</span>
    </a>
  );
}
