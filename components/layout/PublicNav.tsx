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
      {/* px-3 dưới 360px: máy 320px (iPhone SE đời đầu) chỉ còn hở 2px giữa nút bản đồ và
          "Đăng nhập" — lấy lại 8px lề cho khỏi dính nhau */}
      <div className="max-w-6xl mx-auto px-3 min-[360px]:px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-3">
          {/* shrink-0: khi đăng nhập, thanh nav có tới 5 mục — flex sẽ BÓP logo cho vừa
              (đo 07/08/2026: tỷ lệ 2.24 trong khi gốc là 3.01 → nén ngang 26%, chữ MixStay méo).
              Logo phải giữ nguyên khổ, mục khác thiếu chỗ thì thu gọn chữ chứ không ép logo. */}
          <Link href="/" className="flex items-center shrink-0" aria-label="MixStay - Trang chủ">
            {/* LOGO NGUYÊN BẢN ở mọi bề rộng — không cắt, không xếp dọc, không bóp ngang.
                Bản xếp dọc trước đây (biểu tượng trên, chữ dưới, cắt bằng object-cover) sinh ra
                chỉ để nhường chỗ cho nút bản đồ hồi nút còn kèm icon 🗺️. Bỏ icon xong nút hẹp
                lại nên chỗ đủ cho logo ngang → trả logo về đúng khổ gốc.
                shrink-0 + object-contain là BẮT BUỘC: thiếu shrink-0 thì hàng chật là flex bóp
                ngang ảnh (đo 07/08/2026: tỷ lệ 2.24 so với gốc 3.01 → nén 26%, chữ MixStay méo)
                mà không có cảnh báo nào. */}
            <Logo variant="light" className="h-6 min-[360px]:h-7 min-[400px]:h-8 sm:h-9 w-auto shrink-0 object-contain" />
          </Link>
          {/* Cùng KIỂU với nút "Tìm theo bản đồ" ở ô tìm kiếm bên dưới (gradient tím → xanh, bo xl,
              đổ bóng, nhấc nhẹ khi rê chuột) để khách nhận ra ngay là cùng một lối vào — chỉ khác
              chữ màu VÀNG cho ăn với logo.
              Vì sao gradient đậm hơn bản dưới (violet-800/brand-700 thay vì -600): nút dưới nằm
              trên thẻ TRẮNG, nút này nằm trên nav XANH ĐẬM. Giữ nguyên sắc -600 thì chữ gold-300
              chỉ đạt tương phản 3.3:1 (chuẩn WCAG AA cần 4.5:1 cho chữ 14px) và đầu xanh của
              gradient chìm vào nền nav. Đậm 2 nấc → 5.3:1 ở cả hai đầu gradient.
              Bỏ icon 🗺️ theo yêu cầu: chữ đã nói rõ, icon chỉ làm nút dài thêm.
              CHỮ ĐẦY ĐỦ Ở MỌI BỀ RỘNG: bỏ icon xong nút hẹp đi nên điện thoại đủ chỗ cho cả
              câu — "Bản đồ" trơ trọi không nói được đây là tìm phòng trên bản đồ. */}
          <Link href="/ban-do" aria-label="Tìm phòng trên bản đồ"
            className="inline-flex items-center justify-center shrink-0 text-xs min-[360px]:text-sm px-2.5 min-[360px]:px-3 sm:px-6 py-2 min-h-11 sm:min-h-0 rounded-xl font-semibold text-gold-300 bg-gradient-to-r from-violet-800 to-brand-700 ring-1 ring-white/20 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap">
            Tìm theo bản đồ
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
            {/* Ảnh đại diện + tên + Đăng xuất CHỈ hiện từ tablet trở lên. Trên điện thoại,
                logo nguyên khổ + nút bản đồ đủ chữ đã chiếm 226px; cộng thêm nhóm này (166px)
                thì nút "Quản lý" ĐÈ LÊN nút bản đồ (đo 18/08/2026 ở 390px: che mất 34px, chữ
                còn "Tìm theo bả…"). Giữ lại "Quản lý" vì đó là việc người đăng nhập cần làm;
                đăng xuất vẫn có ở topbar trong trang quản lý, cách đúng một chạm nữa. */}
            <div className="hidden md:flex items-center gap-2 text-white">
              {user.image ? (
                <div className="shrink-0"><Avatar src={user.image} name={user.name} size={32} /></div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center font-semibold text-sm shrink-0">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              {/* TÊN chỉ hiện từ 1024px. Máy tính bảng 640–768px không đủ chỗ: nhóm phải đầy
                  đủ rộng 451px + nhóm trái 282px = 733px, trong khi 768px chỉ dùng được 720px
                  → nút "Vào trang quản lý" đè lên nút bản đồ 13px (lỗi CÓ SẴN từ trước, không
                  phải do bỏ icon bản đồ — bản cũ ở 640px cũng thừa ~130px). */}
              <span className="hidden lg:inline text-sm font-medium max-w-[140px] truncate">{user.name}</span>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/' })} aria-label="Đăng xuất"
              className="hidden md:inline-flex items-center justify-center shrink-0 text-sm px-3 py-2 rounded-xl font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/login" className="inline-flex items-center justify-center shrink-0 text-sm px-2.5 sm:px-4 py-2 min-h-11 sm:min-h-0 rounded-xl font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">Đăng nhập</Link>
            {/* "Đăng ký miễn phí" CHỈ hiện từ tablet trở lên. Trên điện thoại, logo nguyên khổ
                (84px) + nút bản đồ đủ chữ (138px) + Đăng nhập (93px) + Đăng ký (77px) = 402px,
                trong khi máy 390px chỉ có 358px dùng được — thiếu 44px, và máy 320px thiếu 114px
                (đo 18/08/2026). Bỏ mục này là chọn của chủ dự án: người đã có tài khoản cần lối
                đăng nhập hằng ngày, còn đăng ký thì chân trang đã có sẵn 4 link theo từng vai trò. */}
            <Link href="/register" className="hidden sm:inline-flex items-center justify-center shrink-0 text-sm px-2.5 sm:px-5 py-2 min-h-11 sm:min-h-0 rounded-xl font-semibold bg-white text-brand-700 hover:bg-brand-50 transition-colors whitespace-nowrap">
              Đăng ký miễn phí
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
