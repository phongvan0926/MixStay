'use client';
import { useState } from 'react';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { formatCurrency } from '@/lib/utils';
import DistrictPills from '@/components/ui/DistrictPills';
import PriceRangeSlider from '@/components/ui/PriceRangeSlider';

const ROOM_TYPES: { value: string; label: string }[] = [
  { value: 'don', label: 'Phòng đơn' },
  { value: 'gac_xep', label: 'Gác xép' },
  { value: '1k1n', label: '1 khách 1 ngủ' },
  { value: '2k1n', label: '2 khách 1 ngủ' },
  { value: 'studio', label: 'Studio' },
  { value: 'duplex', label: 'Duplex' },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ROOM_TYPES.map(r => [r.value, r.label])
);

type FeatureKey = 'parkingCar' | 'parkingBike' | 'evCharging' | 'petAllowed' | 'foreignerOk';

const FEATURES: { key: FeatureKey; label: string; icon: string }[] = [
  { key: 'parkingCar', label: 'Ô tô đỗ cửa', icon: '🚗' },
  { key: 'parkingBike', label: 'Để xe máy', icon: '🏍️' },
  { key: 'evCharging', label: 'Sạc xe điện', icon: '⚡' },
  { key: 'petAllowed', label: 'Thú cưng OK', icon: '🐾' },
  { key: 'foreignerOk', label: 'Người nước ngoài', icon: '🌍' },
];

type PublicRoom = {
  id: string;
  name: string;
  typeName: string;
  areaSqm: number;
  priceMonthly: number;
  amenities: string[];
  images: string[];
  hasVideo: boolean;
  availableUnits: number;
  status?: 'AVAILABLE' | 'UPCOMING' | 'UNAVAILABLE';
  expectedAvailableDate?: string | null;
  shortTermAllowed: boolean;
  property: {
    name: string;
    district: string;
    streetName: string;
    city: string;
    parkingCar: boolean;
    parkingBike: boolean;
    evCharging: boolean;
    petAllowed: boolean;
    foreignerOk: boolean;
  } | null;
  shareToken: string | null;
};

function RoomCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) {
    return (
      <div className="w-full h-48 bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
        <span className="text-5xl opacity-60">🏠</span>
      </div>
    );
  }
  return (
    <div className="relative w-full h-48 overflow-hidden bg-stone-100 group/img">
      <OptimizedImage
        src={images[idx]}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        className="object-cover"
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 text-stone-700 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-white shadow text-sm"
            aria-label="Ảnh trước"
          >‹</button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx(i => (i + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 text-stone-700 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-white shadow text-sm"
            aria-label="Ảnh sau"
          >›</button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/60 w-1.5'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PublicSearch() {
  const [district, setDistrict] = useState('');
  const [typeName, setTypeName] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    parkingCar: false,
    parkingBike: false,
    evCharging: false,
    petAllowed: false,
    foreignerOk: false,
  });

  const toggleFeature = (key: FeatureKey) =>
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));

  const resetFilters = () => {
    setDistrict('');
    setTypeName('');
    setMinPrice('');
    setMaxPrice('');
    setFeatures({ parkingCar: false, parkingBike: false, evCharging: false, petAllowed: false, foreignerOk: false });
  };

  const [results, setResults] = useState<PublicRoom[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (district) params.set('district', district);
      if (typeName) params.set('typeName', typeName);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      (Object.keys(features) as FeatureKey[]).forEach(k => {
        if (features[k]) params.set(k, 'true');
      });
      params.set('limit', '12');

      const res = await fetch(`/api/rooms/public?${params.toString()}`);
      if (!res.ok) throw new Error('Không tải được dữ liệu');
      const json = await res.json();
      setResults(json.data || []);
      setTotal(json.pagination?.total || 0);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-12 sm:py-16 px-4 sm:px-6 overflow-hidden bg-white">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-stone-50 to-white" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-medium text-brand-700 mb-3">
            🔎 Tìm phòng công khai
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-2">Tìm phòng theo nhu cầu</h2>
          <p className="text-stone-500 text-sm">Không cần đăng nhập — lọc nhanh theo khu vực, kiểu phòng & giá</p>
        </div>

        {/* Filter card */}
        <form
          onSubmit={handleSearch}
          className="rounded-2xl bg-white border border-stone-200 p-4 sm:p-5 shadow-sm mb-8"
        >
          {/* District pills (hybrid 7 + dropdown) */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-stone-500 mb-2">Khu vực</label>
            <DistrictPills value={district} onChange={setDistrict} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Kiểu phòng</label>
              <select
                className="input-field text-sm"
                value={typeName}
                onChange={e => setTypeName(e.target.value)}
              >
                <option value="">Tất cả kiểu</option>
                {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Khoảng giá thuê</label>
              <PriceRangeSlider
                minValue={minPrice}
                maxValue={maxPrice}
                onChange={({ min, max }) => { setMinPrice(min); setMaxPrice(max); }}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 text-sm font-medium"
              >
                {loading ? 'Đang tìm...' : 'Tìm phòng'}
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2 gap-2">
              <label className="block text-xs font-medium text-stone-500">Đặc điểm nổi bật</label>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-stone-500 hover:text-brand-600 transition-colors"
              >
                Xoá lọc
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map(f => {
                const active = features[f.key];
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => toggleFeature(f.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                      active
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                    aria-pressed={active}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Results */}
        {error && (
          <div className="text-center py-8 text-red-600 text-sm">{error}</div>
        )}

        {searched && !loading && results && results.length === 0 && !error && (
          <div className="text-center py-12 text-stone-500">
            <p className="text-4xl mb-3">🏚️</p>
            <p>Không tìm thấy phòng phù hợp. Hãy thử nới rộng bộ lọc.</p>
          </div>
        )}

        {results && results.length > 0 && (
          <>
            <p className="text-sm text-stone-500 mb-4">
              Tìm thấy <span className="font-semibold text-stone-800">{total}</span> tin đăng phù hợp
              {total > results.length && <> • hiển thị {results.length} kết quả đầu</>}
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map(rt => {
                const href = rt.shareToken
                  ? `/share/${rt.shareToken}`
                  : `/login?redirect=/&message=${encodeURIComponent('Đăng nhập để xem chi tiết')}`;
                return (
                  <Link
                    key={rt.id}
                    href={href}
                    className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-stone-300 transition-all"
                  >
                    <div className="relative">
                      <RoomCarousel images={rt.images} alt={rt.name} />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-stone-700 border border-white">
                          {TYPE_LABEL[rt.typeName] || rt.typeName}
                        </span>
                        {rt.hasVideo && (
                          <span
                            title="Có video"
                            className="inline-flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] w-6 h-6 shadow"
                          >
                            🎬
                          </span>
                        )}
                      </div>
                      <div className="absolute top-3 right-3">
                        {rt.status === 'UPCOMING' ? (
                          <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
                            🟡 Sắp trống{rt.expectedAvailableDate ? ` ${new Date(rt.expectedAvailableDate).toLocaleDateString('vi-VN')}` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
                            Còn {rt.availableUnits} phòng
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-display font-semibold text-base text-stone-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
                        {rt.name}
                      </h3>
                      <p className="text-sm text-stone-500 mt-0.5 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {rt.property?.district || '—'}{rt.property?.streetName ? ` • ${rt.property.streetName}` : ''}
                      </p>

                      <div className="mt-3 flex items-baseline justify-between gap-2">
                        <span className="text-xl font-bold text-brand-600">
                          {formatCurrency(rt.priceMonthly)}
                          <span className="text-xs font-normal text-stone-400">/tháng</span>
                        </span>
                        <span className="text-xs text-stone-500">{rt.areaSqm}m²</span>
                      </div>

                      {/* Property-level special amenities */}
                      {(rt.property?.parkingCar || rt.property?.parkingBike || rt.property?.evCharging || rt.property?.petAllowed || rt.property?.foreignerOk || rt.shortTermAllowed) && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {rt.property?.parkingCar && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🚗 Ô tô đỗ cửa</span>}
                          {rt.property?.parkingBike && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🏍️ Để xe máy</span>}
                          {rt.property?.evCharging && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">⚡ Sạc xe điện</span>}
                          {rt.property?.petAllowed && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🐾 Thú cưng OK</span>}
                          {rt.property?.foreignerOk && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🌍 Người nước ngoài</span>}
                          {rt.shortTermAllowed && <span className="text-[11px] bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">📅 Ngắn hạn</span>}
                        </div>
                      )}

                      <div className="mt-3 text-center text-xs font-medium text-brand-600 group-hover:underline">
                        {rt.shareToken ? 'Xem chi tiết phòng →' : 'Đăng nhập để xem chi tiết →'}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
