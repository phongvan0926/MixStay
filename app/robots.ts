import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mixstay.vn';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/share/', '/login', '/register'],
        disallow: ['/admin/', '/broker/', '/landlord/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
