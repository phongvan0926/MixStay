/**
 * Nút gọi nổi (Call FAB) cho HOTLINE CÔNG TY — số tĩnh, công khai, kênh hỗ trợ chung.
 *
 * QUAN TRỌNG: hotline KHÁC hoàn toàn nút Zalo/SĐT trên share link (vốn định tuyến về
 * broker/chủ nhà qua lib/zalo.ts). CallFab KHÔNG đi qua lib/zalo.ts — chỉ là tel: tĩnh.
 *
 * Mặc định stacked={true}: đặt LỆCH lên trên ZaloFab (ZaloFab ở right-4 bottom-4) để không chồng.
 * Trang chủ không có ZaloFab → dùng stacked={false} (về vị trí FAB chuẩn bottom-4).
 * Tôn trọng safe-area-inset iOS giống ZaloFab.
 */
interface Props {
  phone?: string;
  /** Số hiển thị trên nút (mặc định hotline công ty). */
  display?: string;
  /** Chữ trước số (mặc định "Hotline"; vd "Gọi" cho link môi giới). */
  label?: string;
  stacked?: boolean;
}

export default function CallFab({ phone = '0379838222', display, label = 'Hotline', stacked = true }: Props) {
  const shown = display || '0379 838 222';
  return (
    <a
      href={`tel:${phone}`}
      aria-label={`Gọi ${shown}`}
      className={`fixed z-50 right-4 ${stacked ? 'bottom-24' : 'bottom-4'} inline-flex items-center gap-2 rounded-full bg-brand-700 text-white shadow-lg shadow-brand-900/30 transition-all hover:scale-105 hover:bg-brand-800 hover:shadow-xl active:scale-95
        h-14 sm:h-12 px-3 sm:px-4
        font-semibold text-sm`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        marginBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
      <span className="hidden sm:inline whitespace-nowrap">{label} {shown}</span>
    </a>
  );
}
