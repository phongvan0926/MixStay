'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCurrency } from '@/lib/utils';
import { HANOI_UNIVERSITIES } from '@/lib/hanoi-locations';

/**
 * Bản đồ tìm phòng (public). Pin đặt ĐÚNG vị trí tòa nhà nhưng thông tin chỉ tới
 * mức tên tòa + phố + quận (không số nhà) — đúng mức khách được thấy ở trang tin đăng.
 * - Zoom xa (< CLUSTER_ZOOM): gom theo QUẬN thành bong bóng "Cầu Giấy · N tin" → bấm để phóng tới.
 * - Zoom gần: pin từng tòa hiện GIÁ TỪ → bấm mở popup danh sách tin, link sang /tin/[id].
 * - Chọn quận (chip trên cùng) → phóng tới + TÔ NỔI BẬT các tòa trong quận, mờ các tòa khác.
 * - Ghim vị trí bất kỳ (Tìm kiếm theo địa điểm / địa chỉ / click trên bản đồ / trường ĐH) + bán kính nấc 500m
 *   → vẽ vòng tròn quanh điểm ghim, lọc/tô nổi bật tòa trong bán kính.
 */

type MapListing = {
  id: string; name: string; typeName: string; priceMonthly: number;
  areaSqm: number; status: string; availableUnits: number; image: string | null;
};
type MapProperty = {
  id: string; name: string; district: string; streetName: string;
  lat: number; lng: number; minPrice: number | null; listings: MapListing[];
};

type CustomPin = {
  label: string;
  lat: number;
  lng: number;
};

type SuggestionItem = {
  label: string;
  sublabel?: string;
  lat: number;
  lng: number;
};

const HANOI_CENTER: [number, number] = [21.0285, 105.8048];
const CLUSTER_ZOOM = 14; // dưới mức này gom theo quận

// Khoảng cách 2 điểm (km) — haversine
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, dLa = (bLat - aLat) * Math.PI / 180, dLo = (bLng - aLng) * Math.PI / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// 5500000 → "5,5tr" — nhãn pin phải thật ngắn
function priceShort(n: number | null): string {
  if (!n) return '?';
  const tr = n / 1_000_000;
  return `${(Math.round(tr * 10) / 10).toLocaleString('vi-VN')}tr`;
}

// dim=true → pin mờ đi (không thuộc quận/bán kính đang chọn); highlight=true → nổi bật (xanh lá, to hơn)
function pinIcon(label: string, opts?: { dim?: boolean; highlight?: boolean }) {
  const bg = opts?.highlight ? '#059669' : '#1d4ed8';
  const opacity = opts?.dim ? 0.35 : 1;
  const scale = opts?.highlight ? 1.12 : 1;
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-100%) scale(${scale});opacity:${opacity};display:inline-flex;flex-direction:column;align-items:center;">
      <span style="background:${bg};color:#fff;font-weight:700;font-size:12px;line-height:1;padding:6px 9px;border-radius:9999px;box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:nowrap;border:2px solid #fff;">${label}</span>
      <span style="width:2px;height:7px;background:${bg};"></span>
    </div>`,
    iconSize: [0, 0],
  });
}

function clusterIcon(district: string, count: number, active?: boolean) {
  const border = active ? '#059669' : '#1d4ed8';
  const badge = active ? '#059669' : '#1d4ed8';
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:6px;background:#fff;border:2px solid ${border};border-radius:9999px;padding:7px 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);white-space:nowrap;">
      <span style="font-weight:700;font-size:12px;color:#1c1917;">${district}</span>
      <span style="background:${badge};color:#fff;font-weight:700;font-size:11px;border-radius:9999px;padding:2px 7px;">${count}</span>
    </div>`,
    iconSize: [0, 0],
  });
}

function customPinIcon(label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-100%);display:inline-flex;align-items:center;gap:4px;background:#dc2626;color:#fff;font-weight:700;font-size:12px;padding:6px 12px;border-radius:9999px;box-shadow:0 4px 14px rgba(220,38,38,.45);white-space:nowrap;border:2px solid #fff;z-index:1000;">
      📍 <span>${label}</span>
    </div>`,
    iconSize: [0, 0],
  });
}

const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1N1K', '2k1n': '2N1K', studio: 'Studio', duplex: 'Duplex',
};

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ target }: { target: { center: [number, number]; zoom: number } | null }) {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo(target.center, target.zoom, { duration: 0.8 }); }, [target, map]);
  return null;
}

export default function MapClient() {
  const [props, setProps] = useState<MapProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(12);
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  // Điểm ghim tuỳ chỉnh & Bán kính (step 0.5km = 500m)
  const [customPin, setCustomPin] = useState<CustomPin | null>(null);
  const [radiusKm, setRadiusKm] = useState(2.0); // Mặc định 2km, nấc 0.5km (500m)
  const [filterByRadius, setFilterByRadius] = useState(true);

  // Ô tìm kiếm địa điểm / địa chỉ
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/rooms/map')
      .then(r => r.json())
      .then(j => setProps((j.data || []).filter((p: MapProperty) => p.lat && p.lng)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Xử lý gợi ý tìm kiếm địa điểm (Local Universities + Nominatim OpenStreetMap API)
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 1. Tìm local từ danh sách trường ĐH
    const localUnis = HANOI_UNIVERSITIES.filter(
      u => u.name.toLowerCase().includes(q) || u.short.toLowerCase().includes(q)
    ).map(u => ({
      label: `🎓 ${u.name}`,
      sublabel: `Trường đại học (${u.short})`,
      lat: u.lat,
      lng: u.lng,
    }));

    setSuggestions(localUnis);
    setShowSuggestions(true);

    // 2. Debounce gọi Nominatim OpenStreetMap API cho địa chỉ bất kỳ
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (q.length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        const queryTerm = q.includes('hà nội') ? q : `${q}, Hà Nội`;
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryTerm)}&limit=5&countrycodes=vn`)
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) {
              const remoteList: SuggestionItem[] = data.map((item: any) => ({
                label: item.display_name.split(',')[0] || item.display_name,
                sublabel: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
              }));

              // Gộp kết quả local ĐH + Nominatim (lọc trùng)
              setSuggestions(prev => {
                const existingLabels = new Set(prev.map(p => p.label));
                const filteredRemote = remoteList.filter(r => !existingLabels.has(r.label));
                return [...prev, ...filteredRemote];
              });
            }
          })
          .catch(() => {})
          .finally(() => setIsSearching(false));
      }, 400);
    }
  }, [searchQuery]);

  // Gom theo quận: tâm = trung bình toạ độ các tòa, đếm tổng số tin
  const districts = useMemo(() => {
    const g: Record<string, { lat: number; lng: number; n: number; listings: number }> = {};
    for (const p of props) {
      const d = (g[p.district] ||= { lat: 0, lng: 0, n: 0, listings: 0 });
      d.lat += p.lat; d.lng += p.lng; d.n += 1; d.listings += p.listings.length;
    }
    return Object.entries(g).map(([district, v]) => ({
      district, lat: v.lat / v.n, lng: v.lng / v.n, buildings: v.n, listings: v.listings,
    })).sort((a, b) => b.listings - a.listings);
  }, [props]);

  // Gắn khoảng cách tới điểm ghim cho từng tòa
  const propsWithDist = useMemo(() => {
    if (!customPin) return props.map(p => ({ ...p, dist: null as number | null }));
    return props.map(p => ({ ...p, dist: distanceKm(p.lat, p.lng, customPin.lat, customPin.lng) }));
  }, [props, customPin]);

  // Danh sách tòa để vẽ pin: nếu đang lọc theo bán kính thì chỉ giữ tòa trong vòng
  const visibleProps = useMemo(() => {
    if (customPin && filterByRadius) return propsWithDist.filter(p => p.dist != null && p.dist <= radiusKm);
    return propsWithDist;
  }, [propsWithDist, customPin, filterByRadius, radiusKm]);

  const pickDistrict = (d: { district: string; lat: number; lng: number }) => {
    setSelectedDistrict(d.district);
    setFlyTarget({ center: [d.lat, d.lng], zoom: CLUSTER_ZOOM });
  };

  const selectSuggestion = (item: SuggestionItem) => {
    const cleanLabel = item.label.replace(/^🎓\s*/, '');
    setCustomPin({ label: cleanLabel, lat: item.lat, lng: item.lng });
    setSelectedDistrict(null);
    setShowSuggestions(false);
    setSearchQuery(cleanLabel);
    setFlyTarget({ center: [item.lat, item.lng], zoom: 15 });
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCustomPin({ label: 'Vị trí đã ghim', lat, lng });
    setSelectedDistrict(null);
    setFlyTarget({ center: [lat, lng], zoom: Math.max(zoom, 14) });
  };

  const clearCustomPin = () => {
    setCustomPin(null);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Khi đang lọc theo bán kính (đã có điểm ghim) → luôn hiện pin từng tòa, không gom cụm.
  const clustered = zoom < CLUSTER_ZOOM && !(customPin && filterByRadius);
  const inRadiusCount = customPin ? propsWithDist.filter(p => p.dist != null && p.dist <= radiusKm).length : 0;
  const inRadiusListingsCount = customPin
    ? propsWithDist.filter(p => p.dist != null && p.dist <= radiusKm).reduce((acc, p) => acc + p.listings.length, 0)
    : 0;

  return (
    <div className="relative h-full w-full font-sans">
      {/* Thanh chọn nhanh quận (nằm sát trên cùng) */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-1.5 overflow-x-auto pb-1 pointer-events-none">
        {districts.slice(0, 12).map(d => (
          <button key={d.district}
            onClick={() => pickDistrict(d)}
            className={`pointer-events-auto shrink-0 rounded-full backdrop-blur border shadow-sm px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedDistrict === d.district
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white/95 border-stone-200 text-stone-700 hover:border-brand-400 hover:text-brand-700'
            }`}>
            {d.district} <span className={selectedDistrict === d.district ? 'font-bold' : 'text-brand-600 font-bold'}>{d.listings}</span>
          </button>
        ))}
        {selectedDistrict && (
          <button onClick={() => setSelectedDistrict(null)}
            className="pointer-events-auto shrink-0 rounded-full bg-stone-800 text-white px-3 py-1.5 text-xs font-medium">
            ✕ Bỏ chọn quận
          </button>
        )}
      </div>

      {/* Panel Tìm kiếm địa điểm & Thanh kéo bán kính nấc 500m (nằm ở dưới) */}
      <div className="absolute bottom-4 left-3 right-3 z-[1000] flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg rounded-2xl bg-white/95 backdrop-blur border border-stone-200 shadow-xl p-3">
          
          {/* Ô nhập tìm địa điểm bất kỳ + Dropdown gợi ý */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
              <span className="text-base shrink-0">📍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                placeholder="Gõ địa điểm (ĐH Bách Khoa, Ngã Tư Sở, 88 Láng Hạ...)"
                className="w-full text-sm outline-none bg-transparent placeholder-stone-400 text-stone-800"
              />
              {isSearching && (
                <span className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              {(searchQuery || customPin) && (
                <button
                  onClick={clearCustomPin}
                  className="shrink-0 text-xs text-stone-400 hover:text-stone-700 font-bold p-1"
                  title="Xóa điểm ghim"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Menu danh sách gợi ý địa điểm / địa chỉ */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 bottom-full mb-2 bg-white rounded-xl border border-stone-200 shadow-xl max-h-56 overflow-y-auto z-[1010] p-1">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(item)}
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 rounded-lg transition-colors flex flex-col"
                  >
                    <span className="text-xs font-semibold text-stone-800">{item.label}</span>
                    {item.sublabel && <span className="text-[11px] text-stone-400 truncate">{item.sublabel}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thanh kéo bán kính (Slider min=0.5km, max=10km, step=0.5km / 500m) */}
          {customPin && (
            <div className="mt-3 pt-2.5 border-t border-stone-100">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-medium text-stone-600 flex items-center gap-1">
                  📏 Bán kính tìm kiếm:
                </span>
                <span className="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                  {radiusKm < 1 ? `${radiusKm * 1000}m (0.5km)` : `${radiusKm} km`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={radiusKm}
                  onChange={e => setRadiusKm(Number(e.target.value))}
                  className="flex-1 accent-brand-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
                />
                <label className="flex items-center gap-1.5 text-xs text-stone-700 shrink-0 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={filterByRadius}
                    onChange={e => setFilterByRadius(e.target.checked)}
                    className="accent-brand-600 rounded"
                  />
                  Chỉ hiện trong bán kính
                </label>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                <p className="truncate">
                  📍 Đang ghim: <b className="text-stone-800">{customPin.label}</b>
                </p>
                <p className="shrink-0 font-medium">
                  <b className="text-emerald-600">{inRadiusCount}</b> tòa (<b className="text-brand-600">{inRadiusListingsCount}</b> tin)
                </p>
              </div>
            </div>
          )}

          {!customPin && (
            <p className="mt-2 text-[11px] text-stone-400 text-center">
              💡 Gõ tên địa điểm ở trên hoặc <b>bấm trực tiếp lên bản đồ</b> để ghim vị trí & kéo bán kính tìm phòng!
            </p>
          )}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-white/60">
          <p className="text-sm font-medium text-stone-600 bg-white rounded-xl border border-stone-200 shadow px-4 py-2">Đang tải bản đồ phòng…</p>
        </div>
      )}

      <MapContainer center={HANOI_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomWatcher onZoom={setZoom} />
        <MapClickHandler onMapClick={handleMapClick} />
        <FlyTo target={flyTarget} />

        {/* Vòng tròn bán kính bao quanh điểm ghim tùy chỉnh */}
        {customPin && (
          <Circle
            center={[customPin.lat, customPin.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.12, weight: 2 }}
          />
        )}

        {/* Marker cho điểm ghim tùy chỉnh */}
        {customPin && (
          <Marker
            position={[customPin.lat, customPin.lng]}
            icon={customPinIcon(customPin.label)}
            zIndexOffset={1000}
          />
        )}

        {/* Zoom xa: bong bóng quận (ẩn khi đang có điểm ghim + lọc bán kính) */}
        {clustered && districts.map(d => (
          <Marker key={d.district} position={[d.lat, d.lng]} icon={clusterIcon(d.district, d.listings, selectedDistrict === d.district)}
            eventHandlers={{ click: () => pickDistrict(d) }} />
        ))}

        {/* Zoom gần: pin từng tòa */}
        {!clustered && visibleProps.map(p => {
          const inRadius = customPin ? (p.dist != null && p.dist <= radiusKm) : true;
          const inDistrict = selectedDistrict ? p.district === selectedDistrict : true;
          // Nổi bật khi thuộc quận đang chọn hoặc trong bán kính điểm ghim (khi không lọc cứng)
          const highlight = (!!selectedDistrict && inDistrict) || (!!customPin && !filterByRadius && inRadius);
          const dim = (!!selectedDistrict && !inDistrict) || (!!customPin && !filterByRadius && !inRadius);
          return (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(priceShort(p.minPrice), { dim, highlight })}
              zIndexOffset={highlight ? 300 : 0}>
              <Popup maxWidth={340} minWidth={280}>
                <div style={{ fontFamily: 'inherit' }}>
                  {/* Ảnh tòa to hơn: banner ngang trên đầu popup */}
                  {p.listings[0]?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.listings[0].image} alt="" className="w-full h-32 rounded-lg object-cover mb-2" loading="lazy" />
                  )}
                  <p className="font-bold text-sm text-stone-900 mb-0.5">{p.name}</p>
                  <p className="text-xs text-stone-500 mb-2">
                    📍 {p.streetName ? `${p.streetName} • ` : ''}{p.district}
                    {p.dist != null && <span className="text-red-600 font-semibold"> • cách ghim {p.dist < 1 ? `${(p.dist * 1000).toFixed(0)}m` : `${p.dist.toFixed(1)}km`}</span>}
                  </p>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {p.listings.map(l => (
                      <a key={l.id} href={`/tin/${l.id}`} target="_blank" rel="noopener"
                        className="flex items-center gap-2 rounded-lg border border-stone-200 p-1.5 hover:border-brand-400 transition-colors no-underline">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {l.image
                          ? <img src={l.image} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" loading="lazy" />
                          : <span className="w-12 h-12 rounded-md bg-stone-100 flex items-center justify-center shrink-0">🚪</span>}
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-stone-800 truncate">{l.name}</span>
                          <span className="block text-[11px] text-stone-500">
                            {TYPE_LABEL[l.typeName] || l.typeName} · {l.areaSqm}m² ·{' '}
                            <b className="text-brand-600">{formatCurrency(l.priceMonthly)}</b>
                            {l.status === 'UPCOMING' && <span className="text-amber-600"> · sắp trống</span>}
                          </span>
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
