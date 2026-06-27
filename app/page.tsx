import Link from 'next/link';
import PublicSearch from './PublicSearch';
import FeaturedRooms from './FeaturedRooms';
import Logo from '@/components/ui/Logo';
import CallFab from '@/components/ui/CallFab';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-800/95 supports-[backdrop-filter]:bg-brand-800/85 backdrop-blur-xl border-b border-brand-700/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="MixStay - Trang chủ">
            <Logo variant="light" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/login" className="text-sm px-2.5 sm:px-4 py-2 rounded-xl font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">Đăng nhập</Link>
            <Link href="/register" className="text-sm px-3 sm:px-5 py-2 rounded-xl font-semibold bg-white text-brand-700 hover:bg-brand-50 transition-colors whitespace-nowrap">
              <span className="sm:hidden">Đăng ký</span>
              <span className="hidden sm:inline">Đăng ký miễn phí</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== TÌM PHÒNG (module chính, lên đầu trang sau khi ẩn hero) ===== */}
      <PublicSearch />

      {/* ===== PHÒNG MỚI ĐĂNG ===== */}
      <section className="relative py-12 sm:py-14 px-4 sm:px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10 bg-white" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gold-100/30 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-100/20 rounded-full blur-[100px]" />

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-50 border border-gold-200 px-3 py-1 text-xs font-medium text-gold-800 mb-4">
              🔥 Đang hot
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">Phòng mới đăng</h2>
            <p className="text-stone-500 text-base">Được cập nhật mỗi ngày từ các chủ nhà uy tín</p>
          </div>

          <FeaturedRooms />

          <div className="text-center mt-10">
            <Link href="/register" className="btn-primary px-8 py-3 text-base group hover:-translate-y-0.5 transition-all">
              Xem thêm các phòng mới nhất
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative bg-brand-900 text-stone-300 pt-14 pb-8 px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/25 rounded-full blur-[120px]" />

        <div className="max-w-6xl mx-auto relative">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">
            {/* About */}
            <div>
              <Link href="/" className="flex items-center mb-4 w-fit" aria-label="MixStay - Trang chủ">
                <Logo variant="light" className="h-11 w-auto" />
              </Link>
              <p className="text-sm leading-relaxed">
                Nền tảng kết nối Chủ nhà, Môi giới và Khách thuê chung cư mini.
                Minh bạch — Nhanh chóng — Miễn phí cho khách.
              </p>
            </div>

            {/* Dành cho */}
            <div>
              <h4 className="font-display font-semibold text-white mb-4">Dành cho</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/register" className="hover:text-white transition-colors">Khách thuê phòng</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Môi giới bất động sản</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Chủ nhà cho thuê</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Công ty quản lý</Link></li>
              </ul>
            </div>

            {/* Liên hệ */}
            <div>
              <h4 className="font-display font-semibold text-white mb-4">Liên hệ</h4>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  contact@mixstay.vn
                </li>
                <li>
                  <a href="tel:0379838222" aria-label="Gọi hotline 0379 838 222" className="flex items-center gap-2 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span className="font-medium text-white">Hotline: 0379 838 222</span>
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Tầng 5, Tòa nhà Sáng Tạo, Cầu Giấy, Hà Nội
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 text-center text-sm">
            <p>&copy; 2026 MixStay. All Copyright Reserved.</p>
          </div>
        </div>
      </footer>

      {/* Hotline công ty — FAB gọi nhanh (kênh hỗ trợ chung, KHÔNG qua logic Zalo/share link) */}
      <CallFab stacked={false} />
    </div>
  );
}
