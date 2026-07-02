// Dựng nội dung TEXT của 1 bài đăng để copy sang nền tảng khác (Facebook/Zalo...).
const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1 khách 1 ngủ',
  '2k1n': '2 ngủ 1 khách', studio: 'Studio', duplex: 'Duplex',
};

function money(n?: number | null): string {
  if (!n || n <= 0) return '';
  return n.toLocaleString('vi-VN') + 'đ';
}

export interface ListingTextInput {
  name?: string;
  typeName?: string;
  areaSqm?: number;
  priceMonthly?: number;
  deposit?: number;
  listingCode?: string | null;
  location?: string;              // khu vực/đường (đã ẩn số nhà nếu là view khách)
  amenities?: string[];
  buildingAmenities?: string[];
  description?: string | null;
  url?: string;                   // link bài đăng
}

export function buildListingText(o: ListingTextInput): string {
  const lines: string[] = [];
  if (o.name) lines.push(`🏠 ${o.name.toUpperCase()}`);
  const kind = o.typeName ? (TYPE_LABEL[o.typeName] || o.typeName) : '';
  const spec = [kind, o.areaSqm ? `${o.areaSqm}m²` : ''].filter(Boolean).join(' • ');
  if (spec) lines.push(spec);
  if (o.priceMonthly) lines.push(`💰 Giá: ${money(o.priceMonthly)}/tháng${o.deposit ? ` (cọc ${money(o.deposit)})` : ''}`);
  if (o.location) lines.push(`📍 ${o.location}`);
  if (o.amenities?.length) lines.push(`🛋️ Nội thất: ${o.amenities.join(', ')}`);
  if (o.buildingAmenities?.length) lines.push(`🏢 Tiện ích toà nhà: ${o.buildingAmenities.join(', ')}`);
  if (o.description?.trim()) { lines.push(''); lines.push(o.description.trim()); }
  if (o.listingCode) lines.push(`\nMã tin: ${o.listingCode}`);
  if (o.url) lines.push(`👉 Xem chi tiết: ${o.url}`);
  return lines.join('\n');
}
