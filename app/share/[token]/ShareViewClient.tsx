'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';

const roomTypeLabels: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1 khách 1 ngủ',
  '2k1n': '2 khách 1 ngủ', studio: 'Studio', duplex: 'Duplex',
};

function ImageGallery({ images }: { images: string[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (images.length === 0) {
    return (
      <div className="h-64 md:h-80 bg-gradient-to-br from-brand-100 via-brand-50 to-blue-50 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">🏢</span>
          <p className="text-sm text-stone-400 mt-2">Chưa có ảnh</p>
        </div>
      </div>
    );
  }

  // Show up to 3 main images in grid, click to open lightbox
  const mainImages = images.slice(0, 3);

  return (
    <>
      {/* Main images grid */}
      <div className="relative cursor-pointer" onClick={() => setLightbox(true)}>
        {mainImages.length === 1 && (
          <div className="rounded-2xl overflow-hidden relative h-64 md:h-80">
            <OptimizedImage src={mainImages[0]} alt="Ảnh phòng" fill className="object-cover hover:scale-[1.02] transition-transform duration-300" sizes="100vw" priority />
          </div>
        )}
        {mainImages.length === 2 && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
            {mainImages.map((img, i) => (
              <div key={i} className="relative h-64 md:h-80">
                <OptimizedImage src={img} alt={`Ảnh ${i + 1}`} fill className="object-cover hover:scale-[1.02] transition-transform duration-300" sizes="50vw" />
              </div>
            ))}
          </div>
        )}
        {mainImages.length >= 3 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-2xl overflow-hidden">
            <div className="col-span-2 row-span-2 relative h-48 sm:h-64 md:h-80">
              <OptimizedImage src={mainImages[0]} alt="Ảnh 1" fill className="object-cover hover:scale-[1.02] transition-transform duration-300" sizes="66vw" priority />
            </div>
            <div className="flex flex-row sm:flex-col gap-2">
              <div className="relative flex-1 sm:h-[calc(50%-4px)] md:h-[calc(160px-4px)]">
                <OptimizedImage src={mainImages[1]} alt="Ảnh 2" fill className="object-cover hover:scale-[1.02] transition-transform duration-300" sizes="33vw" />
              </div>
              <div className="relative flex-1 sm:h-[calc(50%-4px)] md:h-[calc(160px-4px)]">
                <OptimizedImage src={mainImages[2]} alt="Ảnh 3" fill className="object-cover hover:scale-[1.02] transition-transform duration-300" sizes="33vw" />
                {images.length > 3 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                    <span className="text-white font-semibold text-lg">+{images.length - 3} ảnh</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Image counter badge */}
        <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">
          📷 {images.length} ảnh
        </span>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 text-xl z-10"
          >
            ✕
          </button>

          <img
            src={images[activeIdx]}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIdx(i => (i - 1 + images.length) % images.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 text-2xl"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIdx(i => (i + 1) % images.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 text-2xl"
              >
                ›
              </button>
            </>
          )}

          {/* Counter */}
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {activeIdx + 1} / {images.length}
          </span>

          {/* Lightbox thumbnails */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setActiveIdx(idx); }}
                className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === activeIdx ? 'border-white shadow-lg' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <OptimizedImage src={img} alt="" fill className="object-cover" sizes="60px" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

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

  const roomType = data.roomType;
  if (!roomType) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">😔</p>
        <h1 className="font-display text-2xl font-bold mb-2">Không tìm thấy phòng</h1>
        <p className="text-stone-500 mb-6">Loại phòng đã bị xoá hoặc link không hợp lệ</p>
        <Link href="/" className="btn-primary">Về trang chủ</Link>
      </div>
    </div>
  );
  const property = roomType?.property;

  const roomImages: string[] = roomType?.images || [];
  const propImages: string[] = property?.images || [];
  const allImages = [...roomImages, ...propImages];

  // Build Google Maps direction URL using district + street (no exact address)
  const mapsQuery = encodeURIComponent(`${property?.streetName}, ${property?.district}, ${property?.city || 'Hà Nội'}`);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;

  const hasPropertyFeatures = property?.parkingCar || property?.evCharging || property?.petAllowed || property?.foreignerOk;
  const hasPropertyAmenities = property?.amenities?.length > 0;

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-display font-semibold">MixStay</span>
          </div>
          <span className="text-xs text-stone-400">Chia sẻ bởi {data.broker?.name}</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Image Gallery — 3 ảnh chính, click mở lightbox */}
        <div className="mb-6">
          <ImageGallery images={allImages} />
        </div>

        {/* Room type info */}
        <div className="card mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="font-display text-2xl font-bold">{property?.name}</h1>
              <p className="text-stone-500 mt-1">{roomType.name}</p>
            </div>
            {roomType.availableUnits > 0 && (
              <span className="badge bg-emerald-100 text-emerald-700 text-sm py-1 flex-shrink-0">
                Còn {roomType.availableUnits} phòng trống
              </span>
            )}
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
            <p className="text-sm text-stone-500 mb-2">Đặt cọc: <span className="font-semibold text-stone-700">{formatCurrency(roomType.deposit)}</span></p>
          )}

          {/* Short term rental */}
          {roomType.shortTermAllowed && (
            <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 mb-4">
              <p className="text-sm text-violet-700 font-medium">📅 Cho thuê ngắn hạn</p>
              <p className="text-xs text-violet-600 mt-0.5">
                {roomType.shortTermMonths && <>Từ {roomType.shortTermMonths} tháng</>}
                {roomType.shortTermPrice && <> — Giá {formatCurrency(roomType.shortTermPrice)}/tháng</>}
              </p>
            </div>
          )}

          {/* Key specs grid */}
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

          {/* Available room names */}
          {roomType.availableRoomNames && (
            <p className="text-sm text-stone-500 mb-4">
              Phòng trống: <span className="font-medium text-stone-700">{roomType.availableRoomNames}</span>
            </p>
          )}

          {roomType.description && (
            <div className="p-3 bg-stone-50 rounded-xl mb-4">
              <p className="text-sm text-stone-600 leading-relaxed">{roomType.description}</p>
            </div>
          )}

          {/* Room amenities */}
          {roomType.amenities?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-stone-700 mb-2">Tiện ích phòng</p>
              <div className="flex flex-wrap gap-2">
                {roomType.amenities.map((a: string) => (
                  <span key={a} className="px-3 py-1.5 bg-brand-50 text-brand-700 text-sm rounded-lg border border-brand-100 font-medium">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Building features */}
        {(hasPropertyAmenities || hasPropertyFeatures) && (
          <div className="card mb-4">
            <h2 className="font-display font-semibold text-lg mb-3">🏢 Tiện ích tòa nhà</h2>

            {hasPropertyAmenities && (
              <div className="flex flex-wrap gap-2 mb-3">
                {property.amenities.map((a: string) => (
                  <span key={a} className="px-3 py-1.5 bg-stone-100 text-stone-700 text-sm rounded-lg">{a}</span>
                ))}
              </div>
            )}

            {hasPropertyFeatures && (
              <div className="grid grid-cols-2 gap-2">
                {property?.parkingCar && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 rounded-xl">
                    <span className="text-lg">🚗</span>
                    <span className="text-sm text-blue-700 font-medium">Ô tô đỗ cửa</span>
                  </div>
                )}
                {property?.evCharging && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-xl">
                    <span className="text-lg">⚡</span>
                    <span className="text-sm text-green-700 font-medium">Sạc xe điện</span>
                  </div>
                )}
                {property?.petAllowed && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 rounded-xl">
                    <span className="text-lg">🐾</span>
                    <span className="text-sm text-amber-700 font-medium">Nuôi thú cưng</span>
                  </div>
                )}
                {property?.foreignerOk && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 rounded-xl">
                    <span className="text-lg">🌍</span>
                    <span className="text-sm text-purple-700 font-medium">Cho người nước ngoài</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Location with DIRECTIONS button */}
        <div className="card mb-4">
          <h2 className="font-display font-semibold text-lg mb-3">📍 Vị trí</h2>
          <div className="p-4 bg-stone-50 rounded-xl">
            <p className="font-medium text-stone-900">Khu vực: {property?.district}, {property?.city}</p>
            <p className="text-sm text-stone-500 mt-1">Tuyến phố: {property?.streetName}</p>
            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-700">🔒 Địa chỉ chi tiết sẽ được cung cấp khi hẹn xem phòng qua môi giới</p>
            </div>
          </div>

          {/* Google Maps direction button */}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 rounded-xl text-sm transition-all border border-blue-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Chỉ đường đến khu vực này (Google Maps)
          </a>
        </div>

        {/* Contact CTA */}
        <div className="card bg-gradient-to-br from-brand-600 to-brand-700 text-white border-0">
          <h2 className="font-display font-semibold text-lg mb-2">Quan tâm phòng này?</h2>
          <p className="text-brand-100 text-sm mb-4">Liên hệ môi giới để được tư vấn và hẹn xem phòng miễn phí.</p>
          <div className="flex gap-3">
            {data.broker?.phone ? (
              <>
                <a href={`tel:${data.broker.phone}`} className="flex-1 bg-white text-brand-700 font-medium py-3 rounded-xl text-center text-sm hover:bg-brand-50 transition-all">
                  📞 Gọi môi giới
                </a>
                <a href={`sms:${data.broker.phone}`} className="flex-1 bg-white/20 text-white font-medium py-3 rounded-xl text-center text-sm hover:bg-white/30 transition-all border border-white/20">
                  💬 Nhắn tin
                </a>
              </>
            ) : (
              <div className="flex-1 bg-white/20 text-white font-medium py-3 rounded-xl text-center text-sm border border-white/20">
                Liên hệ môi giới: {data.broker?.name}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-8 mb-4">
          Powered by MixStay • Link chia sẻ bởi {data.broker?.name}
        </p>
      </div>
    </div>
  );
}
