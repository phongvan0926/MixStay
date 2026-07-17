import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { redactName, redactHouseNumber } from '@/lib/address';

/**
 * GET /api/rooms/map — Dữ liệu bản đồ tìm phòng (CÔNG KHAI, không cần đăng nhập).
 * Trả tất cả tòa nhà đã duyệt CÓ toạ độ và CÒN tin hiệu lực (đã duyệt, chưa hết phòng).
 * Pin đặt đúng vị trí tòa nhưng KHÔNG kèm số nhà/địa chỉ chi tiết — chỉ tên + phố + quận
 * (đúng mức khách được thấy như trang tin đăng).
 */
export const revalidate = 300; // cache 5 phút — bản đồ không cần realtime từng giây

export async function GET() {
  try {
    const props = await prisma.property.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
        roomTypes: { some: { isApproved: true, status: { not: 'UNAVAILABLE' } } },
      },
      select: {
        id: true,
        name: true,
        district: true,
        streetName: true,
        latitude: true,
        longitude: true,
        roomTypes: {
          where: { isApproved: true, status: { not: 'UNAVAILABLE' } },
          select: {
            id: true,
            name: true,
            typeName: true,
            priceMonthly: true,
            areaSqm: true,
            status: true,
            availableUnits: true,
            images: true,
          },
          orderBy: { priceMonthly: 'asc' },
          take: 10, // popup chỉ cần vài tin đầu — tránh payload phình
        },
      },
    });

    const data = props.map(p => ({
      id: p.id,
      // Redact như /api/rooms/public: tên tòa/tên đường có thể bị nhồi số nhà → lọc token số nhà
      name: redactName(p.name),
      district: p.district,
      streetName: redactHouseNumber(p.streetName),
      lat: p.latitude,
      lng: p.longitude,
      minPrice: p.roomTypes[0]?.priceMonthly ?? null,
      listings: p.roomTypes.map(rt => ({
        id: rt.id,
        name: rt.name,
        typeName: rt.typeName,
        priceMonthly: rt.priceMonthly,
        areaSqm: rt.areaSqm,
        status: rt.status,
        availableUnits: rt.availableUnits,
        image: rt.images?.[0] || null,
      })),
    }));

    return NextResponse.json(
      { data, total: data.length },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (error: any) {
    console.error('GET /api/rooms/map error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
