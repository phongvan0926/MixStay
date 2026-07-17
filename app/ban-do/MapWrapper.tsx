'use client';
import dynamic from 'next/dynamic';

// Leaflet đụng window ngay khi import → bắt buộc tắt SSR ở một client component trung gian
// (dynamic ssr:false không dùng được trực tiếp trong server component).
const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <p className="text-sm text-stone-500">Đang tải bản đồ…</p>
    </div>
  ),
});

export default function MapWrapper() {
  return <MapClient />;
}
