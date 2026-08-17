'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Logo from '@/components/ui/Logo';
import Avatar from '@/components/ui/Avatar';

// Trang dashboard tương ứng từng vai trò (mirror app/auth/callback + DashboardLayout menu).
const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  ADMIN_STAFF: '/admin/dashboard',
  BROKER: '/broker/inventory',
  LANDLORD: '/landlord/properties',
};

/**
 * Navbar trang chủ CÓ NHẬN SESSION: đã đăng nhập → hiện tên + avatar + nút vào trang
 * quản lý + Đăng xuất (giống topbar dashboard); chưa đăng nhập → Đăng nhập/Đăng ký.
 * Trước đây navbar tĩnh luôn hiện "Đăng nhập" khiến user tưởng bị đăng xuất khi về trang chủ.
 */
export default function PublicNav() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const role: string | undefined = user?.role;
  const homeHref = role ? ROLE_HOME[role] : undefined;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-800/95 supports-[backdrop-filter]:bg-brand-800/85 backdrop-blur-xl border-b border-brand-700/50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-3">
          {/* shrink-0: khi đăng nhập, thanh nav có tới 5 mục — flex sẽ BÓP logo cho vừa
              (đo 07/08/2026: tỷ lệ 2.24 trong khi gốc là 3.01 → nén ngang 26%, chữ MixStay méo).
              Logo phải giữ nguyên khổ, mục khác thiếu chỗ thì thu gọn chữ chứ không ép logo. */}
          <Link href="/" className="flex items-center shrink-0" aria-label="MixStay - Trang chủ">
            {/* Dưới 430px: logo XẾP DỌC — biểu tượng trên, chữ "MixStay" dưới.
                Vì sao không dùng logo ngang: nó rộng 96px, ăn hết chỗ của nút "Bản đồ" (tính năng
                cần khoe, để trơ mỗi icon thì khách không hiểu là tìm phòng trên bản đồ).
                Vì sao không để mỗi biểu tượng: cụt, không đọc ra tên thương hiệu.
                Xếp dọc chỉ rộng 44px mà vẫn đủ cả hình lẫn tên.
                Biểu tượng cắt từ chính logo-nav.png bằng object-cover (khỏi cần file ảnh mới):
                khung phải là CHỮ NHẬT tỷ lệ ~0.89 — khung vuông cắt 33.2% và lộ một vạch của chữ "M". */}
            <span className="flex flex-col items-center leading-none min-[430px]:hidden" aria-hidden="true">
              <Logo variant="light" className="h-7 w-[25px] shrink-0 object-cover object-left" alt="" />
              <span className="mt-0.5 font-display text-[11px] font-bold tracking-tight text-gold-400">MixStay</span>
            </span>
            <Logo variant="light" className="hidden min-[430px]:block h-8 sm:h-9 w-auto shrink-0 object-contain" />
          </Link>
          {/* Cùng KIỂU với nút "Tìm theo bản đồ" ở ô tìm kiếm bên dưới (gradient tím → xanh, bo xl,
              đổ bóng, nhấc nhẹ khi rê chuột) để khách nhận ra ngay là cùng một lối vào — chỉ khác
              chữ màu VÀNG cho ăn với logo.
              Vì sao gradient đậm hơn bản dưới (violet-800/brand-700 thay vì -600): nút dưới nằm
              trên thẻ TRẮNG, nút này nằm trên nav XANH ĐẬM. Giữ nguyên sắc -600 thì chữ gold-300
              chỉ đạt tương phản 3.3:1 (chuẩn WCAG AA cần 4.5:1 cho chữ 14px) và đầu xanh của
              gradient chìm vào nền nav. Đậm 2 nấc → 5.3:1 ở cả hai đầu gradient.
              Bỏ icon 🗺️ theo yêu cầu: chữ đã nói rõ, icon chỉ làm nút dài thêm. */}
          <Link href="/ban-do" aria-label="Tìm phòng trên bản đồ"
            className="inline-flex items-center justify-center shrink-0 text-sm px-3 sm:px-6 py-2 min-h-11 sm:min-h-0 rounded-xl font-semibold text-gold-300 bg-gradient-to-r from-violet-800 to-brand-700 ring-1 ring-white/20 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap">
            <span className="sm:hidden">Bản đồ</span>
            <span className="hidden sm:inline">Tìm trên bản đồ</span>
          </Link>
        </div>

        {status === 'loading' ? (
          // Chỗ giữ chỗ tránh nháy nút "Đăng nhập" rồi mới đổi sang phiên đã đăng nhập
          <div className="h-11 sm:h-9 w-28 rounded-xl bg-white/10 animate-pulse" />
        ) : status === 'authenticated' && user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {homeHref && (
              <Link href={homeHref}
                className="inline-flex items-center justify-center shrink-0 text-sm px-2.5 sm:px-4 py-2 min-h-11 sm:min-h-0 rounded-xl font-semibold bg-white text-brand-700 hover:bg-brand-50 transition-colors whitespace-nowrap">
                <span className="sm:hidden">Quản lý</span>
                <span className="hidden sm:inline">Vào trang quản lý</span>
              </Link>
            )}
            <div className="flex items-center gap-2 text-white">
              {user.image ? (
                <div className="shrink-0"><Avatar src={user.image} name={user.name} size={32} /></div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center font-semibold text-sm shrink-0">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span className="hidden sm:inline text-sm font-medium max-w-[140px] truncate">{user.name}</span>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/' })} aria-label="Đăng xuất"
              className="inline-flex items-center justify-center shrink-0 text-sm px-2.5 sm:px-3 py-2 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 rounded-xl font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/login" className="inline-flex items-center justify-center shrink-0 text-sm px-2.5 sm:px-4 py-2 min-h-11 sm:min-h-0 rounded-xl font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">Đăng nhập</Link>
            <Link href="/register" className="inline-flex items-center justify-center shrink-0 text-sm px-2.5 sm:px-5 py-2 min-h-11 sm:min-h-0 rounded-xl font-semibold bg-white text-brand-700 hover:bg-brand-50 transition-colors whitespace-nowrap">
              <span className="sm:hidden">Đăng ký</span>
              <span className="hidden sm:inline">Đăng ký miễn phí</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
