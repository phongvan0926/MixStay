// Slug + dữ liệu cho các TRANG ĐÍCH SEO (client-safe, không đụng prisma).
//
// Mục tiêu: mỗi quận và mỗi trường đại học có một URL sạch, tiêu đề đúng cụm từ khách gõ
// trên Google ("phòng trọ cầu giấy", "phòng trọ gần đại học bách khoa"). Trước đây toàn bộ
// kho 758 tin chỉ nằm sau ô tìm kiếm client-side nên Google không có gì để index.

import { HANOI_DISTRICTS, INNER_CITY_DISTRICTS, HANOI_UNIVERSITIES } from './hanoi-locations';

/**
 * Domain thật của site — dùng dựng URL tuyệt đối cho canonical/OG trên trang đích.
 * KHÔNG dùng headers() như lib/og.ts vì headers() ép trang sang render động, mất ISR.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mixstay.vn';

/** "Cầu Giấy" → "cau-giay". Bỏ dấu, bỏ ký tự lạ, gom gạch nối. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type SeoDistrict = { name: string; slug: string; inner: boolean };

export const SEO_DISTRICTS: SeoDistrict[] = HANOI_DISTRICTS.map(name => ({
  name,
  slug: slugify(name),
  inner: INNER_CITY_DISTRICTS.includes(name),
}));

const DISTRICT_BY_SLUG = new Map(SEO_DISTRICTS.map(d => [d.slug, d]));
export function districtBySlug(slug: string): SeoDistrict | undefined {
  return DISTRICT_BY_SLUG.get(slug);
}

export function districtPath(name: string): string {
  return `/thue-phong-tro/${slugify(name)}`;
}

/**
 * Trường đại học cho trang đích. `short` phải TRÙNG HANOI_UNIVERSITIES.short vì API
 * /api/rooms/public?uni= nhận đúng chuỗi đó; `slug` là URL SEO; `name` là tên đầy đủ
 * dùng trong tiêu đề trang.
 */
export type SeoUni = { short: string; slug: string; name: string; lat: number; lng: number };

// Slug đặt tay theo cụm từ người tìm hay gõ, KHÔNG sinh máy móc từ `short`
// (tránh URL kiểu "ktqd-neu", "buu-chinh-ptit" — không ai gõ như vậy).
const UNI_SLUGS: Record<string, string> = {
  'Bách Khoa': 'bach-khoa',
  'KTQD (NEU)': 'kinh-te-quoc-dan',
  'Xây dựng': 'xay-dung',
  'Ngoại thương (FTU)': 'ngoai-thuong',
  'ĐHQG Cầu Giấy': 'dai-hoc-quoc-gia',
  'Sư phạm': 'su-pham',
  'Thương mại': 'thuong-mai',
  'Y Hà Nội': 'y-ha-noi',
  'Luật': 'luat',
  'Báo chí': 'bao-chi',
  'Ngân hàng': 'hoc-vien-ngan-hang',
  'Bưu chính (PTIT)': 'buu-chinh-vien-thong',
  'Công nghiệp': 'cong-nghiep',
  'Thủy lợi': 'thuy-loi',
  'Kiến trúc': 'kien-truc',
  'GTVT': 'giao-thong-van-tai',
  'Thăng Long': 'thang-long',
  'FPT Hòa Lạc': 'fpt-hoa-lac',
};

export const SEO_UNIS: SeoUni[] = HANOI_UNIVERSITIES
  .filter(u => UNI_SLUGS[u.short])
  .map(u => ({ short: u.short, slug: UNI_SLUGS[u.short], name: u.name, lat: u.lat, lng: u.lng }));

const UNI_BY_SLUG = new Map(SEO_UNIS.map(u => [u.slug, u]));
export function uniBySlug(slug: string): SeoUni | undefined {
  return UNI_BY_SLUG.get(slug);
}

export function uniPath(short: string): string {
  const slug = UNI_SLUGS[short];
  return slug ? `/phong-tro-gan/${slug}` : '/phong-tro-gan';
}

/** Bán kính coi là "gần trường" (km) — đi bộ/xe máy vài phút. */
export const UNI_RADIUS_KM = 3;

/** Khoảng giá làm link lọc nhanh — chia theo phân bố thật của kho (85% tin dưới 6 triệu). */
export const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: 'Dưới 3 triệu', max: 3_000_000 },
  { label: '3 – 4 triệu', min: 3_000_000, max: 4_000_000 },
  { label: '4 – 5 triệu', min: 4_000_000, max: 5_000_000 },
  { label: '5 – 7 triệu', min: 5_000_000, max: 7_000_000 },
  { label: 'Trên 7 triệu', min: 7_000_000 },
];

/** Nhãn loại phòng — đồng bộ PublicSearch / RoomTypeForm. */
export const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn',
  gac_xep: 'Gác xép',
  '1k1n': '1 ngủ 1 khách',
  '2k1n': '2 ngủ 1 khách',
  studio: 'Studio',
  duplex: 'Duplex',
};
