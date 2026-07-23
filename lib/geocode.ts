// lib/geocode.ts — Geocode địa chỉ → toạ độ qua Nominatim (OpenStreetMap, miễn phí).
// SERVER-ONLY. Dùng khi tạo/sửa tòa nhà để pin tự có trên bản đồ /ban-do.
// Fail thì trả null — KHÔNG được làm hỏng luồng tạo tòa nhà (backfill lại sau bằng
// scripts/geocode-properties.js).

const UA = 'MixStay/1.0 (contact@mixstay.vn)'; // Nominatim yêu cầu User-Agent định danh

function inHanoi(lat: number, lng: number): boolean {
  return lat >= 20.5 && lat <= 21.5 && lng >= 105.2 && lng <= 106.2;
}

// Tâm quận (median từ 447 tòa đã geocode, 2026-07). Dùng để XÁC MINH kết quả khi buộc phải
// query KHÔNG kèm quận (OSM Hà Nội đã bỏ cấp quận theo hệ phường mới → kèm tên quận cũ vào
// query làm Nominatim trượt hàng loạt). Key: tên quận bỏ dấu + lowercase.
const DISTRICT_CENTERS: Record<string, { lat: number; lng: number }> = {
  'ba dinh': { lat: 21.0315, lng: 105.8264 },
  'bac tu liem': { lat: 21.0528, lng: 105.7802 },
  'cau giay': { lat: 21.0327, lng: 105.7953 },
  'dong da': { lat: 21.0137, lng: 105.824 },
  'ha dong': { lat: 20.9742, lng: 105.7912 },
  'hai ba trung': { lat: 21.0021, lng: 105.8562 },
  'hoan kiem': { lat: 21.0285, lng: 105.8524 },
  'hoang mai': { lat: 20.9796, lng: 105.8621 },
  'long bien': { lat: 21.0455, lng: 105.8759 },
  'nam tu liem': { lat: 21.0167, lng: 105.7763 },
  'tay ho': { lat: 21.0513, lng: 105.8112 },
  'thanh tri': { lat: 20.9757, lng: 105.8439 },
  'thanh xuan': { lat: 20.9929, lng: 105.8115 },
};
const DISTRICT_RADIUS_KM = 7;

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Bóc "ngõ/ngách/số nhà + số" khỏi địa chỉ → còn TÊN PHỐ TRẦN (Nominatim không biết ngõ nhỏ).
// "Số 2 ngõ 91/1 Cầu Diễn" → "Cầu Diễn"; "Ngõ Quỳnh" (không số) giữ nguyên — là tên phố thật.
function bareStreet(input: string): string {
  let s = input.trim();
  s = s.replace(/\(.*?\)/g, ' ');
  s = s.replace(/^\s*["':]*\s*(?:địa\s*chỉ|đ\/c|dc)?\s*[:.]?\s*/i, '');
  s = s.replace(/\b(?:ngách|ngach|hẻm|hem|số\s*nhà|nhà\s*số|số|sn|nhà|tổ|to)\s*\d+[a-zA-Z0-9]*(?:\s*\/\s*\d+[a-zA-Z]?)*\b/gi, ' ');
  s = s.replace(/\b(?:ngõ|ngo)\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b/gi, ' ');
  s = s.replace(/\b(?:kdt|khu\s*đô\s*thị|liền\s*kề|lk)\s*\d*\b/gi, ' ');
  s = s.replace(/^\s*\d+[a-zA-Z]?(?:[\s./-]*\d+[a-zA-Z]?)*\b/i, ' ');
  s = s.replace(/\b(?:đường|duong)\b/gi, ' ');
  return s.replace(/["',;.:]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

async function query(q: string, limit = 1): Promise<Array<{ lat: number; lng: number }>> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&countrycodes=vn&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const arr = (await res.json()) || [];
    return arr
      .map((h: any) => ({ lat: parseFloat(h.lat), lng: parseFloat(h.lon) }))
      .filter((g: any) => inHanoi(g.lat, g.lng));
  } catch { return []; }
}

/**
 * Thử lần lượt tới khi trúng:
 *  1. fullAddress + quận (địa chỉ sạch, OSM còn nhận)
 *  2. streetName + quận
 *  3. TÊN PHỐ TRẦN không kèm quận + xác minh trong 7km quanh tâm quận
 *     (cứu các ca "ngõ 91/1 Cầu Diễn" mà bước 1-2 trượt vì OSM bỏ cấp quận)
 */
export async function geocodeAddress(input: {
  fullAddress?: string | null;
  streetName?: string | null;
  district?: string | null;
  city?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const city = input.city || 'Hà Nội';
  if (input.fullAddress?.trim()) {
    // LUÔN kèm quận: "99 Trương Định, Hà Nội" (thiếu quận) từng match nhầm POI "99" bên Ba Đình
    const [geo] = await query(`${input.fullAddress}, ${input.district ? input.district + ', ' : ''}${city}, Việt Nam`);
    if (geo) return geo;
  }
  if (input.streetName?.trim() && input.district) {
    const [geo] = await query(`${input.streetName}, ${input.district}, ${city}, Việt Nam`);
    if (geo) return geo;
  }
  // Bước 3: bỏ quận khỏi query nhưng BẮT BUỘC kết quả nằm quanh tâm quận (chống pin nhầm khu)
  const center = input.district ? DISTRICT_CENTERS[norm(input.district)] : undefined;
  if (center) {
    const cands = Array.from(new Set(
      [bareStreet(input.streetName || ''), bareStreet(input.fullAddress || '')].filter(c => c.length >= 4)
    ));
    for (const c of cands) {
      const hits = await query(`${c}, ${city}, Việt Nam`, 3);
      const geo = hits.find(h => kmBetween(h, center) <= DISTRICT_RADIUS_KM);
      if (geo) return geo;
    }
  }
  return null;
}
