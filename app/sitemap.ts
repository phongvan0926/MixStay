import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { PUBLIC_ROOM_WHERE } from '@/lib/seo-listings';
import { SEO_DISTRICTS, SEO_UNIS, districtPath, uniPath, SITE_URL } from '@/lib/seo-locations';

// Sitemap ĐỘNG: trước đây chỉ khai báo 3 URL (trang chủ + login + register) nên toàn bộ
// tin đăng và trang đích không có đường vào từ Google. Nay liệt kê đủ:
// trang tĩnh + hub khu vực/trường + từng quận + từng trường + TỪNG TIN đang hiển thị.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await prisma.roomType.findMany({
    where: PUBLIC_ROOM_WHERE,
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000, // 1 file sitemap tối đa 50k URL — 5k là dư cho quy mô hiện tại
  });

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/phong`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/ban-do`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/thue-phong-tro`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/phong-tro-gan`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Chỉ đưa 12 quận nội thành vào sitemap: ngoại thành hầu như chưa có tin, khai báo
  // hàng loạt trang rỗng chỉ làm loãng ngân sách thu thập của Google.
  const districtPages: MetadataRoute.Sitemap = SEO_DISTRICTS.filter(d => d.inner).map(d => ({
    url: `${SITE_URL}${districtPath(d.name)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const uniPages: MetadataRoute.Sitemap = SEO_UNIS.map(u => ({
    url: `${SITE_URL}${uniPath(u.short)}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const listingPages: MetadataRoute.Sitemap = listings.map(rt => ({
    url: `${SITE_URL}/tin/${rt.id}`,
    lastModified: rt.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...districtPages, ...uniPages, ...listingPages];
}
