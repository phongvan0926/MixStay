'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ListingImageMosaic from '@/components/ui/ListingImageMosaic';
import { formatCurrency } from '@/lib/utils';
import DistrictPills from '@/components/ui/DistrictPills';
import PriceRangeSlider from '@/components/ui/PriceRangeSlider';

const ROOM_TYPES: { value: string; label: string }[] = [
  { value: 'studio', label: 'Studio' },
  { value: 'gac_xep', label: 'Gác xép' },
  { value: 'don', label: 'Phòng đơn' },
  { value: '1k1n', label: '1 ngủ 1 khách' },
  { value: '2k1n', label: '2 ngủ 1 khách' },
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
  videoLinks?: string[];
  videos?: string[];
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

export default function PublicSearch({ autoLoad = false }: { autoLoad?: boolean }) {
  const [keyword, setKeyword] = useState('');
  const [district, setDistrict] = useState<string[]>([]);
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
    setKeyword('');
    setDistrict([]);
    setTypeName('');
    setMinPrice('');
    setMaxPrice('');
    setFeatures({ parkingCar: false, parkingBike: false, evCharging: false, petAllowed: false, foreignerOk: false });
  };

  const [results, setResults] = useState<PublicRoom[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const PAGE_SIZE = 12;

  const buildParams = (pageToLoad: number) => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (district.length) params.set('district', district.join(','));
    if (typeName) params.set('typeName', typeName);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    (Object.keys(features) as FeatureKey[]).forEach(k => {
      if (features[k]) params.set(k, 'true');
    });
    params.set('limit', String(PAGE_SIZE));
    params.set('page', String(pageToLoad));
    return params;
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/public?${buildParams(1).toString()}`);
      if (!res.ok) throw new Error('Không tải được dữ liệu');
      const json = await res.json();
      setResults(json.data || []);
      setTotal(json.pagination?.total || 0);
      setPage(1);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // "Xem thêm" — nạp trang kế tiếp và nối vào danh sách (xem toàn bộ phòng mới nhất)
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetch(`/api/rooms/public?${buildParams(next).toString()}`);
      if (!res.ok) throw new Error('Không tải được dữ liệu');
      const json = await res.json();
      setResults(prev => [...(prev || []), ...(json.data || [])]);
      setTotal(json.pagination?.total || 0);
      setPage(next);
    } catch {
      /* giữ kết quả hiện có nếu lỗi */
    } finally {
      setLoadingMore(false);
    }
  };

  // Trang /phong (autoLoad): tự nạp phòng mới nhất ngay khi mở, không cần bấm "Tìm phòng"
  useEffect(() => {
    if (autoLoad) handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  return (
    <section id="tim-phong" className="relative pt-20 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6 overflow-hidden bg-white scroll-mt-20">
      {/* Ảnh nền cityscape dưới khu tìm kiếm — neo PHẢI (khoe tòa nhà, kể cả mobile),
          phủ trắng NHẸ để chữ vẫn đọc mà ảnh không bị "trắng xoá". Thiếu file → nền trắng (không vỡ). */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-0 pointer-events-none h-[460px] sm:h-[620px] overflow-hidden">
        {/* ảnh nền (thẻ <img> để chắc chắn render + tối ưu). Vị trí ảnh (object-position) có thể do admin chỉnh. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-city.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'right top' }} />
        {/* phủ trắng RẤT nhẹ ở trên (ảnh hiện rõ), đậm dần xuống đáy để tan vào nền trắng */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/15 to-white" />
        {/* thêm chút trắng bên trái nơi có chữ tiêu đề để chữ nổi, phần tòa nhà bên phải giữ rõ */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/35 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-4 sm:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-medium text-brand-700 mb-2 sm:mb-3">
            🔎 Tìm phòng công khai - Không cần đăng nhập
          </div>
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-stone-900">Tìm Phòng Khó Có <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-gold-600">MixStay</span> Lo</h2>
        </div>

        {/* Filter card */}
        <form
          onSubmit={handleSearch}
          className="rounded-2xl bg-white border border-stone-200 p-3 sm:p-4 shadow-sm mb-6"
        >
          {/* Ô TÌM THEO TỪ KHÓA — trên cùng, có nút Tìm ngay (thấy được khi vừa vào, không cần cuộn) */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Tìm theo tên tin, khu vực, mã MS-…"
                aria-label="Tìm phòng theo từ khóa"
                className="input-field pl-9 pr-8 text-sm"
              />
              {keyword && (
                <button type="button" onClick={() => setKeyword('')} aria-label="Xoá từ khóa"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-sm">✕</button>
              )}
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary shrink-0 px-5 sm:px-6 text-sm font-medium">
              {loading ? '…' : 'Tìm'}
            </button>
          </div>

          {/* District pills (hybrid 7 + dropdown) */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Khu vực</label>
            <DistrictPills value={district} onChange={setDistrict} />
          </div>

          {/* Row 1: Kiểu phòng (1/3) + Slider giá (2/3) — mobile stack */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="md:col-span-1">
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

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-stone-500 mb-1">Khoảng giá thuê</label>
              <PriceRangeSlider
                minValue={minPrice}
                maxValue={maxPrice}
                onChange={({ min, max }) => { setMinPrice(min); setMaxPrice(max); }}
              />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-stone-100">
            <div className="flex items-center justify-between mb-1.5 gap-2">
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
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${
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

          {/* Submit ở cuối form — CĂN GIỮA (tránh bị FAB hotline góc phải che) */}
          <div className="mt-3 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full sm:w-auto px-10 py-2.5 text-sm font-medium"
            >
              {loading ? 'Đang tìm...' : 'Tìm phòng'}
            </button>
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
              {total > results.length && <> • đang hiển thị {results.length}</>}
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map(rt => {
                // Trang chi tiết CÔNG KHAI theo id — khách xem không cần đăng nhập.
                const href = `/tin/${rt.id}`;
                return (
                  <Link
                    key={rt.id}
                    href={href}
                    className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-stone-300 transition-all"
                  >
                    <div className="relative">
                      <ListingImageMosaic images={rt.images} videos={rt.videos} videoLinks={rt.videoLinks} alt={rt.name} className="h-48" />
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
                        Xem chi tiết phòng →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Xem thêm — nạp tiếp phòng mới nhất (phân trang nối, không cần đăng nhập) */}
            {results.length < total && (
              <div className="text-center mt-8">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-medium text-sm bg-white border border-stone-300 text-stone-700 hover:border-brand-400 hover:text-brand-700 hover:shadow-sm transition-all disabled:opacity-60"
                >
                  {loadingMore ? 'Đang tải...' : `Xem thêm phòng (${results.length}/${total})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
