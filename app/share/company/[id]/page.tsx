import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import CompanyCatalogClient from './CompanyCatalogClient';

// Trang catalog CÔNG KHAI của 1 công ty (link share cố định). Khách xem toàn bộ phòng của
// công ty, không cần đăng nhập.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const company = await prisma.company.findFirst({
    where: { id: params.id, isActive: true },
    select: { name: true, logo: true },
  });
  if (!company) return { title: 'Kho phòng không tồn tại' };

  const title = `Kho phòng ${company.name} | MixStay`;
  const description = `Toàn bộ phòng cho thuê của ${company.name} — xem nhanh, liên hệ trực tiếp.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(company.logo ? { images: [{ url: company.logo }] } : {}),
      type: 'website',
      locale: 'vi_VN',
      siteName: 'MixStay',
    },
  };
}

export default function CompanyCatalogPage({ params }: { params: { id: string } }) {
  return <CompanyCatalogClient id={params.id} />;
}
