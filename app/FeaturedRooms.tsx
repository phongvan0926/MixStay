'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';

// Nhãn loại phòng (đồng bộ với PublicSearch / form phòng).
const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn',
  gac_xep: 'Gác xép',
  '1k1n': '1 khách 1 ngủ',
  '2k1n': '2 khách 1 ngủ',
  studio: 'Studio',
  duplex: 'Duplex',
};

type PublicRoom = {
  id: string;
  name: string;
  typeName: string;
  areaSqm: number;
  priceMonthly: number;
  amenities?: string[];
  images?: string[];
  status?: string;
  availableUnits?: number;
  property?: { district?: string; streetName?: string; city?: string };
};

function formatPrice(price: number) {
  return (price / 1000000).toFixed(1).replace('.0', '') + ' tr';
}

export default function FeaturedRooms() {
  const [rooms, setRooms] = useState<PublicRoom[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/rooms/public?limit=6')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('fetch failed'))))
      .then(json => { if (alive) setRooms(json.data || []); })
      .catch(() => { if (alive) setRooms([]); });
    return () => { alive = false; };
  }, []);

  // Loading skeleton
  if (rooms === null) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200/60 bg-white overflow-hidden">
            <div className="h-48 bg-stone-100 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-24 bg-stone-100 rounded animate-pulse" />
              <div className="h-4 w-40 bg-stone-100 rounded animate-pulse" />
              <div className="h-4 w-32 bg-stone-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Chưa có tin đăng nào (DB rỗng) → không hiện demo, hiện thông báo trung thực
  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl block mb-3">🏠</span>
        <p className="text-stone-500">Chưa có tin đăng nào được duyệt. Hãy quay lại sau nhé!</p>
        <Link href="/register" className="inline-block mt-4 text-brand-600 font-medium hover:underline">
          Bạn là chủ nhà? Đăng phòng ngay →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {rooms.map(room => (
        <Link key={room.id} href={`/tin/${room.id}`}
          className="group rounded-2xl border border-stone-200/60 bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-stone-300/60">
          {/* Ảnh bìa */}
          <div className="relative h-48 bg-stone-100">
            {room.images && room.images[0] ? (
              <OptimizedImage src={room.images[0]} alt={room.name} fill
                className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-12 h-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
            <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-stone-700 border border-white">
              {TYPE_LABEL[room.typeName] || room.typeName}
            </span>
            {room.status === 'UPCOMING' && (
              <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
                🟡 Sắp trống
              </span>
            )}
          </div>

          {/* Thông tin */}
          <div className="p-4">
            <div className="mb-2">
              <span className="font-display text-xl font-bold text-stone-900">{formatPrice(room.priceMonthly)}</span>
              <span className="text-sm text-stone-500">/tháng</span>
              <span className="text-xs ml-2 text-stone-400">{room.areaSqm}m²</span>
            </div>
            <h3 className="font-display font-semibold text-base mb-1 text-stone-900 group-hover:text-brand-600 transition-colors line-clamp-1">{room.name}</h3>
            <p className="text-sm mb-3 flex items-center gap-1 text-stone-500">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {room.property?.district || '—'}{room.property?.city ? `, ${room.property.city}` : ''}
            </p>
            {room.amenities && room.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {room.amenities.slice(0, 3).map(a => (
                  <span key={a} className="px-2 py-0.5 text-xs rounded-md border bg-stone-50 border-stone-200 text-stone-600">{a}</span>
                ))}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
