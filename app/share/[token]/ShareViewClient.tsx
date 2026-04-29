'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';
import VideoGallery from '@/components/ui/VideoGallery';
import ZaloFab from '@/components/ui/ZaloFab';
import { getZaloLink } from '@/lib/zalo';

const roomTypeLabels: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1 khách 1 ngủ',
  '2k1n': '2 khách 1 ngủ', studio: 'Studio', duplex: 'Duplex',
};

// ==================== Related Room Card ====================
function RelatedRoomCard({ rt }: { rt: any }) {
  const cover = rt.images?.[0] || rt.property?.images?.[0] || null;
  const href = rt.shareToken ? `/p/${rt.shareToken}` : null;

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
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/share-links?token=${token}`)
      .then(res => { if (!res.ok) throw new Error('not found'); return res.json(); })
      .then(setData)
      .catch(() => setError('Link không tồn tại hoặc đã hết hạn'))
      .finally(() => setLoading(false));
  }, [token]);

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

  const mapsQuery = encodeURIComponent(`${property?.streetName}, ${property?.district}, ${property?.city || 'Hà Nội'}`);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;
  const mapsEmbedUrl = `https://maps.google.com/maps?q=${mapsQuery}&output=embed`;

  const hasPropertyFeatures = property?.parkingCar || property?.parkingBike || property?.evCharging || property?.petAllowed || property?.foreignerOk;
  const hasPropertyAmenities = property?.amenities?.length > 0;

  const contactPhone: string | null = data.broker?.phone || null;
  const contactName: string = data.broker?.name || 'hỗ trợ';
  const zaloLink = getZaloLink(roomType);

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-display font-semibold">MixStay</span>
          </Link>
          <span className="text-xs text-stone-400">Hỗ trợ bởi {contactName}</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Section 1: Media (ảnh + video) */}
        <VideoGallery images={allImages} videos={videos} videoLinks={videoLinks} />

        {/* Section 2: Thông tin cơ bản */}
        <div className="card">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold">{roomType.name}</h1>
              <p className="text-sm text-stone-400 mt-1">Thuộc tòa: <span className="text-stone-600 font-medium">{property?.name}</span></p>
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

          <div className="grid grid-cols-3 gap-3 mb-4 mt-4">
            <div className="p-3 bg-stone-50 rounded-xl text-center">
              <p className="text-lg font-bold text-stone-800">{roomType.areaSqm} m²</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Diện tích</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl text-center">
              <p className="text-lg font-bold text-stone-800">{roomType.totalUnits}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Tổng phòng</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl text-center">
              <p className="text-lg font-bold text-emerald-600">{roomType.availableUnits}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Còn trống</p>
            </div>
          </div>

          {roomType.description && (
            <div className="p-3 bg-stone-50 rounded-xl">
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{roomType.description}</p>
            </div>
          )}
        </div>

        {/* Section 3: Tiện ích (phòng + tòa nhà gộp chung) */}
        {(roomType.amenities?.length > 0 || hasPropertyAmenities) && (
          <div className="card">
            <h2 className="font-display font-semibold text-lg mb-3">🛋️ Tiện ích</h2>
            {roomType.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {roomType.amenities.map((a: string) => (
                  <span key={a} className="px-3 py-1.5 bg-brand-50 text-brand-700 text-sm rounded-lg border border-brand-100 font-medium">{a}</span>
                ))}
              </div>
            )}
            {hasPropertyAmenities && (
              <div className={roomType.amenities?.length > 0 ? 'mt-4 pt-4 border-t border-stone-100' : ''}>
                <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Tiện ích tòa nhà</p>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a: string) => (
                    <span key={a} className="px-3 py-1.5 bg-stone-100 text-stone-700 text-sm rounded-lg">{a}</span>
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

        {/* Section 5b: Đơn vị vận hành (chỉ hiện nếu property thuộc công ty) */}
        {property?.company && (
          <div className="card border-brand-100 bg-gradient-to-br from-brand-50/40 to-white">
            <h2 className="font-display font-semibold text-lg mb-3">🏢 Đơn vị vận hành</h2>
            <div className="flex items-start gap-3">
              {property.company.logo ? (
                <img src={property.company.logo} alt={property.company.name}
                  className="w-12 h-12 rounded-xl object-cover border border-brand-100 flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-2xl flex-shrink-0">
                  🏢
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">{property.company.name}</p>
                {property.company.description && (
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{property.company.description}</p>
                )}
                {property.company.zaloGroupLink && (
                  <a href={property.company.zaloGroupLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium border border-blue-100 transition-all">
                    💬 Tham gia nhóm Zalo công ty
                  </a>
                )}
              </div>
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
              <div className="bg-white/20 text-white font-medium py-3 rounded-xl text-center text-sm border border-white/20">
                Liên hệ {contactName}
              </div>
            )}
          </div>
        </div>

        {/* Section 8: Tin đăng liên quan */}
        {roomType.id && <RelatedSection roomTypeId={roomType.id} />}

        <p className="text-center text-xs text-stone-400 mt-4 mb-20">
          Powered by MixStay • Hỗ trợ bởi {contactName}
        </p>
      </div>

      {/* Floating Zalo button (shortcut khi user scroll xa Section 7) */}
      <ZaloFab href={zaloLink} />
    </div>
  );
}
