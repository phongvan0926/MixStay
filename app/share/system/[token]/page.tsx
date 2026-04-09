import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import SystemShareClient from './SystemShareClient';

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const link = await prisma.shareLink.findUnique({
    where: { token: params.token },
  });

  if (!link || !link.isSystem) {
    return { title: 'Kho phòng không tồn tại' };
  }

  const landlord = await prisma.user.findUnique({
    where: { id: link.brokerId },
    select: { name: true },
  });

  const title = `Kho phòng của ${landlord?.name || 'Chủ nhà'} | MiniZen`;
  const description = `Xem tất cả phòng trống cho thuê từ ${landlord?.name || 'chủ nhà'}. Tìm phòng miễn phí trên MiniZen.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'vi_VN',
      siteName: 'MiniZen',
    },
  };
}

export default function SystemSharePage() {
  return <SystemShareClient />;
}
