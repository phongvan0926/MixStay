'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ListingImageMosaic from '@/components/ui/ListingImageMosaic';

// Nhãn loại phòng (đồng bộ với PublicSearch / form phòng).
const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn',
  gac_xep: 'Gác xép',
  '1k1n': '1 ngủ 1 khách',
  '2k1n': '2 ngủ 1 khách',
  studio: 'Studio',
  duplex: 'Duplex',
};

/**
 * Khối tin ở trang chủ. Ba TAB thay vì chỉ "mới đăng": kho có 636 tin còn trống mà trang chủ
 * trước đây chỉ khoe 6 tin mới nhất — khách quay lại lần hai vẫn thấy đúng ngần ấy phòng.
 * Tab "giá tốt" và "nhiều người xem" lấy từ cùng một API bằng ?sort=, mỗi tab một góc nhìn.
 */
const TABS = [
  // Nhãn ngắn để 3 tab nằm gọn MỘT hàng trên điện thoại 390px (đo 15/08: nhãn dài bị
  // xuống dòng, tab thứ 3 đứng lẻ loi một mình trông như nút khác loại).
  { key: '', label: '🆕 Mới đăng', sort: '' },
  // "Giá tốt" dùng sort=deal chứ KHÔNG phải price_asc: xếp theo giá tuyệt đối thì 8/12 tin đầu
  // là Hoài Đức 1,5–2,5tr (ngoại thành, 5 tin cùng một tòa) — khách tìm phòng nội thành lướt
  // qua thấy toàn chỗ mình không ở. sort=deal xếp theo mức RẺ HƠN MẶT BẰNG CHÍNH QUẬN đó,
  // ưu tiên nội thành, mỗi quận/mỗi tòa 1 tin và đổi lứa mỗi giờ. Xem app/api/rooms/public.
  { key: 'deal', label: '💰 Giá tốt', sort: 'deal' },
  { key: 'views_desc', label: '🔥 Xem nhiều', sort: 'views_desc' },
] as const;

type PublicRoom = {
  id: string;
  name: string;
  typeName: string;
  areaSqm: number;
  priceMonthly: number;
  amenities?: string[];
  images?: string[];
  videoLinks?: string[];
  videos?: string[];
  status?: string;
  availableUnits?: number;
  viewCount?: number;
  /** Chỉ có ở tab "Giá tốt": rẻ hơn bao nhiêu % so với giá phổ biến của quận đó */
  dealPercent?: number;
  shortTermAllowed?: boolean;
  property?: {
    district?: string; streetName?: string; city?: string;
    parkingCar?: boolean; parkingBike?: boolean; evCharging?: boolean;
    petAllowed?: boolean; foreignerOk?: boolean;
  };
};

function formatPrice(price: number) {
  return (price / 1000000).toFixed(1).replace('.0', '') + ' tr';
}

export default function FeaturedRooms() {
  const [tab, setTab] = useState<string>('');
  // Cache theo tab: đổi qua lại không phải tải lại, và không chớp skeleton mỗi lần bấm.
  const [byTab, setByTab] = useState<Record<string, PublicRoom[]>>({});
  const rooms = byTab[tab] ?? null;

  useEffect(() => {
    if (byTab[tab]) return;
    let alive = true;
    const t = TABS.find(x => x.key === tab);
    fetch(`/api/rooms/public?limit=6${t?.sort ? `&sort=${t.sort}` : ''}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('fetch failed'))))
      .then(json => { if (alive) setByTab(prev => ({ ...prev, [tab]: json.data || [] })); })
      .catch(() => { if (alive) setByTab(prev => ({ ...prev, [tab]: [] })); });
    return () => { alive = false; };
  }, [tab, byTab]);

  const tabBar = (
    <div className="mb-6">
      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`inline-flex items-center min-h-11 sm:min-h-10 px-4 rounded-xl text-sm font-medium border transition-colors ${
              tab === t.key
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-stone-600 border-stone-200 hover:border-brand-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Nói rõ "giá tốt" nghĩa là gì — không thì khách thấy phòng 4tr đứng trong tab
          "Giá tốt" sẽ tưởng web xếp bừa, trong khi 4tr ở Đống Đa đúng là rẻ. */}
      {tab === 'deal' && (
        <p className="mt-3 text-center text-xs sm:text-sm text-stone-500">
          Phòng <strong className="text-stone-700">rẻ hơn mặt bằng chính quận đó</strong> — ưu tiên nội thành, mỗi quận một phòng, đổi lứa mỗi giờ.
        </p>
      )}
    </div>
  );

  // Loading skeleton
  if (rooms === null) {
    return (
      <>
        {tabBar}
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
      </>
    );
  }

  // Chưa có tin đăng nào (DB rỗng) → không hiện demo, hiện thông báo trung thực.
  // Tab "Giá tốt" có bộ lọc riêng (rẻ hơn mặt bằng quận) nên rỗng ở đây KHÔNG có nghĩa là
  // kho rỗng — nói nhầm thành "chưa có tin nào được duyệt" là đuổi khách đi oan.
  if (rooms.length === 0) {
    return (
      <>
        {tabBar}
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">🏠</span>
          {tab === 'deal' ? (
            <>
              <p className="text-stone-500">Hôm nay chưa có phòng nào rẻ hơn hẳn mặt bằng khu vực.</p>
              <Link href="/phong" className="inline-block mt-4 text-brand-600 font-medium hover:underline">
                Xem tất cả phòng đang trống →
              </Link>
            </>
          ) : (
            <>
              <p className="text-stone-500">Chưa có tin đăng nào được duyệt. Hãy quay lại sau nhé!</p>
              <Link href="/register" className="inline-block mt-4 text-brand-600 font-medium hover:underline">
                Bạn là chủ nhà? Đăng phòng ngay →
              </Link>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {tabBar}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {rooms.map(room => {
          const p = room.property;
          // Tiện ích ĐẶC BIỆT của tòa (chỗ để ô tô, sạc xe điện, thú cưng…) — đây là thứ
          // khách lọc nhiều nhất ở /phong nhưng trang chủ trước đây không hề hiện.
          const flags = p?.parkingCar || p?.parkingBike || p?.evCharging || p?.petAllowed
            || p?.foreignerOk || room.shortTermAllowed;
          return (
            <Link key={room.id} href={`/tin/${room.id}`}
              className="group rounded-2xl border border-stone-200/60 bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-stone-300/60">
              {/* Ảnh: 1 to + 2 nhỏ, bấm ảnh mở lightbox */}
              <div className="relative">
                <ListingImageMosaic images={room.images} videos={room.videos} videoLinks={room.videoLinks} alt={room.name} className="h-48" />
                <span className="absolute top-3 left-3 z-10 inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-stone-700 border border-white">
                  {TYPE_LABEL[room.typeName] || room.typeName}
                </span>
                {room.status === 'UPCOMING' ? (
                  <span className="absolute top-3 right-3 z-10 inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
                    🟡 Sắp trống
                  </span>
                ) : tab === 'views_desc' && (room.viewCount || 0) > 0 ? (
                  // Ở tab "nhiều người xem", con số chính là lý do tin đứng đây → nói ra
                  <span className="absolute top-3 right-3 z-10 inline-flex items-center rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white shadow">
                    👁 {room.viewCount} lượt xem
                  </span>
                ) : tab === 'deal' && (room.dealPercent || 0) > 0 ? (
                  // Cũng vậy ở tab "Giá tốt": nói thẳng rẻ hơn bao nhiêu, so với đâu
                  <span
                    title={`Rẻ hơn khoảng ${room.dealPercent}% so với giá phổ biến của phòng ở ${room.property?.district || 'quận này'}`}
                    className="absolute top-3 right-3 z-10 inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow">
                    💰 Rẻ hơn {room.dealPercent}%
                  </span>
                ) : null}
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

                {/* Tiện ích đặc biệt của tòa — cùng bộ nhãn với thẻ tin ở /phong */}
                {flags && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {p?.parkingCar && <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🚗 Ô tô đỗ cửa</span>}
                    {p?.parkingBike && <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🏍️ Để xe máy</span>}
                    {p?.evCharging && <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">⚡ Sạc xe điện</span>}
                    {p?.petAllowed && <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🐾 Thú cưng OK</span>}
                    {p?.foreignerOk && <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🌍 Người nước ngoài</span>}
                    {room.shortTermAllowed && <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">📅 Ngắn hạn</span>}
                  </div>
                )}

                {room.amenities && room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 3).map(a => (
                      <span key={a} className="px-2 py-0.5 text-xs rounded-md border bg-stone-50 border-stone-200 text-stone-600">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
