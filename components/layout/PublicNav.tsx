'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Logo from '@/components/ui/Logo';

// Trang dashboard tương ứng từng vai trò (mirror app/auth/callback + DashboardLayout menu).
const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin/properties',
  ADMIN_STAFF: '/admin/properties',
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
          <Link href="/" className="flex items-center" aria-label="MixStay - Trang chủ">
            <Logo variant="light" className="h-9 w-auto" />
          </Link>
          <Link href="/ban-do"
            className="text-sm px-2.5 sm:px-3 py-2 rounded-xl font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">
            🗺️ <span className="sm:hidden">Bản đồ</span><span className="hidden sm:inline">Tìm phòng theo bản đồ</span>
          </Link>
        </div>

        {status === 'loading' ? (
          // Chỗ giữ chỗ tránh nháy nút "Đăng nhập" rồi mới đổi sang phiên đã đăng nhập
          <div className="h-9 w-28 rounded-xl bg-white/10 animate-pulse" />
        ) : status === 'authenticated' && user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {homeHref && (
              <Link href={homeHref}
                className="text-sm px-3 sm:px-4 py-2 rounded-xl font-semibold bg-white text-brand-700 hover:bg-brand-50 transition-colors whitespace-nowrap">
                <span className="sm:hidden">Quản lý</span>
                <span className="hidden sm:inline">Vào trang quản lý</span>
              </Link>
            )}
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center font-semibold text-sm shrink-0">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline text-sm font-medium max-w-[140px] truncate">{user.name}</span>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm px-2.5 sm:px-3 py-2 rounded-xl font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/login" className="text-sm px-2.5 sm:px-4 py-2 rounded-xl font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">Đăng nhập</Link>
            <Link href="/register" className="text-sm px-3 sm:px-5 py-2 rounded-xl font-semibold bg-white text-brand-700 hover:bg-brand-50 transition-colors whitespace-nowrap">
              <span className="sm:hidden">Đăng ký</span>
              <span className="hidden sm:inline">Đăng ký miễn phí</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
