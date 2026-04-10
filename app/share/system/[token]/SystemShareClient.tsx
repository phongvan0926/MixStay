'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';

const roomTypeLabels: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1 khách 1 ngủ',
  '2k1n': '2 khách 1 ngủ', studio: 'Studio', duplex: 'Duplex',
};

function CardCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  const slides = images.slice(0, 3);

  if (slides.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
        <span className="text-4xl opacity-50">🏠</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group">
      <OptimizedImage src={slides[idx]} alt="" fill className="object-cover transition-opacity duration-300" sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" />
      {slides.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + slides.length) % slides.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 text-stone-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow text-sm"
          >
            ‹
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % slides.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 text-stone-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow text-sm"
          >
            ›
          </button>
          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {slides.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-3' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SystemShareClient() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  // Filters
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');

  useEffect(() => {
    fetch(`/api/share-links?systemToken=${token}`)
      .then(res => { if (!res.ok) throw new Error('not found'); return res.json(); })
      .then(setData)
      .catch(() => setError('Link không tồn tại hoặc đã hết hạn'))
      .finally(() => setLoading(false));
  }, [token]);

  // Flatten all room types with property info
  const allRoomTypes = useMemo(() => {
    if (!data?.properties) return [];
    return data.properties.flatMap((p: any) =>
      p.roomTypes.map((rt: any) => ({ ...rt, property: p }))
    );
  }, [data]);

  // Extract unique districts for filter
  const districts = useMemo(() => {
    const set = new Set(allRoomTypes.map((rt: any) => rt.property?.district).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [allRoomTypes]);

  // Extract unique room types for filter
  const typeNames = useMemo(() => {
    const set = new Set(allRoomTypes.map((rt: any) => rt.typeName).filter(Boolean));
    return Array.from(set) as string[];
  }, [allRoomTypes]);

  // Filtered results
  const filteredRoomTypes = useMemo(() => {
    return allRoomTypes.filter((rt: any) => {
      if (filterDistrict && rt.property?.district !== filterDistrict) return false;
      if (filterType && rt.typeName !== filterType) return false;
      if (filterPriceMin && rt.priceMonthly < Number(filterPriceMin)) return false;
      if (filterPriceMax && rt.priceMonthly > Number(filterPriceMax)) return false;
      return true;
    });
  }, [allRoomTypes, filterDistrict, filterType, filterPriceMin, filterPriceMax]);

  const hasActiveFilters = filterDistrict || filterType || filterPriceMin || filterPriceMax;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
        <p className="text-stone-400 text-sm">Đang tải kho phòng...</p>
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

  const { landlord } = data;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-display font-semibold">MixStay</span>
          </div>
          <span className="text-xs text-stone-400">Kho phòng của {landlord?.name}</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold text-stone-900">Phòng cho thuê</h1>
          <p className="text-stone-500 mt-2">
            Hệ thống của {landlord?.name} • {allRoomTypes.length} loại phòng trống từ {data.properties?.length || 0} tòa nhà
          </p>
        </div>

        {/* Filters */}
        {allRoomTypes.length > 0 && (
          <div className="card mb-6">
            <div className="flex flex-wrap gap-3 items-end">
              {/* District filter */}
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-stone-500 mb-1 block">Khu vực</label>
                <select
                  value={filterDistrict}
                  onChange={e => setFilterDistrict(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">Tất cả khu vực</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Room type filter */}
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-stone-500 mb-1 block">Kiểu phòng</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">Tất cả kiểu</option>
                  {typeNames.map(t => <option key={t} value={t}>{roomTypeLabels[t] || t}</option>)}
                </select>
              </div>

              {/* Price range */}
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-stone-500 mb-1 block">Giá từ (₫)</label>
                <input
                  type="number"
                  placeholder="VD: 3000000"
                  value={filterPriceMin}
                  onChange={e => setFilterPriceMin(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-stone-500 mb-1 block">Giá đến (₫)</label>
                <input
                  type="number"
                  placeholder="VD: 10000000"
                  value={filterPriceMax}
                  onChange={e => setFilterPriceMax(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => { setFilterDistrict(''); setFilterType(''); setFilterPriceMin(''); setFilterPriceMax(''); }}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium pb-2"
                >
                  Xóa lọc
                </button>
              )}
            </div>
            {hasActiveFilters && (
              <p className="text-xs text-stone-400 mt-2">
                Hiển thị {filteredRoomTypes.length} / {allRoomTypes.length} loại phòng
              </p>
            )}
          </div>
        )}

        {/* Room type grid */}
        {filteredRoomTypes.length === 0 ? (
          <div className="text-center py-16 text-stone-400 card max-w-md mx-auto">
            <p className="text-4xl mb-3">🏠</p>
            <p>{hasActiveFilters ? 'Không có phòng nào phù hợp bộ lọc.' : 'Hiện không có phòng trống nào.'}</p>
            {hasActiveFilters && (
              <button
                onClick={() => { setFilterDistrict(''); setFilterType(''); setFilterPriceMin(''); setFilterPriceMax(''); }}
                className="mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRoomTypes.map((rt: any) => {
              const cardImages = [...(rt.images || []), ...(rt.property?.images || [])];
              return (
                <div key={rt.id}
                  className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => setSelectedRoom(rt)}>
                  {/* Card carousel — 3 ảnh */}
                  <div className="relative h-44 overflow-hidden">
                    <CardCarousel images={cardImages} />
                    <div className="absolute top-3 left-3">
                      <span className="badge bg-white/90 text-stone-700 backdrop-blur-sm text-xs">
                        {roomTypeLabels[rt.typeName] || rt.typeName}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="badge bg-emerald-500 text-white text-xs">
                        {rt.availableUnits} trống
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-lg text-stone-900 mb-1">{rt.property?.name}</h3>
                    <p className="text-sm text-stone-500 mb-2">
                      {rt.name} • {rt.property?.district} • {rt.areaSqm}m²
                    </p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-bold text-brand-600">
                          {formatCurrency(rt.priceMonthly)}
                          <span className="text-sm font-normal text-stone-400">/th</span>
                        </p>
                        {rt.deposit && rt.deposit > 0 && (
                          <p className="text-xs text-stone-400">Cọc: {formatCurrency(rt.deposit)}</p>
                        )}
                      </div>
                      {rt.shortTermAllowed && (
                        <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-100">
                          📅 Ngắn hạn OK
                        </span>
                      )}
                    </div>

                    {rt.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {rt.amenities.slice(0, 4).map((a: string) => (
                          <span key={a} className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{a}</span>
                        ))}
                        {rt.amenities.length > 4 && (
                          <span className="text-[10px] text-stone-400">+{rt.amenities.length - 4}</span>
                        )}
                      </div>
                    )}

                    <button className="mt-3 w-full text-sm text-brand-600 font-medium py-2 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors">
                      Xem chi tiết →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 mb-6 text-center">
          <div className="card bg-gradient-to-br from-brand-600 to-brand-700 text-white border-0 max-w-lg mx-auto">
            <p className="font-display font-semibold text-lg mb-1">Quan tâm phòng nào?</p>
            <p className="text-brand-100 text-sm">Liên hệ qua môi giới để được tư vấn và hẹn xem phòng miễn phí.</p>
          </div>
          <p className="text-xs text-stone-400 mt-6">
            Powered by MixStay • Kho phòng của {landlord?.name}
          </p>
        </div>
      </div>

      {/* Room detail modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedRoom(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto mx-0 sm:mx-4 z-10">
            {/* Close button */}
            <button onClick={() => setSelectedRoom(null)}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/20 text-white flex items-center justify-center hover:bg-black/40 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Images */}
            {(() => {
              const imgs = [...(selectedRoom.images || []), ...(selectedRoom.property?.images || [])];
              return imgs.length > 0 ? (
                <div className="h-56 overflow-hidden">
                  <CardCarousel images={imgs} />
                </div>
              ) : null;
            })()}

            <div className="p-5 space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between">
                  <h2 className="font-display text-xl font-bold text-stone-900">{selectedRoom.name}</h2>
                  <span className="badge bg-emerald-100 text-emerald-700 shrink-0 ml-2">
                    {selectedRoom.availableUnits} trống
                  </span>
                </div>
                <p className="text-sm text-stone-500 mt-1">
                  {selectedRoom.property?.name} • {selectedRoom.property?.district}
                </p>
                <span className="badge bg-brand-100 text-brand-700 mt-2 inline-block">
                  {roomTypeLabels[selectedRoom.typeName] || selectedRoom.typeName}
                </span>
              </div>

              {/* Price */}
              <div className="text-3xl font-bold text-brand-600">
                {formatCurrency(selectedRoom.priceMonthly)}
                <span className="text-base font-normal text-stone-400">/tháng</span>
              </div>

              {selectedRoom.deposit > 0 && (
                <p className="text-sm text-stone-500">Đặt cọc: <span className="font-semibold text-stone-700">{formatCurrency(selectedRoom.deposit)}</span></p>
              )}

              {/* Short term */}
              {selectedRoom.shortTermAllowed && (
                <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
                  <p className="text-sm text-violet-700 font-medium">📅 Cho thuê ngắn hạn</p>
                  <p className="text-xs text-violet-600 mt-0.5">
                    {selectedRoom.shortTermMonths && <>Từ {selectedRoom.shortTermMonths} tháng</>}
                    {selectedRoom.shortTermPrice && <> — Giá {formatCurrency(selectedRoom.shortTermPrice)}/tháng</>}
                  </p>
                </div>
              )}

              {/* Specs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-stone-50 rounded-xl text-center">
                  <p className="text-lg font-bold text-stone-800">{selectedRoom.areaSqm} m²</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Diện tích</p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl text-center">
                  <p className="text-lg font-bold text-stone-800">{selectedRoom.totalUnits}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Tổng phòng</p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl text-center">
                  <p className="text-lg font-bold text-emerald-600">{selectedRoom.availableUnits}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Còn trống</p>
                </div>
              </div>

              {selectedRoom.availableRoomNames && (
                <p className="text-sm text-stone-500">Phòng trống: <span className="font-medium text-stone-700">{selectedRoom.availableRoomNames}</span></p>
              )}

              {selectedRoom.description && (
                <div className="p-3 bg-stone-50 rounded-xl">
                  <p className="text-sm text-stone-600 leading-relaxed">{selectedRoom.description}</p>
                </div>
              )}

              {/* Amenities */}
              {selectedRoom.amenities?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-stone-700 mb-2">Tiện ích phòng</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoom.amenities.map((a: string) => (
                      <span key={a} className="px-3 py-1.5 bg-brand-50 text-brand-700 text-sm rounded-lg border border-brand-100 font-medium">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Building amenities */}
              {selectedRoom.property?.amenities?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-stone-700 mb-2">Tiện ích tòa nhà</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoom.property.amenities.map((a: string) => (
                      <span key={a} className="px-3 py-1.5 bg-stone-100 text-stone-700 text-sm rounded-lg">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Building features */}
              <div className="flex flex-wrap gap-2">
                {selectedRoom.property?.parkingCar && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg border border-blue-100">🚗 Ô tô đỗ cửa</span>
                )}
                {selectedRoom.property?.evCharging && (
                  <span className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-lg border border-green-100">⚡ Sạc xe điện</span>
                )}
                {selectedRoom.property?.petAllowed && (
                  <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg border border-amber-100">🐾 Thú cưng OK</span>
                )}
                {selectedRoom.property?.foreignerOk && (
                  <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg border border-purple-100">🌍 Nước ngoài OK</span>
                )}
              </div>

              {/* Location */}
              <div className="p-3 bg-stone-50 rounded-xl">
                <p className="font-medium text-stone-900 text-sm">Khu vực: {selectedRoom.property?.district}, {selectedRoom.property?.city}</p>
                <p className="text-xs text-stone-500 mt-0.5">Tuyến phố: {selectedRoom.property?.streetName}</p>
                <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-[11px] text-amber-700">🔒 Địa chỉ chi tiết sẽ được cung cấp khi liên hệ</p>
                </div>
              </div>

              {/* Google Maps */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selectedRoom.property?.streetName}, ${selectedRoom.property?.district}, ${selectedRoom.property?.city || 'Hà Nội'}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 rounded-xl text-sm transition-all border border-blue-100"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Chỉ đường (Google Maps)
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
