import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { redactName, redactHouseNumber } from '@/lib/address';

// Kho phòng CÔNG KHAI của 1 CÔNG TY — phục vụ link share cố định /share/company/[id].
// Trả company (chỉ khi đang hoạt động) + tất cả phòng trống/sắp trống ĐÃ DUYỆT thuộc công ty.
// Không cần đăng nhập; cache CDN ngắn.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const companyId = params.id;

    const company = await prisma.company.findFirst({
      where: { id: companyId, isActive: true, isApproved: true },
      select: { id: true, name: true, logo: true, zaloGroupLink: true, phone: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Công ty không tồn tại' }, { status: 404 });
    }

    const roomTypes = await prisma.roomType.findMany({
      where: {
        isApproved: true,
        status: { in: ['AVAILABLE', 'UPCOMING'] as ('AVAILABLE' | 'UPCOMING')[] },
        property: { companyId, status: 'APPROVED', isActive: true },
      },
      select: {
        id: true,
        name: true,
        typeName: true,
        areaSqm: true,
        priceMonthly: true,
        amenities: true,
        images: true,
        videos: true,
        videoLinks: true,
        availableUnits: true,
        status: true,
        expectedAvailableDate: true,
        property: {
          select: { name: true, district: true, streetName: true, city: true, images: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { expectedAvailableDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    });

    const rooms = roomTypes.map(rt => ({
      id: rt.id,
      name: rt.name,
      typeName: rt.typeName,
      areaSqm: rt.areaSqm,
      priceMonthly: rt.priceMonthly,
      amenities: rt.amenities,
      images: [...(rt.images || []), ...(rt.property?.images || [])].slice(0, 3),
      hasVideo: (rt.videos?.length || 0) + (rt.videoLinks?.length || 0) > 0,
      // Cho thẻ dùng video làm ảnh đại diện khi tin không có ảnh.
      videos: rt.videos || [],
      videoLinks: rt.videoLinks || [],
      availableUnits: rt.availableUnits,
      status: rt.status,
      // Ẩn số nhà: redact tên tòa + tên đường trước khi trả cho khách.
      property: rt.property
        ? { ...rt.property, name: redactName(rt.property.name), streetName: redactHouseNumber(rt.property.streetName) }
        : rt.property,
    }));

    return NextResponse.json(
      { company, rooms },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
