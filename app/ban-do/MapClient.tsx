'use client';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCurrency } from '@/lib/utils';

/**
 * Bản đồ tìm phòng (public). Pin đặt ĐÚNG vị trí tòa nhà nhưng thông tin chỉ tới
 * mức tên tòa + phố + quận (không số nhà) — đúng mức khách được thấy ở trang tin đăng.
 * - Zoom xa (< CLUSTER_ZOOM): gom theo QUẬN thành bong bóng "Cầu Giấy · 84 tin" → bấm để phóng tới.
 * - Zoom gần: pin từng tòa hiện GIÁ TỪ → bấm mở popup danh sách tin, link sang /tin/[id].
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

// 5500000 → "5,5tr" — nhãn pin phải thật ngắn
function priceShort(n: number | null): string {
  if (!n) return '?';
  const tr = n / 1_000_000;
  return `${(Math.round(tr * 10) / 10).toLocaleString('vi-VN')}tr`;
}

function pinIcon(label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-100%);display:inline-flex;flex-direction:column;align-items:center;">
      <span style="background:#1d4ed8;color:#fff;font-weight:700;font-size:12px;line-height:1;padding:6px 9px;border-radius:9999px;box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:nowrap;border:2px solid #fff;">${label}</span>
      <span style="width:2px;height:7px;background:#1d4ed8;"></span>
    </div>`,
    iconSize: [0, 0],
  });
}

function clusterIcon(district: string, count: number) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:6px;background:#fff;border:2px solid #1d4ed8;border-radius:9999px;padding:7px 12px;box-shadow:0 2px 10px rgba(0,0,0,.25);white-space:nowrap;">
      <span style="font-weight:700;font-size:12px;color:#1c1917;">${district}</span>
      <span style="background:#1d4ed8;color:#fff;font-weight:700;font-size:11px;border-radius:9999px;padding:2px 7px;">${count}</span>
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
    })).sort((a, b) => b.buildings - a.buildings);
  }, [props]);

  const clustered = zoom < CLUSTER_ZOOM;

  return (
    <div className="relative h-full w-full">
      {/* Thanh chọn nhanh quận */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-1.5 overflow-x-auto pb-1 pointer-events-none">
        {districts.slice(0, 12).map(d => (
          <button key={d.district}
            onClick={() => setFlyTarget({ center: [d.lat, d.lng], zoom: CLUSTER_ZOOM })}
            className="pointer-events-auto shrink-0 rounded-full bg-white/95 backdrop-blur border border-stone-200 shadow-sm px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">
            {d.district} <span className="text-brand-600 font-bold">{d.buildings}</span>
          </button>
        ))}
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

        {/* Zoom xa: bong bóng quận */}
        {clustered && districts.map(d => (
          <Marker key={d.district} position={[d.lat, d.lng]} icon={clusterIcon(d.district, d.listings)}
            eventHandlers={{ click: () => setFlyTarget({ center: [d.lat, d.lng], zoom: CLUSTER_ZOOM }) }} />
        ))}

        {/* Zoom gần: pin từng tòa */}
        {!clustered && props.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(priceShort(p.minPrice))}>
            <Popup maxWidth={320} minWidth={260}>
              <div style={{ fontFamily: 'inherit' }}>
                <p className="font-bold text-sm text-stone-900 mb-0.5">{p.name}</p>
                <p className="text-xs text-stone-500 mb-2">📍 {p.streetName ? `${p.streetName} • ` : ''}{p.district}</p>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {p.listings.map(l => (
                    <a key={l.id} href={`/tin/${l.id}`} target="_blank" rel="noopener"
                      className="flex items-center gap-2 rounded-lg border border-stone-200 p-1.5 hover:border-brand-400 transition-colors no-underline">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {l.image
                        ? <img src={l.image} alt="" className="w-11 h-11 rounded-md object-cover shrink-0" loading="lazy" />
                        : <span className="w-11 h-11 rounded-md bg-stone-100 flex items-center justify-center shrink-0">🚪</span>}
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
        ))}
      </MapContainer>
    </div>
  );
}
