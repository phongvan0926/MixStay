'use client';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

const menuItems: Record<string, { label: string; href: string; icon: string }[]> = {
  ADMIN: [
    { label: 'Tổng quan', href: '/admin/properties', icon: '📊' },
    { label: 'Công ty', href: '/admin/companies', icon: '🏛️' },
    { label: 'Tòa nhà', href: '/admin/properties', icon: '🏢' },
    { label: 'Phòng', href: '/admin/rooms', icon: '🚪' },
    { label: 'Giao dịch', href: '/admin/deals', icon: '💰' },
    { label: 'Người dùng', href: '/admin/users', icon: '👥' },
    { label: 'Cài đặt', href: '/admin/settings', icon: '⚙️' },
  ],
  BROKER: [
    { label: 'Kho hàng', href: '/broker/inventory', icon: '📦' },
    { label: 'Giao dịch', href: '/broker/deals', icon: '💰' },
    { label: 'Link chia sẻ', href: '/broker/share-links', icon: '🔗' },
  ],
  LANDLORD: [
    { label: 'Tòa nhà', href: '/landlord/properties', icon: '🏠' },
    { label: 'Loại phòng', href: '/landlord/rooms', icon: '🚪' },
    { label: 'Link chia sẻ', href: '/landlord/share-links', icon: '🔗' },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse text-stone-400">Đang tải...</div>
      </div>
    );
  }

  if (!session) return null;

  const role = (session.user as any).role as string;
  const items = menuItems[role] || [];

  // Notification badge - poll every 30s
  const { data: notifData } = useSWR(
    session ? '/api/notifications?limit=1' : null,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  );
  const unreadCount = notifData?.unreadCount || 0;

  // Which menu item gets the badge
  const badgeHref: Record<string, string> = {
    LANDLORD: '/landlord/rooms',
    ADMIN: '/admin/properties',
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-display font-semibold text-lg hidden sm:inline">MixStay</span>
            </Link>
            <span className="text-stone-300">|</span>
            <span className="text-sm font-medium text-stone-500">
              {role === 'ADMIN' && 'Quản trị'}
              {role === 'BROKER' && 'Môi giới'}
              {role === 'LANDLORD' && 'Chủ nhà'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-stone-900">{session.user?.name}</p>
              <p className="text-xs text-stone-500">{session.user?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
              {session.user?.name?.charAt(0).toUpperCase()}
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-ghost text-xs text-stone-500">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-stone-200/60 p-4 overflow-y-auto hidden lg:block">
          <nav className="space-y-1">
            {items.map((item) => {
              const showBadge = unreadCount > 0 && item.href === badgeHref[role];
              return (
                <Link key={item.href + item.label} href={item.href}
                  className={`${pathname === item.href ? 'sidebar-link-active' : 'sidebar-link'} relative`}>
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                  {showBadge && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200/60 flex lg:hidden">
          {items.slice(0, 4).map((item) => {
            const showBadge = unreadCount > 0 && item.href === badgeHref[role];
            return (
              <Link key={item.href + item.label} href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs relative ${
                  pathname === item.href ? 'text-brand-600 font-medium' : 'text-stone-500'
                }`}>
                <span className="text-lg relative">
                  {item.icon}
                  {showBadge && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 lg:ml-60 min-h-[calc(100vh-4rem)] pb-20 lg:pb-8">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
