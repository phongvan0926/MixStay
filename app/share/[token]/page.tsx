import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import ShareViewClient from './ShareViewClient';
import { ogImage, largeCard } from '@/lib/og';

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const link = await prisma.shareLink.findUnique({
    where: { token: params.token },
    include: {
      roomType: {
        include: { property: { select: { name: true, district: true } } },
      },
    },
  });

  if (!link?.roomType) {
    return { title: 'Phòng không tồn tại' };
  }

  const rt = link.roomType;
  const prop = rt.property;
  const title = `${prop?.name} - ${rt.name} | MixStay`;
  const description = `${rt.name} ${rt.areaSqm}m² tại ${prop?.district}. Giá từ ${(rt.priceMonthly / 1000000).toFixed(1)} triệu/tháng.`;
  // /api/og/[id] → JPEG 1200×630 (ảnh gốc .webp không hiện được trong chat Zalo).
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

export default function SharePage() {
  return <ShareViewClient />;
}
