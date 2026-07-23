'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ListingImageMosaic from '@/components/ui/ListingImageMosaic';
import { formatCurrency } from '@/lib/utils';
import DistrictPills from '@/components/ui/DistrictPills';
import PriceRangeSlider from '@/components/ui/PriceRangeSlider';
import { HANOI_UNIVERSITIES } from '@/lib/hanoi-locations';

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
  distanceKm?: number; // có khi lọc "gần trường ĐH"
  uniShort?: string;
};

type Filters = {
  keyword: string;
  district: string[];
  typeName: string;
  minPrice: string;
  maxPrice: string;
  uni: string; // lọc "gần trường ĐH" (short name trong HANOI_UNIVERSITIES)
  features: Record<FeatureKey, boolean>;
};

const EMPTY_FEATURES: Record<FeatureKey, boolean> = {
  parkingCar: false, parkingBike: false, evCharging: false, petAllowed: false, foreignerOk: false,
};
const EMPTY_FILTERS: Filters = {
  keyword: '', district: [], typeName: '', minPrice: '', maxPrice: '', uni: '', features: EMPTY_FEATURES,
};
const FEATURE_KEYS = Object.keys(EMPTY_FEATURES) as FeatureKey[];
const URL_KEYS = ['q', 'district', 'typeName', 'minPrice', 'maxPrice', 'uni', 'p', ...FEATURE_KEYS];

// Bộ lọc -> query string (dùng cho cả URL trình duyệt lẫn gọi API)
const filtersToQuery = (f: Filters) => {
  const p = new URLSearchParams();
  if (f.keyword.trim()) p.set('q', f.keyword.trim());
  if (f.district.length) p.set('district', f.district.join(','));
  if (f.typeName) p.set('typeName', f.typeName);
  if (f.minPrice) p.set('minPrice', f.minPrice);
  if (f.maxPrice) p.set('maxPrice', f.maxPrice);
  if (f.uni) p.set('uni', f.uni);
  FEATURE_KEYS.forEach(k => { if (f.features[k]) p.set(k, 'true'); });
  return p;
};

const queryToFilters = (search: string) => {
  const sp = new URLSearchParams(search);
  const features = { ...EMPTY_FEATURES };
  FEATURE_KEYS.forEach(k => { if (sp.get(k) === 'true') features[k] = true; });
  const filters: Filters = {
    keyword: sp.get('q') || '',
    district: (sp.get('district') || '').split(',').map(s => s.trim()).filter(Boolean),
    typeName: sp.get('typeName') || '',
    minPrice: sp.get('minPrice') || '',
    maxPrice: sp.get('maxPrice') || '',
    uni: sp.get('uni') || '',
    features,
  };
  const pagesLoaded = Math.max(1, parseInt(sp.get('p') || '1', 10) || 1);
  return { filters, pagesLoaded, hasQuery: URL_KEYS.some(k => sp.has(k)) };
};

const SCROLL_KEY = 'mixstay:search-scroll';

export default function PublicSearch({ autoLoad = false }: { autoLoad?: boolean }) {
  const [keyword, setKeyword] = useState('');
  const [district, setDistrict] = useState<string[]>([]);
  const [typeName, setTypeName] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [uni, setUni] = useState('');
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    parkingCar: false,
    parkingBike: false,
    evCharging: false,
    petAllowed: false,
    foreignerOk: false,
  });

  // Tìm bằng AI (ngôn ngữ tự nhiên) — AI chỉ ĐỔ BỘ LỌC, khách thấy và sửa được rồi mới tìm
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Săn phòng — khách để lại SĐT + tiêu chí hiện tại, có phòng mới khớp sẽ được gọi lại
  const [huntOpen, setHuntOpen] = useState(false);
  const [huntPhone, setHuntPhone] = useState('');
  const [huntName, setHuntName] = useState('');
  const [huntState, setHuntState] = useState<'' | 'sending' | 'done' | 'error'>('');

  const toggleFeature = (key: FeatureKey) =>
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));

  const resetFilters = () => {
    setKeyword('');
    setDistrict([]);
    setTypeName('');
    setMinPrice('');
    setMaxPrice('');
    setUni('');
    setFeatures(EMPTY_FEATURES);
    // Đang có kết quả → tìm lại không lọc (URL cũng được dọn theo) để URL luôn khớp danh sách đang hiện
    if (searched) runSearch(EMPTY_FILTERS, 1);
    else syncUrl(EMPTY_FILTERS, 1);
  };

  const [results, setResults] = useState<PublicRoom[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const PAGE_SIZE = 12;
  // API kẹp limit ở 100 → khôi phục tối đa 8 trang (96 tin) trong 1 lần gọi, "Xem thêm" chạy tiếp từ đó
  const MAX_RESTORE_PAGES = 8;

  const currentFilters = (): Filters => ({ keyword, district, typeName, minPrice, maxPrice, uni, features });

  // Gọi AI bóc câu mô tả nhu cầu → đổ vào bộ lọc rồi tìm luôn (khách vẫn chỉnh lại được)
  const runAiSearch = async () => {
    const text = aiText.trim();
    if (text.length < 5 || aiLoading) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI đang bận, thử lại nhé');
      const f: Filters = {
        keyword: json.keyword || '',
        district: json.districts || [],
        typeName: json.typeName || '',
        minPrice: json.minPrice ? String(json.minPrice) : '',
        maxPrice: json.maxPrice ? String(json.maxPrice) : '',
        uni: json.uni || '',
        features: {
          ...EMPTY_FEATURES,
          parkingCar: !!json.parkingCar, petAllowed: !!json.petAllowed,
          foreignerOk: !!json.foreignerOk, evCharging: !!json.evCharging,
        },
      };
      setKeyword(f.keyword); setDistrict(f.district); setTypeName(f.typeName);
      setMinPrice(f.minPrice); setMaxPrice(f.maxPrice); setUni(f.uni); setFeatures(f.features);
      runSearch(f, 1);
    } catch (err: any) {
      setAiError(err.message || 'Có lỗi, dùng bộ lọc thường nhé');
    } finally {
      setAiLoading(false);
    }
  };

  // Gửi yêu cầu "săn phòng" với tiêu chí đang lọc
  const submitHunt = async () => {
    const phone = huntPhone.replace(/\D/g, '');
    if (!/^0\d{9}$/.test(phone)) { setHuntState('error'); return; }
    setHuntState('sending');
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone, name: huntName.trim(),
          district: district.join(','), typeName,
          minPrice: minPrice ? Number(minPrice) : null,
          maxPrice: maxPrice ? Number(maxPrice) : null,
          note: [uni ? `gần ${uni}` : '', keyword].filter(Boolean).join(' · '),
        }),
      });
      if (!res.ok) throw new Error();
      setHuntState('done');
    } catch { setHuntState('error'); }
  };

  // Ghi bộ lọc + số trang đã tải vào URL (replaceState: không tạo history entry mới, không cuộn trang).
  // Nhờ vậy khi khách bấm vào 1 phòng rồi Back, URL vẫn còn bộ lọc → khôi phục lại được kết quả.
  const syncUrl = (f: Filters, pagesLoaded: number) => {
    const params = filtersToQuery(f);
    if (pagesLoaded > 1) params.set('p', String(pagesLoaded));
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(window.history.state, '', url);
  };

  const pendingScroll = useRef<number | null>(null);

  // Nhận filters làm tham số (không đọc state) để dùng được cả lúc khôi phục từ URL lúc mount.
  const runSearch = async (f: Filters, pagesToLoad = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = filtersToQuery(f);
      params.set('page', '1');
      params.set('limit', String(PAGE_SIZE * pagesToLoad)); // gộp N trang vào 1 request khi khôi phục
      const res = await fetch(`/api/rooms/public?${params.toString()}`);
      if (!res.ok) throw new Error('Không tải được dữ liệu');
      const json = await res.json();
      setResults(json.data || []);
      setTotal(json.pagination?.total || 0);
      setPage(pagesToLoad);
      setSearched(true);
      syncUrl(f, pagesToLoad);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
      setResults([]);
      pendingScroll.current = null;
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    runSearch(currentFilters(), 1);
  };

  // "Xem thêm" — nạp trang kế tiếp và nối vào danh sách (xem toàn bộ phòng mới nhất)
  const loadMore = async () => {
    if (loadingMore || loading || !results || results.length >= total) return; // chống gọi trùng (infinite scroll)
    setLoadingMore(true);
    try {
      const next = page + 1;
      const f = currentFilters();
      const params = filtersToQuery(f);
      params.set('page', String(next));
      params.set('limit', String(PAGE_SIZE));
      const res = await fetch(`/api/rooms/public?${params.toString()}`);
      if (!res.ok) throw new Error('Không tải được dữ liệu');
      const json = await res.json();
      setResults(prev => [...(prev || []), ...(json.data || [])]);
      setTotal(json.pagination?.total || 0);
      setPage(next);
      syncUrl(f, next);
    } catch {
      /* giữ kết quả hiện có nếu lỗi */
    } finally {
      setLoadingMore(false);
    }
  };

  // Infinite scroll: tự nạp thêm khi cuộn tới gần cuối — khỏi bấm "Xem thêm".
  const hasMore = !!results && results.length < total;
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMoreRef.current(); },
      { rootMargin: '600px' } // nạp trước khi chạm đáy ~600px cho mượt
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  // Lưu vị trí cuộn ngay trước khi rời sang trang chi tiết phòng
  const rememberScroll = () => {
    try {
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify({
        url: window.location.pathname + window.location.search,
        y: window.scrollY,
      }));
    } catch { /* private mode: bỏ qua */ }
  };

  // Mount: khôi phục bộ lọc từ URL (khi Back từ trang chi tiết) — hoặc autoLoad cho trang /phong
  useEffect(() => {
    const { filters, pagesLoaded, hasQuery } = queryToFilters(window.location.search);

    try {
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) {
        sessionStorage.removeItem(SCROLL_KEY);
        const s = JSON.parse(saved);
        if (s?.url === window.location.pathname + window.location.search) pendingScroll.current = s.y;
      }
    } catch { /* bỏ qua */ }

    if (hasQuery) {
      setKeyword(filters.keyword);
      setDistrict(filters.district);
      setTypeName(filters.typeName);
      setMinPrice(filters.minPrice);
      setMaxPrice(filters.maxPrice);
      setUni(filters.uni);
      setFeatures(filters.features);
      runSearch(filters, Math.min(MAX_RESTORE_PAGES, pagesLoaded));
    } else if (autoLoad) {
      runSearch(EMPTY_FILTERS, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  // Kết quả đã render xong → cuộn về đúng chỗ khách đang xem trước khi bấm vào phòng
  useEffect(() => {
    if (!results || pendingScroll.current == null) return;
    const y = pendingScroll.current;
    pendingScroll.current = null;
    requestAnimationFrame(() => window.scrollTo(0, y));
    const t = setTimeout(() => window.scrollTo(0, y), 150); // ảnh load xong, chiều cao đổi → chỉnh lại
    return () => clearTimeout(t);
  }, [results]);

  return (
    <section id="tim-phong" className="relative pt-20 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6 overflow-hidden bg-white scroll-mt-20">
      {/* Ảnh nền cityscape dưới khu tìm kiếm — neo PHẢI (khoe tòa nhà, kể cả mobile),
          phủ trắng NHẸ để chữ vẫn đọc mà ảnh không bị "trắng xoá". Thiếu file → nền trắng (không vỡ). */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-0 pointer-events-none h-[880px] sm:h-[760px] overflow-hidden">
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
          className="rounded-2xl bg-white/40 border border-white/50 shadow-md p-3 sm:p-4 mb-6"
        >
          {/* ✨ TÌM BẰNG AI — khách mô tả nhu cầu 1 câu, AI đổ vào bộ lọc bên dưới (sửa được) */}
          <div className="mb-3 rounded-xl bg-gradient-to-r from-violet-50 to-brand-50 border border-violet-100 p-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiText}
                onChange={e => setAiText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runAiSearch(); } }}
                placeholder="✨ Mô tả phòng bạn cần… VD: phòng dưới 4 triệu gần ĐH Thương Mại, nuôi mèo được"
                aria-label="Tìm phòng bằng AI"
                className="input-field text-sm flex-1 bg-white/80"
              />
              <button type="button" onClick={runAiSearch} disabled={aiLoading || aiText.trim().length < 5}
                className="shrink-0 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-brand-600 disabled:opacity-50 hover:shadow-md transition-all">
                {aiLoading ? 'AI đang đọc…' : 'Tìm bằng AI'}
              </button>
            </div>
            {aiError && <p className="text-xs text-red-500 mt-1.5">{aiError}</p>}
          </div>

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

          {/* Row 1: Kiểu phòng + Gần trường ĐH (sắp theo khoảng cách) + Slider giá — mobile stack */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
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

            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">🎓 Gần trường ĐH</label>
              <select
                className="input-field text-sm"
                value={uni}
                onChange={e => setUni(e.target.value)}
              >
                <option value="">Không chọn</option>
                {HANOI_UNIVERSITIES.map(u => <option key={u.short} value={u.short}>{u.name}</option>)}
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

          {/* Submit ở cuối form — CĂN GIỮA (tránh bị FAB hotline góc phải che).
              Kèm nút "Tìm theo bản đồ" to ngang nút Tìm phòng để mobile dễ thấy lối vào bản đồ. */}
          {/* 2 nút cạnh nhau, căn giữa (mobile chia đôi hàng) */}
          <div className="mt-3 grid grid-cols-2 sm:flex sm:justify-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary sm:w-auto px-4 sm:px-10 py-2.5 text-sm font-medium"
            >
              {loading ? 'Đang tìm...' : 'Tìm phòng'}
            </button>
            <Link
              href="/ban-do"
              className="inline-flex items-center justify-center rounded-xl px-3 sm:px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-brand-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              Tìm theo bản đồ
            </Link>
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

        {/* 🔔 SĂN PHÒNG: khách để lại SĐT + tiêu chí đang lọc — có phòng mới khớp sẽ được gọi lại.
            Hiện sau khi đã tìm (đặc biệt hữu ích khi 0 kết quả). */}
        {searched && !loading && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            {huntState === 'done' ? (
              <p className="text-sm text-amber-800 text-center font-medium">
                ✅ Đã nhận yêu cầu săn phòng! Khi có phòng khớp tiêu chí, MixStay sẽ gọi/Zalo cho bạn ngay.
              </p>
            ) : !huntOpen ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">🔔 Chưa ưng phòng nào?</span> Để lại SĐT — có phòng mới đúng tiêu chí này, chúng tôi chủ động báo bạn.
                </p>
                <button type="button" onClick={() => setHuntOpen(true)}
                  className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors">
                  Săn phòng giúp tôi
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-amber-700 mb-1">Tên bạn (tuỳ chọn)</label>
                  <input type="text" value={huntName} onChange={e => setHuntName(e.target.value)}
                    className="input-field text-sm" placeholder="VD: Anh Nam" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-amber-700 mb-1">SĐT/Zalo *</label>
                  <input type="tel" value={huntPhone} onChange={e => { setHuntPhone(e.target.value); if (huntState === 'error') setHuntState(''); }}
                    className="input-field text-sm" placeholder="09xxxxxxxx" />
                </div>
                <button type="button" onClick={submitHunt} disabled={huntState === 'sending'}
                  className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 transition-colors">
                  {huntState === 'sending' ? 'Đang gửi…' : 'Đăng ký'}
                </button>
              </div>
            )}
            {huntState === 'error' && huntOpen && (
              <p className="text-xs text-red-500 mt-1.5">SĐT chưa đúng (10 số, bắt đầu bằng 0) hoặc lỗi mạng — thử lại nhé.</p>
            )}
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
                    onClick={rememberScroll}
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
                      {rt.distanceKm != null && (
                        <p className="text-xs font-medium text-violet-600 mt-1">🎓 Cách {rt.uniShort || 'trường'} ~{rt.distanceKm}km</p>
                      )}

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

            {/* Infinite scroll: sentinel tự nạp thêm khi cuộn tới; nút chỉ là dự phòng (list quá ngắn) */}
            {hasMore && (
              <div ref={sentinelRef} className="text-center mt-8">
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2 text-sm text-stone-500">
                    <svg className="w-4 h-4 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" /></svg>
                    Đang tải thêm phòng…
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={loadMore}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-medium text-sm bg-white border border-stone-300 text-stone-700 hover:border-brand-400 hover:text-brand-700 hover:shadow-sm transition-all"
                  >
                    Xem thêm phòng ({results.length}/{total})
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
