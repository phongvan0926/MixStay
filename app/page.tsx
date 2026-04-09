import Link from 'next/link';
import { CountUpStats } from './CountUpStats';

const featuredRooms = [
  { name: 'Chung cư mini Cầu Giấy Premium', district: 'Cầu Giấy', price: 3500000, area: 25, type: 'Gác xép', amenities: ['Điều hoà', 'WC riêng', 'Ban công'], badge: 'Hot' },
  { name: 'Nhà trọ Đống Đa Green', district: 'Đống Đa', price: 2500000, area: 22, type: 'Phòng đơn', amenities: ['Nóng lạnh', 'Wifi', 'Gửi xe'], badge: 'Mới' },
  { name: 'Mini Apartment Thanh Xuân', district: 'Thanh Xuân', price: 4500000, area: 32, type: 'Studio', amenities: ['Full nội thất', 'Máy giặt', 'Bếp riêng'], badge: 'Hot' },
  { name: 'HomeStay Ba Đình Central', district: 'Ba Đình', price: 6000000, area: 40, type: 'Duplex', amenities: ['Smart lock', 'Rooftop', 'Thang máy'], badge: 'Mới' },
  { name: 'Phòng trọ Hai Bà Trưng', district: 'Hai Bà Trưng', price: 3200000, area: 28, type: '1 khách 1 ngủ', amenities: ['Điều hoà', 'Giường tủ', 'WC riêng'], badge: 'Mới' },
  { name: 'Căn hộ Nam Từ Liêm City', district: 'Nam Từ Liêm', price: 5000000, area: 35, type: 'Studio', amenities: ['Full nội thất', 'Ban công', 'Camera'], badge: 'Hot' },
];

const testimonials = [
  { name: 'Nguyễn Minh Tuấn', role: 'Môi giới', initial: 'T', color: 'bg-brand-100 text-brand-700', content: 'Từ khi dùng MiniZen, mình tiết kiệm cả tiếng mỗi ngày. Kho phòng cập nhật real-time, tạo link gửi khách chỉ 1 click. Thu nhập tăng gấp đôi!' },
  { name: 'Lê Thị Hoa', role: 'Chủ nhà', initial: 'H', color: 'bg-emerald-100 text-emerald-700', content: 'Đăng phòng lên MiniZen, 3 ngày sau đã có người thuê. Không phải chạy quảng cáo, không mất phí đăng tin. Quản lý phòng rất tiện!' },
  { name: 'Phạm Văn Đức', role: 'Khách thuê', initial: 'Đ', color: 'bg-amber-100 text-amber-700', content: 'Tìm phòng trên MiniZen nhanh hơn nhiều so với đi hỏi từng nơi. Thông tin rõ ràng, giá minh bạch, không bị hét giá.' },
];

function formatPrice(price: number) {
  return (price / 1000000).toFixed(1).replace('.0', '') + ' tr';
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/20">
              <span className="text-white font-bold text-base">M</span>
            </div>
            <span className="font-display font-bold text-xl text-stone-900">MiniZen</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="btn-ghost text-sm">Đăng nhập</Link>
            <Link href="/register" className="btn-primary text-sm">Đăng ký miễn phí</Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-blue-50" />
          <div className="absolute top-10 left-[5%] w-[500px] h-[500px] bg-brand-200/25 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-[5%] w-[600px] h-[600px] bg-blue-200/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-100/10 rounded-full blur-[100px]" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-brand-100 px-4 py-1.5 text-sm text-brand-700 font-medium mb-6 animate-fade-in shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
            </span>
            Nền tảng tìm phòng chung cư mini #1 Việt Nam
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-stone-900 mb-6 leading-[1.1] animate-slide-up">
            Tìm phòng chung cư mini
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-blue-500">chưa bao giờ dễ đến thế</span>
          </h1>

          <p className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ color: '#64748B' }}>
            Nền tảng kết nối trực tiếp Chủ nhà — Môi giới — Khách thuê.
            <br className="hidden sm:block" />
            Minh bạch, nhanh chóng, <strong className="text-slate-800">0 chi phí</strong> cho khách.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12 animate-slide-up">
            <div className="flex flex-col sm:flex-row bg-white rounded-2xl p-2 sm:p-2.5 gap-2" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)' }}>
              <Link href="/login" className="flex-1 flex items-center gap-2 px-3 sm:px-4 cursor-text">
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <span className="py-2.5 sm:py-3 text-sm sm:text-base text-slate-400">Nhập quận, khu vực hoặc tên tòa nhà...</span>
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl px-6 sm:px-8 py-3 text-sm sm:text-base font-medium text-white transition-all hover:opacity-90 active:scale-[0.98] flex-shrink-0" style={{ backgroundColor: '#0056D2' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Tìm phòng ngay
              </Link>
            </div>
            <div className="flex items-center justify-center gap-3 mt-3 text-xs sm:text-sm" style={{ color: '#94A3B8' }}>
              <span>Phổ biến:</span>
              <Link href="/login" className="px-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-white transition-all" style={{ color: '#64748B' }}>Cầu Giấy</Link>
              <Link href="/login" className="px-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-white transition-all" style={{ color: '#64748B' }}>Đống Đa</Link>
              <Link href="/login" className="px-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-white transition-all hidden sm:inline-block" style={{ color: '#64748B' }}>Thanh Xuân</Link>
              <Link href="/login" className="px-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-white transition-all hidden sm:inline-block" style={{ color: '#64748B' }}>Ba Đình</Link>
            </div>
          </div>

          {/* Social proof */}
          <div className="inline-flex items-center gap-4 sm:gap-10 text-xs sm:text-sm text-stone-400 animate-fade-in bg-white/60 backdrop-blur rounded-2xl px-4 sm:px-6 py-3 border border-stone-200/50 shadow-sm">
            <div className="flex items-center gap-1">
              <span className="font-display font-bold text-stone-700 text-sm sm:text-base">5000+</span> phòng
            </div>
            <div className="w-1 h-1 rounded-full bg-stone-300" />
            <div className="flex items-center gap-1">
              <span className="font-display font-bold text-stone-700 text-sm sm:text-base">200+</span> môi giới
            </div>
            <div className="w-1 h-1 rounded-full bg-stone-300" />
            <div className="flex items-center gap-1">
              <span className="font-display font-bold text-stone-700 text-sm sm:text-base">200+</span> tòa nhà
            </div>
          </div>
        </div>
      </section>

      {/* ===== PHÒNG NỔI BẬT ===== */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10 bg-white" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-100/30 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-100/20 rounded-full blur-[100px]" />

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-3 py-1 text-xs font-medium text-orange-700 mb-4">
              🔥 Đang hot
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">Phòng mới đăng</h2>
            <p className="text-stone-500">Được cập nhật mỗi ngày từ các chủ nhà uy tín</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredRooms.map((room, i) => (
              <Link key={i} href="/login" className="group rounded-2xl border border-slate-200/60 bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300/60">
                {/* Image area — 55% of card */}
                <div className="relative h-48 flex items-center justify-center" style={{ backgroundColor: '#F1F5F9' }}>
                  <svg className="w-12 h-12 opacity-60 group-hover:scale-110 transition-transform duration-300" style={{ color: '#94A3B8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {/* Badge pill */}
                  <span className={`absolute top-3 left-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white ${room.badge === 'Hot' ? 'bg-[#EF4444]' : 'bg-[#10B981]'}`}>
                    {room.badge}
                  </span>
                </div>

                {/* Info area — 45% of card */}
                <div className="p-4">
                  {/* Line 1: Price — biggest, boldest */}
                  <div className="mb-2">
                    <span className="font-display text-xl font-bold" style={{ color: '#0F172A' }}>{formatPrice(room.price)}</span>
                    <span className="text-sm" style={{ color: '#64748B' }}>/tháng</span>
                    <span className="text-xs ml-2" style={{ color: '#94A3B8' }}>{room.area}m² · {room.type}</span>
                  </div>

                  {/* Line 2: Title & address */}
                  <h3 className="font-display font-semibold text-base mb-1 group-hover:text-brand-600 transition-colors line-clamp-1" style={{ color: '#0F172A' }}>{room.name}</h3>
                  <p className="text-sm mb-3 flex items-center gap-1" style={{ color: '#64748B' }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {room.district}, Hà Nội
                  </p>

                  {/* Line 3: Amenity tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.map(a => (
                      <span key={a} className="px-2 py-0.5 text-xs rounded-md border" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', color: '#475569' }}>{a}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/register" className="btn-secondary px-8 py-3 text-base group hover:-translate-y-0.5 transition-all">
              Xem thêm 5000+ phòng
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== DÀNH CHO AI? ===== */}
      <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3" style={{ color: '#0F172A' }}>Dành cho ai?</h2>
            <p style={{ color: '#64748B' }}>Mỗi vai trò có trải nghiệm riêng biệt</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: '👤', title: 'Khách thuê',
                items: ['Tìm phòng nhanh theo khu vực & giá', 'Xem chi tiết tiện ích, diện tích', 'Hẹn xem phòng miễn phí qua môi giới'],
                cta: 'Tìm phòng ngay',
              },
              {
                icon: '🤝', title: 'Môi giới',
                items: ['Kho hàng 5000+ phòng cập nhật', 'Tạo link chia sẻ chỉ 1 click', 'Hoa hồng hấp dẫn, minh bạch'],
                cta: 'Đăng ký môi giới',
              },
              {
                icon: '🏠', title: 'Chủ nhà',
                items: ['Đăng phòng hoàn toàn miễn phí', 'Tiếp cận 200+ môi giới uy tín', 'Quản lý phòng dễ dàng'],
                cta: 'Đăng phòng ngay',
              },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-200/60 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300/60" style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <span className="text-4xl block mb-4">{card.icon}</span>
                <h3 className="font-display font-semibold text-lg mb-1" style={{ color: '#0F172A' }}>Bạn là {card.title}?</h3>
                <ul className="text-sm space-y-2 mt-3 mb-5" style={{ color: '#475569' }}>
                  {card.items.map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="btn-primary w-full text-sm py-2.5">{card.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CÁCH HOẠT ĐỘNG ===== */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[100px]" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="steps-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="white" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#steps-dots)" />
        </svg>

        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3 text-white">Cách hoạt động</h2>
            <p className="text-brand-200">3 bước đơn giản để kết nối</p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-white/20" />

            <div className="grid md:grid-cols-3 gap-8 md:gap-6">
              {[
                { step: '01', icon: '📝', title: 'Chủ nhà đăng phòng', desc: 'Upload thông tin, ảnh phòng. Admin duyệt nhanh trong 24h.' },
                { step: '02', icon: '🔗', title: 'Môi giới chia sẻ', desc: 'Tạo link thông minh gửi khách. Ẩn SĐT & địa chỉ tự động.' },
                { step: '03', icon: '🎉', title: 'Khách thuê phòng ưng ý', desc: 'Xem phòng, hẹn lịch qua môi giới. Chốt deal nhanh chóng.' },
              ].map((s) => (
                <div key={s.step} className="text-center relative">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg relative z-10">
                    {s.icon}
                  </div>
                  <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-brand-700 text-xs font-bold mb-3">{s.step}</div>
                  <h3 className="font-display font-semibold text-lg mb-2 text-white">{s.title}</h3>
                  <p className="text-sm text-brand-100 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CON SỐ ẤN TƯỢNG ===== */}
      <CountUpStats />

      {/* ===== TESTIMONIALS ===== */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-stone-50 to-white" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-50/40 rounded-full blur-[100px]" />

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">Người dùng nói gì?</h2>
            <p className="text-stone-500">Hàng trăm người đã tin tưởng sử dụng MiniZen</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-stone-200/60 bg-white/80 backdrop-blur p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-stone-300/60 duration-300">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>

                <p className="text-sm text-stone-600 leading-relaxed mb-5">&ldquo;{t.content}&rdquo;</p>

                <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${t.color}`}>
                    {t.initial}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-stone-900">{t.name}</p>
                    <p className="text-xs text-stone-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA CUỐI TRANG ===== */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white to-brand-50/50" />

        <div className="max-w-4xl mx-auto relative">
          <div className="relative rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-8 sm:p-14 text-center overflow-hidden shadow-2xl shadow-brand-900/20">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[60px]" />
            <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="cta-grid" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#cta-grid)" />
            </svg>

            <div className="relative z-10">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                Sẵn sàng tìm phòng hoàn hảo?
              </h2>
              <p className="text-brand-100 text-base sm:text-lg mb-8 max-w-lg mx-auto">
                Tham gia cùng hàng ngàn người dùng đang sử dụng MiniZen mỗi ngày.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
                <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-medium text-brand-700 transition-all hover:bg-brand-50 hover:-translate-y-0.5 active:scale-[0.98] shadow-lg">
                  Đăng ký miễn phí
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-base font-medium text-white transition-all hover:bg-white/20 hover:-translate-y-0.5 active:scale-[0.98] backdrop-blur-sm">
                  Tôi là chủ nhà
                </Link>
              </div>

              <p className="text-brand-200 text-sm">Hoàn toàn miễn phí. Không cần thẻ tín dụng.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative bg-stone-900 text-stone-400 pt-14 pb-8 px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-700 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-900/20 rounded-full blur-[120px]" />

        <div className="max-w-6xl mx-auto relative">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">
            {/* About */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="font-display font-bold text-lg text-white">MiniZen</span>
              </div>
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
                  contact@minizen.vn
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  0901 234 567
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Tầng 5, Tòa nhà Sáng Tạo, Cầu Giấy, Hà Nội
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-stone-800 pt-6 text-center text-sm">
            <p>&copy; 2026 MiniZen. All Copyright Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
