'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';
import VideoGallery from '@/components/ui/VideoGallery';
import ZaloFab from '@/components/ui/ZaloFab';
import CallFab from '@/components/ui/CallFab';
import Logo from '@/components/ui/Logo';
import { getZaloLink } from '@/lib/zalo';

const roomTypeLabels: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1 khách 1 ngủ',
  '2k1n': '2 khách 1 ngủ', studio: 'Studio', duplex: 'Duplex',
};

// ==================== Related Room Card ====================
function RelatedRoomCard({ rt }: { rt: any }) {
  const cover = rt.images?.[0] || rt.property?.images?.[0] || null;
  // Luôn dẫn tới trang chi tiết công khai theo id (khách xem không cần đăng nhập)
  const href = `/tin/${rt.id}`;

  const Wrapper: any = href ? Link : 'div';
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper {...wrapperProps} className="block bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-all">
      <div className="relative h-32 bg-stone-100">
        {cover ? (
          <OptimizedImage src={cover} alt={rt.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl opacity-40">🏠</div>
        )}
        <span className="absolute top-2 left-2 badge bg-white/90 text-stone-700 text-[10px] backdrop-blur-sm">
          {roomTypeLabels[rt.typeName] || rt.typeName}
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs text-stone-500 truncate">{rt.property?.name} • {rt.property?.district}</p>
        <p className="text-sm font-semibold text-stone-900 truncate mt-0.5">{rt.name}</p>
        <p className="text-base font-bold text-brand-600 mt-1">
          {formatCurrency(rt.priceMonthly)}
          <span className="text-[11px] font-normal text-stone-400">/th</span>
        </p>
        <p className="text-[11px] text-stone-400 mt-0.5">{rt.areaSqm}m² • {rt.availableUnits} trống</p>
      </div>
    </Wrapper>
  );
}

// ==================== Related Rooms Section ====================
function RelatedSection({ roomTypeId }: { roomTypeId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'sameBuilding' | 'samePrice' | 'sameDistrict'>('all');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rooms/related?roomTypeId=${roomTypeId}`)
      .then(res => res.ok ? res.json() : null)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [roomTypeId]);

  const bucket: any[] = data?.[tab] || [];
  const hasAny = (data?.all?.length || 0) + (data?.sameBuilding?.length || 0) + (data?.samePrice?.length || 0) + (data?.sameDistrict?.length || 0) > 0;

  if (loading) {
    return (
      <div className="card">
        <h2 className="font-display font-semibold text-lg mb-3">🔗 Tin đăng liên quan</h2>
        <p className="text-sm text-stone-400">Đang tải tin liên quan...</p>
      </div>
    );
  }

  if (!hasAny) return null;

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: data?.all?.length || 0 },
    { key: 'sameBuilding', label: 'Cùng tòa nhà', count: data?.sameBuilding?.length || 0 },
    { key: 'samePrice', label: 'Cùng mức giá', count: data?.samePrice?.length || 0 },
    { key: 'sameDistrict', label: 'Cùng khu vực', count: data?.sameDistrict?.length || 0 },
  ];

  return (
    <div className="card">
      <h2 className="font-display font-semibold text-lg mb-3">🔗 Tin đăng liên quan</h2>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} disabled={t.count === 0}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border disabled:opacity-40 disabled:cursor-not-allowed ${
              tab === t.key
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-stone-600 border-stone-200 hover:border-brand-300'
            }`}>
            {t.label} {t.count > 0 && <span className="opacity-75">({t.count})</span>}
          </button>
        ))}
      </div>

      {bucket.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-6">Không có tin nào ở mục này.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {bucket.map((rt: any) => <RelatedRoomCard key={rt.id} rt={rt} />)}
        </div>
      )}
    </div>
  );
}

// ==================== Main ====================
export default function ShareViewClient() {
  const params = useParams();
  const token = params.token as string | undefined;
  const id = params.id as string | undefined; // trang công khai /tin/[id] (không cần login/token)
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // /share/[token] + /p/[token] → theo share token (gắn môi giới). /tin/[id] → công khai theo id.
  const fetchUrl = token ? `/api/share-links?token=${token}` : `/api/rooms/public/${id}`;

  useEffect(() => {
    fetch(fetchUrl)
      .then(res => { if (!res.ok) throw new Error('not found'); return res.json(); })
      .then(setData)
      .catch(() => setError(token ? 'Link không tồn tại hoặc đã hết hạn' : 'Tin đăng không tồn tại'))
      .finally(() => setLoading(false));
  }, [fetchUrl, token]);

  const roomType = data?.roomType;
  const property = roomType?.property;

  const roomImages: string[] = useMemo(() => roomType?.images || [], [roomType]);
  const propImages: string[] = useMemo(() => property?.images || [], [property]);
  const allImages = useMemo(() => [...roomImages, ...propImages], [roomImages, propImages]);
  const videos: string[] = useMemo(() => roomType?.videos || [], [roomType]);
  const videoLinks: string[] = useMemo(() => roomType?.videoLinks || [], [roomType]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
        <p className="text-stone-400 text-sm">Đang tải thông tin phòng...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">😔</p>
        <h1 className="font-display text-2xl font-bold mb-2">Không tìm thấy</h1>
        <p className="text-stone-500 mb-6">{error || 'Link không hợp lệ'}</p>
        <Link href="/" className="btn-primary">Về trang chủ</Link>
      </div>
    </div>
  );

  if (!roomType) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">😔</p>
        <h1 className="font-display text-2xl font-bold mb-2">Không tìm thấy phòng</h1>
        <p className="text-stone-500 mb-6">Tin đăng đã bị xoá hoặc link không hợp lệ</p>
        <Link href="/" className="btn-primary">Về trang chủ</Link>
      </div>
    </div>
  );

  const mapsQuery = encodeURIComponent(
    [property?.streetName, property?.district, property?.city || 'Hà Nội'].filter(Boolean).join(', ')
  );
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;
  const mapsEmbedUrl = `https://maps.google.com/maps?q=${mapsQuery}&output=embed`;

  const hasPropertyFeatures = property?.parkingCar || property?.parkingBike || property?.evCharging || property?.petAllowed || property?.foreignerOk;
  const hasPropertyAmenities = property?.amenities?.length > 0;

  const contactPhone: string | null = data.broker?.phone || null;
  const brokerName: string = data.broker?.name?.trim() || '';
  // Pass the link creator (data.broker) so broker-created links deeplink Zalo to the broker.
  const zaloLink = getZaloLink(roomType, data.broker);

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          {token ? (
            // Trang link chia sẻ: KHÔNG cho về trang chủ — giữ khách trong trang để chỉ liên hệ chính chủ link.
            <span className="flex items-center" aria-label="MixStay">
              <Logo variant="light" className="h-7 w-auto" />
            </span>
          ) : (
            <Link href="/" className="flex items-center" aria-label="MixStay - Trang chủ">
              <Logo variant="light" className="h-7 w-auto" />
            </Link>
          )}
          {brokerName ? (
            <span className="text-xs text-stone-500">Môi giới: <span className="font-medium text-stone-700">{brokerName}</span></span>
          ) : (
            <a href="tel:0379838222" className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">📞 Hotline: 0379 838 222</a>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Section 1: Media (ảnh + video) */}
        <VideoGallery images={allImages} videos={videos} videoLinks={videoLinks} />

        {/* Module nhanh: Diện tích / Tổng phòng / Còn trống — ngay dưới ảnh chính */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-lg font-bold text-stone-800">{roomType.areaSqm} m²</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Diện tích</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-lg font-bold text-stone-800">{roomType.totalUnits}</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Tổng phòng</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-lg font-bold text-emerald-600">{roomType.availableUnits}</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Còn trống</p>
          </div>
        </div>

        {/* Section 2: Thông tin cơ bản */}
        <div className="card">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold">{roomType.name}</h1>
              <p className="text-sm text-stone-400 mt-1">Thuộc tòa: <span className="text-stone-600 font-medium">{property?.name}</span></p>
              {roomType.listingCode && (
                <p className="text-xs font-mono font-semibold text-stone-500 mt-1.5 inline-block bg-stone-100 px-2 py-0.5 rounded">Mã tin: {roomType.listingCode}</p>
              )}
            </div>
            {roomType.status === 'UPCOMING' ? (
              <span className="badge bg-amber-100 text-amber-700 text-sm py-1 flex-shrink-0">
                🟡 Sắp trống{roomType.expectedAvailableDate ? ` từ ${new Date(roomType.expectedAvailableDate).toLocaleDateString('vi-VN')}` : ''}
              </span>
            ) : roomType.status === 'UNAVAILABLE' ? (
              <span className="badge bg-red-100 text-red-700 text-sm py-1 flex-shrink-0">
                🔴 Hết phòng
              </span>
            ) : roomType.availableUnits > 0 ? (
              <span className="badge bg-emerald-100 text-emerald-700 text-sm py-1 flex-shrink-0">
                🟢 Còn {roomType.availableUnits} phòng trống
              </span>
            ) : null}
          </div>

          {roomType.typeName && (
            <span className="badge bg-brand-100 text-brand-700 mb-3">
              {roomTypeLabels[roomType.typeName] || roomType.typeName}
            </span>
          )}

          <div className="text-3xl font-bold text-brand-600 mb-1">
            {formatCurrency(roomType.priceMonthly)}
            <span className="text-base font-normal text-stone-400">/tháng</span>
          </div>

          {roomType.deposit > 0 && (
            <p className="text-sm text-stone-500 mb-2">
              Đặt cọc: <span className="font-semibold text-stone-700">{formatCurrency(roomType.deposit)}</span>
            </p>
          )}

          {roomType.shortTermAllowed && (
            <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 mb-4 mt-3">
              <p className="text-sm text-violet-700 font-medium">📅 Cho thuê ngắn hạn</p>
              <p className="text-xs text-violet-600 mt-0.5">
                {roomType.shortTermMonths && <>Từ {roomType.shortTermMonths} tháng</>}
                {roomType.shortTermPrice && <> — Giá {formatCurrency(roomType.shortTermPrice)}/tháng</>}
              </p>
            </div>
          )}

          {roomType.description && (
            <div className="p-3 bg-stone-50 rounded-xl">
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{roomType.description}</p>
            </div>
          )}
        </div>

        {/* Section 3: Tiện ích (phòng + tòa nhà gộp chung) */}
        {(roomType.amenities?.length > 0 || hasPropertyAmenities) && (
          <div className="card">
            <h2 className="font-display font-semibold text-lg mb-3">🛋️ Nội thất</h2>
            {roomType.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {roomType.amenities.map((a: string) => (
                  <span key={a} className="px-3 py-1.5 bg-brand-50 text-brand-700 text-sm rounded-lg border border-brand-100 font-medium">{a}</span>
                ))}
              </div>
            )}
            {hasPropertyAmenities && (
              <div className={roomType.amenities?.length > 0 ? 'mt-4 pt-4 border-t border-stone-100' : ''}>
                <p className="text-sm font-bold text-stone-700 mb-2 flex items-center gap-1.5">🏢 Tiện ích tòa nhà</p>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a: string) => (
                    <span key={a} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200 font-medium">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Tiện ích đặc biệt tòa nhà */}
        {hasPropertyFeatures && (
          <div className="card">
            <h2 className="font-display font-semibold text-lg mb-3">✨ Tiện ích đặc biệt</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {property?.parkingCar && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <div className="text-3xl mb-1">🚗</div>
                  <p className="text-sm text-blue-700 font-medium">Ô tô đỗ cửa</p>
                </div>
              )}
              {property?.parkingBike && (
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 text-center">
                  <div className="text-3xl mb-1">🏍️</div>
                  <p className="text-sm text-sky-700 font-medium">Để xe máy</p>
                </div>
              )}
              {property?.evCharging && (
                <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                  <div className="text-3xl mb-1">⚡</div>
                  <p className="text-sm text-green-700 font-medium">Sạc xe điện</p>
                </div>
              )}
              {property?.petAllowed && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <div className="text-3xl mb-1">🐾</div>
                  <p className="text-sm text-amber-700 font-medium">Thú cưng OK</p>
                </div>
              )}
              {property?.foreignerOk && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-center">
                  <div className="text-3xl mb-1">🌍</div>
                  <p className="text-sm text-purple-700 font-medium">Người nước ngoài</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 6: Google Maps */}
        <div className="card">
          <h2 className="font-display font-semibold text-lg mb-3">📍 Vị trí & Chỉ đường</h2>
          <div className="relative w-full rounded-xl overflow-hidden border border-stone-200" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={mapsEmbedUrl}
              className="absolute inset-0 w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 rounded-xl text-sm transition-all border border-blue-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Mở Google Maps để chỉ đường
          </a>
        </div>

        {/* Section 7: Liên hệ */}
        <div className="card bg-gradient-to-br from-brand-600 to-brand-700 text-white border-0">
          <h2 className="font-display font-semibold text-lg mb-2">Quan tâm phòng này?</h2>
          <p className="text-brand-100 text-sm mb-4">Liên hệ hỗ trợ để được tư vấn và hẹn xem phòng miễn phí.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a href={zaloLink} target="_blank" rel="noopener noreferrer"
              className="bg-[#0068FF] text-white font-medium py-3 rounded-xl text-center text-sm hover:opacity-90 transition-all">
              💬 Tư vấn qua Zalo
            </a>
            {contactPhone ? (
              <a href={`tel:${contactPhone}`} className="bg-white text-brand-700 font-medium py-3 rounded-xl text-center text-sm hover:bg-brand-50 transition-all">
                📞 Gọi hỗ trợ trực tiếp
              </a>
            ) : (
              // Trang công khai /tin/[id] không gắn môi giới → fallback HOTLINE công ty (số tĩnh,
              // KHÔNG qua lib/zalo). Nút Zalo bên cạnh vẫn giữ định tuyến riêng → không bị đè.
              <a href="tel:0379838222" className="bg-white text-brand-700 font-medium py-3 rounded-xl text-center text-sm hover:bg-brand-50 transition-all">
                📞 Gọi hotline 0379 838 222
              </a>
            )}
          </div>
        </div>

        {/* Section 8: Tin đăng liên quan */}
        {roomType.id && <RelatedSection roomTypeId={roomType.id} />}

        <p className="text-center text-xs text-stone-400 mt-4 mb-20">
          Powered by MixStay{brokerName ? ` • Môi giới: ${brokerName}` : ''}
        </p>
      </div>

      {/* Floating Zalo button (shortcut khi user scroll xa Section 7) — định tuyến broker/chủ nhà */}
      <ZaloFab href={zaloLink} />
      {/* Nút gọi nổi: link môi giới/chủ nhà → gọi đúng người đó; trang công khai /tin → hotline công ty */}
      {contactPhone ? (
        <CallFab phone={contactPhone.replace(/\D/g, '')} display={contactPhone} label="Gọi" />
      ) : (
        <CallFab />
      )}
    </div>
  );
}
