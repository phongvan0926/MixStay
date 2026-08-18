/**
 * Client-safe. BÓC TOẠ ĐỘ từ thứ người dùng dán vào ô nhập.
 *
 * Vì sao cần: Nominatim/OSM KHÔNG biết phần lớn khu đô thị mới ở Việt Nam. Đo 18/08/2026,
 * "Khu đô thị mới HUD Vân Canh" và "66 Nam 32" (18 tin đăng) trượt mọi cách hỏi — cả
 * Nominatim lẫn Overpass đều không có đối tượng nào tên như vậy. Chạy lại script geocode
 * bao nhiêu lần cũng vô ích. Lối thoát duy nhất là để admin tự ghim, mà muốn thế thì phải
 * nhận được thứ họ CÓ SẴN trong tay: link Google Maps copy từ điện thoại.
 */

// Khung Hà Nội — trùng với scripts/geocode-properties.js và lib/geocode.ts.
// Toạ độ ngoài khung này gần như chắc chắn là gõ nhầm (hoặc đảo lat/lng).
export const HANOI_BOUNDS = { minLat: 20.5, maxLat: 21.5, minLng: 105.2, maxLng: 106.2 };

export type Coords = { lat: number; lng: number };

export function inHanoi(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= HANOI_BOUNDS.minLat && lat <= HANOI_BOUNDS.maxLat &&
    lng >= HANOI_BOUNDS.minLng && lng <= HANOI_BOUNDS.maxLng
  );
}

/** Hai khoảng lat/lng của Hà Nội KHÔNG giao nhau (20.5–21.5 vs 105.2–106.2) nên đảo ngược
 *  là nhận ra được chắc chắn — dán "105.73, 21.04" vẫn hiểu đúng thay vì báo lỗi vô cớ. */
function orient(a: number, b: number): Coords | null {
  if (inHanoi(a, b)) return { lat: a, lng: b };
  if (inHanoi(b, a)) return { lat: b, lng: a };
  return null;
}

const NUM = '-?\\d{1,3}(?:\\.\\d+)?';

/**
 * Nhận mọi dạng admin thực tế dán vào:
 *   21.039103, 105.730912
 *   https://www.google.com/maps/@21.039103,105.730912,17z
 *   https://www.google.com/maps/place/X/@21.03,105.73,17z/data=...!3d21.039103!4d105.730912
 *   https://maps.google.com/?q=21.039103,105.730912   |  ...&ll=21.03,105.73
 *   geo:21.039103,105.730912
 * Trả null nếu không bóc được HOẶC toạ độ nằm ngoài Hà Nội.
 */
export function parseCoords(input: string): Coords | null {
  const s = (input || '').trim();
  if (!s) return null;

  // !3d<lat>!4d<lng> là toạ độ CHÍNH XÁC của địa điểm trong link Google Maps —
  // ưu tiên hơn @lat,lng (vốn chỉ là tâm khung nhìn, lệch khi người dùng kéo bản đồ).
  const place = s.match(new RegExp(`!3d(${NUM})!4d(${NUM})`));
  if (place) {
    const c = orient(parseFloat(place[1]), parseFloat(place[2]));
    if (c) return c;
  }

  const at = s.match(new RegExp(`@(${NUM}),\\s*(${NUM})`));
  if (at) {
    const c = orient(parseFloat(at[1]), parseFloat(at[2]));
    if (c) return c;
  }

  const param = s.match(new RegExp(`[?&](?:q|ll|daddr|sll)=(${NUM}),\\s*(${NUM})`, 'i'));
  if (param) {
    const c = orient(parseFloat(param[1]), parseFloat(param[2]));
    if (c) return c;
  }

  // Dạng trần "21.0391, 105.7309" (và geo:…). Bắt CẶP SỐ ĐẦU TIÊN hợp lệ.
  const pairs = s.match(new RegExp(`(${NUM})\\s*[,;\\s]\\s*(${NUM})`, 'g')) || [];
  for (const p of pairs) {
    const m = p.match(new RegExp(`(${NUM})\\s*[,;\\s]\\s*(${NUM})`));
    if (!m) continue;
    const c = orient(parseFloat(m[1]), parseFloat(m[2]));
    if (c) return c;
  }
  return null;
}

/** Lý do KHÔNG nhận được, viết cho người không rành kỹ thuật đọc. null = hợp lệ. */
export function coordsError(input: string): string | null {
  const s = (input || '').trim();
  if (!s) return null;
  if (parseCoords(s)) return null;
  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(s)) {
    return 'Link rút gọn của Google Maps không chứa toạ độ. Mở link đó ra rồi copy lại link đầy đủ trên thanh địa chỉ, hoặc bấm giữ vào điểm cần ghim để Google hiện dãy số toạ độ.';
  }
  if (new RegExp(`${NUM}\\s*[,;\\s]\\s*${NUM}`).test(s)) {
    return 'Toạ độ này nằm ngoài Hà Nội. Kiểm tra lại — vĩ độ phải trong khoảng 20,5–21,5 và kinh độ 105,2–106,2.';
  }
  return 'Chưa nhận ra toạ độ. Dán link Google Maps đầy đủ, hoặc gõ hai số cách nhau bởi dấu phẩy — ví dụ 21.039103, 105.730912';
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** Link xem thử pin. Dùng OpenStreetMap cho khớp đúng nền bản đồ của trang /ban-do. */
export function mapPreviewUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}
