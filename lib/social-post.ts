// Dựng CAPTION đăng Facebook/Zalo cho 1 tin đăng (client-safe).
//
// Khác `buildListingText` (lib/listing-text.ts — bản copy ĐẦY ĐỦ để dán vào Zalo cá nhân):
// caption mạng xã hội cần MỞ ĐẦU BẮT MẮT, ngắn, xuống dòng thoáng, có lời kêu gọi + hashtag
// theo khu vực để lọt vào tìm kiếm trong nhóm. Bài dài đặc chữ trên feed bị lướt qua.

import { slugify } from '@/lib/seo-locations';

const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1 ngủ 1 khách',
  '2k1n': '2 ngủ 1 khách', studio: 'Studio', duplex: 'Duplex',
};

export interface SocialPostInput {
  name: string;
  typeName?: string;
  areaSqm?: number;
  priceMonthly: number;
  deposit?: number | null;
  district?: string | null;
  streetName?: string | null;
  amenities?: string[];
  parkingCar?: boolean;
  petAllowed?: boolean;
  foreignerOk?: boolean;
  availableUnits?: number;
  listingCode?: string | null;
  url: string;
  phone?: string | null;
  /** Tên người đăng để ký cuối bài (CTV / công ty) */
  contactName?: string | null;
}

const money = (n: number) => `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} triệu`;

/** Hashtag không dấu, gộp liền — "Cầu Giấy" → #phongtrocaugiay */
function hashtags(o: SocialPostInput): string {
  const tags = ['#mixstay', '#chungcumini', '#phongtrohanoi'];
  if (o.district) {
    const d = slugify(o.district).replace(/-/g, '');
    tags.push(`#phongtro${d}`, `#chungcumini${d}`);
  }
  if (o.typeName === 'studio') tags.push('#studio');
  return tags.join(' ');
}

export function buildSocialPost(o: SocialPostInput): string {
  const kind = o.typeName ? TYPE_LABEL[o.typeName] || o.typeName : '';
  const L: string[] = [];

  // Dòng đầu là thứ quyết định người ta dừng lại: khu vực + giá.
  L.push(`🔥 ${(o.district || 'HÀ NỘI').toUpperCase()} — ${kind.toUpperCase()}${o.areaSqm ? ` ${o.areaSqm}M²` : ''} CHỈ ${money(o.priceMonthly).toUpperCase()}/THÁNG`);
  L.push('');
  L.push(`🏠 ${o.name}`);
  L.push(`📍 ${[o.streetName, o.district].filter(Boolean).join(', ')}`);
  L.push(`💰 ${money(o.priceMonthly)}/tháng${o.deposit ? ` — cọc ${money(o.deposit)}` : ''}`);

  const highlights: string[] = [];
  if (o.parkingCar) highlights.push('🚗 Ô tô đỗ cửa');
  if (o.petAllowed) highlights.push('🐾 Nuôi thú cưng OK');
  if (o.foreignerOk) highlights.push('🌍 Nhận khách nước ngoài');
  const amen = (o.amenities || []).slice(0, 4);
  if (amen.length) highlights.push(`🛋️ ${amen.join(', ')}`);
  if (highlights.length) {
    L.push('');
    highlights.forEach(h => L.push(h));
  }

  if (o.availableUnits && o.availableUnits <= 3) {
    L.push('');
    L.push(`⚡ Chỉ còn ${o.availableUnits} phòng — ai cần inbox sớm nhé!`);
  }

  L.push('');
  L.push('👉 Xem đầy đủ ảnh, video và đặt lịch xem phòng:');
  L.push(o.url);
  if (o.phone) L.push(`📞 Liên hệ${o.contactName ? ` ${o.contactName}` : ''}: ${o.phone}`);
  if (o.listingCode) L.push(`(Mã tin: ${o.listingCode})`);
  L.push('');
  L.push(hashtags(o));

  return L.join('\n');
}
