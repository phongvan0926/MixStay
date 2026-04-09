import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import ShareViewClient from './ShareViewClient';

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
  const title = `${prop?.name} - ${rt.name} | MiniZen`;
  const description = `${rt.name} ${rt.areaSqm}m² tại ${prop?.district}. Giá từ ${(rt.priceMonthly / 1000000).toFixed(1)} triệu/tháng.`;
  const image = rt.images?.[0] || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ url: image }] } : {}),
      type: 'website',
      locale: 'vi_VN',
      siteName: 'MiniZen',
    },
  };
}

export default function SharePage() {
  return <ShareViewClient />;
}
