import { Metadata } from 'next';
import { cache } from 'react';
import prisma from '@/lib/prisma';
import ShareViewClient from '@/app/share/[token]/ShareViewClient';
import { publicAddress } from '@/lib/address';
import { ogImage, largeCard } from '@/lib/og';
import { SITE_URL } from '@/lib/seo-locations';

// Trang tin đăng CÔNG KHAI theo id — khách xem chi tiết KHÔNG cần đăng nhập / không cần
// share link. Dùng chung ShareViewClient (tự fetch /api/rooms/public/[id] khi có params.id).

// generateMetadata + JSON-LD cùng cần một bản ghi — cache() gộp thành 1 truy vấn.
const getListing = cache((id: string) =>
  prisma.roomType.findFirst({
    where: { id, isApproved: true, property: { status: 'APPROVED', isActive: true } },
    select: {
      id: true, name: true, areaSqm: true, priceMonthly: true, description: true,
      status: true, availableUnits: true, updatedAt: true, amenities: true,
      property: { select: { fullAddress: true, streetName: true, district: true } },
    },
  })
);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const rt = await getListing(params.id);
  if (!rt) return { title: 'Tin đăng không tồn tại' };

  // Ẩn số nhà: tiêu đề dùng địa chỉ công khai (ngõ/ngách + đường), không dùng tên tòa (có thể chứa số nhà).
  const loc = publicAddress(rt.property?.fullAddress, rt.property?.streetName) || rt.property?.district || '';
  // KHÔNG tự thêm "| MixStay": app/layout.tsx đã có title.template '%s | MixStay'
  const title = `${rt.name}${loc ? ` - ${loc}` : ''}`;
  const description = `${rt.name} ${rt.areaSqm}m² tại ${rt.property?.district}. Giá từ ${(rt.priceMonthly / 1000000).toFixed(1)} triệu/tháng.`;
  const images = [ogImage(rt.id, rt.name)];

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/tin/${rt.id}` },
    openGraph: {
      title,
      description,
      images,
      type: 'website',
      locale: 'vi_VN',
      siteName: 'MixStay',
    },
    twitter: { ...largeCard, title, description, images },
  };
}

export default async function PublicListingPage({ params }: { params: { id: string } }) {
  const rt = await getListing(params.id);

  // Dữ liệu có cấu trúc cho TỪNG tin: Google hiện giá + ảnh ngay trong kết quả tìm kiếm.
  // Chỉ đưa dữ liệu ĐÃ CÔNG KHAI (địa chỉ redact số nhà, không SĐT, không toạ độ).
  const jsonLd = rt
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: rt.name,
        description:
          (rt.description || '').slice(0, 300) ||
          `${rt.name} ${rt.areaSqm}m² tại ${rt.property?.district || 'Hà Nội'}`,
        image: `${SITE_URL}/api/og/${rt.id}`,
        url: `${SITE_URL}/tin/${rt.id}`,
        category: 'Cho thuê phòng, chung cư mini',
        offers: {
          '@type': 'Offer',
          price: rt.priceMonthly,
          priceCurrency: 'VND',
          // Giá theo THÁNG — khai unitText để Google không hiểu nhầm là giá bán đứt.
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: rt.priceMonthly,
            priceCurrency: 'VND',
            unitText: 'tháng',
          },
          // Còn 0 phòng thì KHÔNG khai InStock, kể cả khi trạng thái còn sót 🟢 —
          // Google quảng cáo "còn phòng" mà khách bấm vào thấy hết là mất uy tín (và bị phạt).
          availability:
            rt.status === 'AVAILABLE' && (rt.availableUnits ?? 0) > 0
              ? 'https://schema.org/InStock'
              : rt.status === 'UPCOMING'
                ? 'https://schema.org/PreOrder'
                : 'https://schema.org/OutOfStock',
          url: `${SITE_URL}/tin/${rt.id}`,
        },
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'Diện tích', value: `${rt.areaSqm} m²` },
          { '@type': 'PropertyValue', name: 'Khu vực', value: rt.property?.district || 'Hà Nội' },
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <ShareViewClient />
    </>
  );
}
