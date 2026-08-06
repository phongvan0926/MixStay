import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import ShareViewClient from './ShareViewClient';
import { ogImage, largeCard } from '@/lib/og';
import { redactName, redactTitle } from '@/lib/address';

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
  // ⚠️ generateMetadata đọc THẲNG Prisma nên KHÔNG đi qua lớp redact của /api/share-links —
  // phải tự che ở đây. Tên tòa và tên tin đều hay kèm số nhà, mà tiêu đề này lộ ra
  // thẻ chia sẻ Zalo/Facebook lẫn kết quả tìm kiếm.
  const safeName = redactTitle(rt.name);
  const safeProp = redactName(prop?.name);
  const title = `${safeProp} - ${safeName}`;
  const description = `${safeName} ${rt.areaSqm}m² tại ${prop?.district}. Giá từ ${(rt.priceMonthly / 1000000).toFixed(1)} triệu/tháng.`;
  // /api/og/[id] → JPEG 1200×630 (ảnh gốc .webp không hiện được trong chat Zalo).
  const images = [ogImage(rt.id, safeName)];

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
