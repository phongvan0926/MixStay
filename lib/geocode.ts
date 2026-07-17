// lib/geocode.ts — Geocode địa chỉ → toạ độ qua Nominatim (OpenStreetMap, miễn phí).
// SERVER-ONLY. Dùng khi tạo/sửa tòa nhà để pin tự có trên bản đồ /ban-do.
// Fail thì trả null — KHÔNG được làm hỏng luồng tạo tòa nhà (backfill lại sau bằng
// scripts/geocode-properties.js).

const UA = 'MixStay/1.0 (contact@mixstay.vn)'; // Nominatim yêu cầu User-Agent định danh

function inHanoi(lat: number, lng: number): boolean {
  return lat >= 20.5 && lat <= 21.5 && lng >= 105.2 && lng <= 106.2;
}

async function query(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const hit = (await res.json())?.[0];
    if (!hit) return null;
    const lat = parseFloat(hit.lat), lng = parseFloat(hit.lon);
    return inHanoi(lat, lng) ? { lat, lng } : null;
  } catch { return null; }
}

/** Thử địa chỉ đầy đủ trước, trượt thì lùi về tâm tuyến phố (streetName + district). */
export async function geocodeAddress(input: {
  fullAddress?: string | null;
  streetName?: string | null;
  district?: string | null;
  city?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const city = input.city || 'Hà Nội';
  if (input.fullAddress?.trim()) {
    // LUÔN kèm quận: "99 Trương Định, Hà Nội" (thiếu quận) từng match nhầm POI "99" bên Ba Đình
    const geo = await query(`${input.fullAddress}, ${input.district ? input.district + ', ' : ''}${city}, Việt Nam`);
    if (geo) return geo;
  }
  if (input.streetName?.trim() && input.district) {
    return query(`${input.streetName}, ${input.district}, ${city}, Việt Nam`);
  }
  return null;
}
