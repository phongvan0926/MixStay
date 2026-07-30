import type { Metadata } from 'next';
import PublicNav from '@/components/layout/PublicNav';
import PublicSearch from '../PublicSearch';
import CallFab from '@/components/ui/CallFab';
import SeoLinks from '@/components/public/SeoLinks';
import { SITE_URL } from '@/lib/seo-locations';

export const metadata: Metadata = {
  title: 'Tất cả phòng mới nhất',
  description: 'Xem toàn bộ phòng chung cư mini đang cho thuê, mới nhất trước. Không cần đăng nhập.',
  alternates: { canonical: `${SITE_URL}/phong` },
};

// Trang xem TOÀN BỘ phòng mới nhất — CÔNG KHAI (không cần đăng nhập). Dùng PublicSearch
// với autoLoad: tự nạp phòng mới nhất ngay khi mở + bộ lọc + nút "Xem thêm" để duyệt hết.
export default function PhongPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <PublicNav />
      <PublicSearch autoLoad />

      {/* Kết quả ở trên do JS nạp — khối link này nằm sẵn trong HTML để khách (và Google)
          luôn có đường sang trang đích từng quận/từng trường. */}
      <footer className="bg-brand-900 text-stone-300 px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <SeoLinks dark />
          <p className="border-t border-white/10 mt-8 pt-6 text-center text-sm">&copy; 2026 MixStay. All Copyright Reserved.</p>
        </div>
      </footer>

      <CallFab stacked={false} />
    </div>
  );
}
