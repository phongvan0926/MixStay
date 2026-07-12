import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import SystemShareClient from './SystemShareClient';
import { ogImage, ogDefaultImage, largeCard } from '@/lib/og';

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const link = await prisma.shareLink.findUnique({
    where: { token: params.token },
  });

  if (!link || !link.isSystem) {
    return { title: 'Kho phòng không tồn tại' };
  }

  const creator = await prisma.user.findUnique({
    where: { id: link.brokerId },
    select: { name: true, role: true },
  });
  const isBrokerLink = creator?.role === 'BROKER';
  const who = creator?.name || (isBrokerLink ? 'Cộng tác viên' : 'Chủ nhà');

  // Ảnh preview: lấy tin đăng mới nhất CÓ ẢNH trong phạm vi của link (CTV → toàn hệ thống,
  // chủ nhà → tòa của chính họ). Không có thì /api/og fallback sang /default.jpg.
  const cover = await prisma.roomType.findFirst({
    where: {
      isApproved: true,
      images: { isEmpty: false },
      property: isBrokerLink
        ? { status: 'APPROVED', isActive: true }
        : { landlordId: link.brokerId, status: 'APPROVED' },
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  const title = `Kho phòng của ${who} | MixStay`;
  const description = `Xem tất cả phòng trống cho thuê từ ${who}. Tìm phòng miễn phí trên MixStay.`;
  const images = [cover ? ogImage(cover.id, `Kho phòng của ${who}`) : ogDefaultImage(`Kho phòng của ${who}`)];

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

export default function SystemSharePage() {
  return <SystemShareClient />;
}
