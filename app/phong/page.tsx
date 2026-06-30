import type { Metadata } from 'next';
import PublicNav from '@/components/layout/PublicNav';
import PublicSearch from '../PublicSearch';
import CallFab from '@/components/ui/CallFab';

export const metadata: Metadata = {
  title: 'Tất cả phòng mới nhất',
  description: 'Xem toàn bộ phòng chung cư mini đang cho thuê, mới nhất trước. Không cần đăng nhập.',
};

// Trang xem TOÀN BỘ phòng mới nhất — CÔNG KHAI (không cần đăng nhập). Dùng PublicSearch
// với autoLoad: tự nạp phòng mới nhất ngay khi mở + bộ lọc + nút "Xem thêm" để duyệt hết.
export default function PhongPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <PublicNav />
      <PublicSearch autoLoad />
      <CallFab stacked={false} />
    </div>
  );
}
