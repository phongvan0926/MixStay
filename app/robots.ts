import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo-locations';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Nêu rõ các nhánh CÔNG KHAI muốn được thu thập: tin đăng (/tin/), trang đích
        // theo quận (/thue-phong-tro/) và theo trường (/phong-tro-gan/), bản đồ, kho phòng.
        allow: ['/', '/tin/', '/phong', '/ban-do', '/thue-phong-tro', '/phong-tro-gan', '/share/', '/login', '/register'],
        disallow: ['/admin/', '/broker/', '/landlord/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
