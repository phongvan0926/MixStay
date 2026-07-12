import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import ShareViewClient from '@/app/share/[token]/ShareViewClient';
import { publicAddress } from '@/lib/address';
import { ogImage, largeCard } from '@/lib/og';

// Trang tin đăng CÔNG KHAI theo id — khách xem chi tiết KHÔNG cần đăng nhập / không cần
// share link. Dùng chung ShareViewClient (tự fetch /api/rooms/public/[id] khi có params.id).
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const rt = await prisma.roomType.findFirst({
    where: { id: params.id, isApproved: true, property: { status: 'APPROVED', isActive: true } },
    select: { id: true, name: true, areaSqm: true, priceMonthly: true, property: { select: { fullAddress: true, streetName: true, district: true } } },
  });

  if (!rt) return { title: 'Tin đăng không tồn tại' };

  // Ẩn số nhà: tiêu đề dùng địa chỉ công khai (ngõ/ngách + đường), không dùng tên tòa (có thể chứa số nhà).
  const loc = publicAddress(rt.property?.fullAddress, rt.property?.streetName) || rt.property?.district || '';
  const title = `${rt.name}${loc ? ` - ${loc}` : ''} | MixStay`;
  const description = `${rt.name} ${rt.areaSqm}m² tại ${rt.property?.district}. Giá từ ${(rt.priceMonthly / 1000000).toFixed(1)} triệu/tháng.`;
  const images = [ogImage(rt.id, rt.name)];

  return {
    title,
    description,
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

export default function PublicListingPage() {
  return <ShareViewClient />;
}
