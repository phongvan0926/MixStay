'use client';
import { useEffect, useMemo, useState } from 'react';
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
 * - Chọn trường đại học + bán kính → vẽ vòng tròn quanh trường, lọc/hoặc tô nổi bật tòa trong bán kính
 *   (giúp sinh viên tìm phòng gần trường).
 */

type MapListing = {
  id: string; name: string; typeName: string; priceMonthly: number;
  areaSqm: number; status: string; availableUnits: number; image: string | null;
};
type MapProperty = {
  id: string; name: string; district: string; streetName: string;
  lat: number; lng: number; minPrice: number | null; listings: MapListing[];
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

function uniIcon(label: string, active?: boolean) {
  const bg = active ? '#b91c1c' : '#7c3aed';
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-100%);display:inline-flex;align-items:center;gap:4px;background:${bg};color:#fff;font-weight:700;font-size:11px;padding:4px 8px;border-radius:9999px;box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:nowrap;border:2px solid #fff;">
      🎓 <span>${label}</span>
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

  // Bộ lọc theo trường đại học
  const [uniIdx, setUniIdx] = useState<number>(-1); // -1 = chưa chọn trường
  const [radiusKm, setRadiusKm] = useState(2);
  const [filterByRadius, setFilterByRadius] = useState(true);
  const selectedUni = uniIdx >= 0 ? HANOI_UNIVERSITIES[uniIdx] : null;

  useEffect(() => {
    fetch('/api/rooms/map')
      .then(r => r.json())
      .then(j => setProps((j.data || []).filter((p: MapProperty) => p.lat && p.lng)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  // Gắn khoảng cách tới trường đang chọn cho từng tòa
  const propsWithDist = useMemo(() => {
    if (!selectedUni) return props.map(p => ({ ...p, dist: null as number | null }));
    return props.map(p => ({ ...p, dist: distanceKm(p.lat, p.lng, selectedUni.lat, selectedUni.lng) }));
  }, [props, selectedUni]);

  // Danh sách tòa để vẽ pin: nếu đang lọc theo bán kính thì chỉ giữ tòa trong vòng
  const visibleProps = useMemo(() => {
    if (selectedUni && filterByRadius) return propsWithDist.filter(p => p.dist != null && p.dist <= radiusKm);
    return propsWithDist;
  }, [propsWithDist, selectedUni, filterByRadius, radiusKm]);

  const pickDistrict = (d: { district: string; lat: number; lng: number }) => {
    setSelectedDistrict(d.district);
    setFlyTarget({ center: [d.lat, d.lng], zoom: CLUSTER_ZOOM });
  };

  const pickUni = (idx: number) => {
    setUniIdx(idx);
    if (idx >= 0) {
      const u = HANOI_UNIVERSITIES[idx];
      setSelectedDistrict(null);
      setFlyTarget({ center: [u.lat, u.lng], zoom: 15 }); // zoom gần để hiện pin từng tòa
    }
  };

  // Khi đang lọc theo bán kính (đã chọn trường) → luôn hiện pin từng tòa, không gom cụm.
  const clustered = zoom < CLUSTER_ZOOM && !(selectedUni && filterByRadius);
  const inRadiusCount = selectedUni ? propsWithDist.filter(p => p.dist != null && p.dist <= radiusKm).length : 0;

  return (
    <div className="relative h-full w-full">
      {/* Thanh chọn nhanh quận */}
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

      {/* Panel tìm quanh trường đại học */}
      <div className="absolute bottom-4 left-3 right-3 z-[1000] flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg rounded-2xl bg-white/95 backdrop-blur border border-stone-200 shadow-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm shrink-0">🎓</span>
            <select
              value={uniIdx}
              onChange={e => pickUni(Number(e.target.value))}
              className="flex-1 min-w-0 text-sm rounded-lg border border-stone-200 px-2 py-1.5 bg-white"
            >
              <option value={-1}>Tìm phòng gần trường đại học…</option>
              {HANOI_UNIVERSITIES.map((u, i) => <option key={u.name} value={i}>{u.name}</option>)}
            </select>
            {selectedUni && (
              <button onClick={() => setUniIdx(-1)} className="shrink-0 text-xs text-stone-500 hover:text-stone-700 px-1">✕</button>
            )}
          </div>
          {selectedUni && (
            <div className="mt-2.5 flex items-center gap-3">
              <input
                type="range" min={0.5} max={5} step={0.5} value={radiusKm}
                onChange={e => setRadiusKm(Number(e.target.value))}
                className="flex-1 accent-brand-600"
              />
              <span className="text-xs font-semibold text-stone-700 shrink-0 w-16 text-right">{radiusKm} km</span>
              <label className="flex items-center gap-1.5 text-xs text-stone-600 shrink-0 cursor-pointer">
                <input type="checkbox" checked={filterByRadius} onChange={e => setFilterByRadius(e.target.checked)} className="accent-brand-600" />
                Chỉ trong bán kính
              </label>
            </div>
          )}
          {selectedUni && (
            <p className="mt-1.5 text-[11px] text-stone-500">
              <b className="text-emerald-700">{inRadiusCount}</b> tòa trong {radiusKm}km quanh {selectedUni.short}
              {!filterByRadius && ' (các tòa khác vẫn hiện, mờ hơn)'}
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
        <FlyTo target={flyTarget} />

        {/* Vòng bán kính quanh trường đang chọn */}
        {selectedUni && (
          <Circle
            center={[selectedUni.lat, selectedUni.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.08, weight: 1.5 }}
          />
        )}

        {/* Marker các trường đại học (luôn hiện để sinh viên định vị) */}
        {HANOI_UNIVERSITIES.map((u, i) => (
          <Marker key={u.name} position={[u.lat, u.lng]} icon={uniIcon(u.short, i === uniIdx)}
            eventHandlers={{ click: () => pickUni(i) }}
            zIndexOffset={500} />
        ))}

        {/* Zoom xa: bong bóng quận (ẩn khi đang lọc theo bán kính) */}
        {clustered && districts.map(d => (
          <Marker key={d.district} position={[d.lat, d.lng]} icon={clusterIcon(d.district, d.listings, selectedDistrict === d.district)}
            eventHandlers={{ click: () => pickDistrict(d) }} />
        ))}

        {/* Zoom gần: pin từng tòa */}
        {!clustered && visibleProps.map(p => {
          const inRadius = selectedUni ? (p.dist != null && p.dist <= radiusKm) : true;
          const inDistrict = selectedDistrict ? p.district === selectedDistrict : true;
          // Nổi bật khi thuộc quận đang chọn hoặc trong bán kính trường (không lọc cứng)
          const highlight = (!!selectedDistrict && inDistrict) || (!!selectedUni && !filterByRadius && inRadius);
          const dim = (!!selectedDistrict && !inDistrict) || (!!selectedUni && !filterByRadius && !inRadius);
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
                    {p.dist != null && <span className="text-violet-600"> • cách {selectedUni?.short} {p.dist.toFixed(1)}km</span>}
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
