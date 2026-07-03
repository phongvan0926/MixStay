'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import ListingImageMosaic from '@/components/ui/ListingImageMosaic';
import ZaloFab from '@/components/ui/ZaloFab';
import CallFab from '@/components/ui/CallFab';

const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1 ngủ 1 khách',
  '2k1n': '2 ngủ 1 khách', studio: 'Studio', duplex: 'Duplex',
};

function formatPrice(price: number) {
  return (price / 1000000).toFixed(1).replace('.0', '') + ' tr';
}

type Room = {
  id: string; name: string; typeName: string; areaSqm: number; priceMonthly: number;
  amenities?: string[]; images?: string[]; status?: string;
  property?: { name?: string; district?: string; streetName?: string; city?: string };
};
type Company = { id: string; name: string; logo?: string | null; zaloGroupLink?: string | null; phone?: string | null };

export default function CompanyCatalogClient({ id }: { id: string }) {
  const [data, setData] = useState<{ company: Company; rooms: Room[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/companies/${id}/inventory`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('not found'))))
      .then(d => { if (alive) setData(d); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 text-center">
        <div>
          <span className="text-5xl block mb-3">🏢</span>
          <p className="text-stone-600">Kho phòng không tồn tại hoặc đã ngừng hoạt động.</p>
          <Link href="/" className="inline-block mt-4 text-brand-600 font-medium hover:underline">Về MixStay →</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="h-8 w-56 bg-stone-200 rounded animate-pulse mb-6" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                <div className="h-44 bg-stone-100 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-5 w-24 bg-stone-100 rounded animate-pulse" />
                  <div className="h-4 w-40 bg-stone-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { company, rooms } = data;
  const companyDigits = (company.phone || '').replace(/\D/g, '');
  const zalo = company.zaloGroupLink
    || (companyDigits ? `https://zalo.me/${companyDigits}` : null);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <nav className="sticky top-0 z-40 bg-brand-800/95 backdrop-blur-xl border-b border-brand-700/50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Trang link chia sẻ: KHÔNG dẫn về trang chủ — giữ khách trong kho phòng công ty. */}
          <span aria-label="MixStay"><Logo variant="light" className="h-7 w-auto" /></span>
          {zalo && (
            <a href={zalo} target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold bg-white text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
              💬 Liên hệ Zalo
            </a>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Company header */}
        <div className="flex items-center gap-4 mb-8">
          {company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo} alt={company.name} className="w-14 h-14 rounded-2xl object-cover border border-stone-200" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-2xl">🏢</div>
          )}
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">Kho phòng {company.name}</h1>
            <p className="text-stone-500 text-sm mt-0.5">{rooms.length} phòng đang cho thuê</p>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <span className="text-4xl block mb-3">🏠</span>
            <p>Hiện chưa có phòng trống. Vui lòng quay lại sau!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map(room => (
              <Link key={room.id} href={`/tin/${room.id}`}
                className="group rounded-2xl border border-stone-200/60 bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-stone-300/60">
                <div className="relative">
                  <ListingImageMosaic images={room.images} alt={room.name} className="h-44" />
                  <span className="absolute top-3 left-3 z-10 inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-stone-700 border border-white">
                    {TYPE_LABEL[room.typeName] || room.typeName}
                  </span>
                  {room.status === 'UPCOMING' && (
                    <span className="absolute top-3 right-3 z-10 inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow">🟡 Sắp trống</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-2">
                    <span className="font-display text-xl font-bold text-stone-900">{formatPrice(room.priceMonthly)}</span>
                    <span className="text-sm text-stone-500">/tháng</span>
                    <span className="text-xs ml-2 text-stone-400">{room.areaSqm}m²</span>
                  </div>
                  <h3 className="font-display font-semibold text-base mb-1 text-stone-900 group-hover:text-brand-600 transition-colors line-clamp-1">{room.name}</h3>
                  <p className="text-sm flex items-center gap-1 text-stone-500">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {room.property?.district || '—'}{room.property?.streetName ? ` • ${room.property.streetName}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-stone-400 mt-10">Powered by MixStay</p>
      </div>

      {/* Nút liên hệ nổi — gọi/Zalo trực tiếp công ty, khách xem phòng nào ổn gọi luôn */}
      {zalo && <ZaloFab href={zalo} />}
      {companyDigits ? (
        <CallFab phone={companyDigits} display={company.phone || companyDigits} label="Gọi ngay" showNumber={false} stacked={!!zalo} />
      ) : (
        <CallFab label="Gọi ngay" showNumber={false} stacked={!!zalo} />
      )}
    </div>
  );
}
