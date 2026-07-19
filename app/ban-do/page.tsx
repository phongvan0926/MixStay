import type { Metadata } from 'next';
import PublicNav from '@/components/layout/PublicNav';
import MapWrapper from './MapWrapper';

export const metadata: Metadata = {
  title: 'Bản đồ phòng trống',
  description: 'Tìm phòng chung cư mini theo bản đồ khu vực Hà Nội — xem vị trí các tòa nhà đang còn phòng, bấm chọn tòa hợp khu vực bạn muốn.',
};

// Trang bản đồ tìm phòng — CÔNG KHAI. Map render client-only (Leaflet cần window).
export default function BanDoPage() {
  return (
    <div className="flex flex-col bg-stone-50" style={{ height: '100dvh' }}>
      <PublicNav />
      <div className="flex-1 min-h-0 pt-16">
        <MapWrapper />
      </div>
    </div>
  );
}
