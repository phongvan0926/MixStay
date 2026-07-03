import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { redactName, redactHouseNumber } from '@/lib/address';

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const url = new URL(req.url);
    const district = url.searchParams.get('district');
    const typeName = url.searchParams.get('typeName');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');

    const featureFlags = {
      parkingCar: url.searchParams.get('parkingCar') === 'true',
      parkingBike: url.searchParams.get('parkingBike') === 'true',
      evCharging: url.searchParams.get('evCharging') === 'true',
      petAllowed: url.searchParams.get('petAllowed') === 'true',
      foreignerOk: url.searchParams.get('foreignerOk') === 'true',
    };

    const propertyWhere: any = { status: 'APPROVED', isActive: true };
    // Cho phép lọc nhiều quận cùng lúc: district=Quận A,Quận B
    const districts = district ? district.split(',').map(d => d.trim()).filter(Boolean) : [];
    if (districts.length === 1) {
      propertyWhere.district = { contains: districts[0], mode: 'insensitive' };
    } else if (districts.length > 1) {
      propertyWhere.OR = districts.map(d => ({ district: { contains: d, mode: 'insensitive' } }));
    }
    if (featureFlags.parkingCar) propertyWhere.parkingCar = true;
    if (featureFlags.parkingBike) propertyWhere.parkingBike = true;
    if (featureFlags.evCharging) propertyWhere.evCharging = true;
    if (featureFlags.petAllowed) propertyWhere.petAllowed = true;
    if (featureFlags.foreignerOk) propertyWhere.foreignerOk = true;

    const where: any = {
      isApproved: true,
      // Public search: include AVAILABLE + UPCOMING (khách thấy phòng sắp trống để hỏi sớm), ẩn UNAVAILABLE
      status: { in: ['AVAILABLE', 'UPCOMING'] as ('AVAILABLE' | 'UPCOMING')[] },
      property: propertyWhere,
    };

    if (typeName) where.typeName = typeName;
    if (minPrice) where.priceMonthly = { ...where.priceMonthly, gte: parseFloat(minPrice) };
    if (maxPrice) where.priceMonthly = { ...where.priceMonthly, lte: parseFloat(maxPrice) };

    const { page, limit, skip } = getPaginationParams(url);

    const [roomTypes, total] = await Promise.all([
      prisma.roomType.findMany({
        where,
        select: {
          id: true,
          name: true,
          listingCode: true,
          typeName: true,
          areaSqm: true,
          priceMonthly: true,
          deposit: true,
          amenities: true,
          images: true,
          videos: true,
          videoLinks: true,
          availableUnits: true,
          status: true,
          expectedAvailableDate: true,
          shortTermAllowed: true,
          property: {
            select: {
              name: true,
              district: true,
              streetName: true,
              city: true,
              images: true,
              parkingCar: true,
              parkingBike: true,
              evCharging: true,
              petAllowed: true,
              foreignerOk: true,
            },
          },
        },
        // AVAILABLE trước (status asc), trong UPCOMING xếp theo ngày sắp trống gần nhất, còn lại mới nhất trước
        orderBy: [
          { status: 'asc' },
          { expectedAvailableDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.roomType.count({ where }),
    ]);

    // Scope the share-link lookup to only the rooms on this page (≤ limit rows),
    // instead of scanning every active broker share link in the system.
    const roomIds = roomTypes.map(rt => rt.id);
    const activeShareLinks = roomIds.length > 0
      ? await prisma.shareLink.findMany({
          where: { isActive: true, isSystem: false, roomTypeId: { in: roomIds } },
          select: { roomTypeId: true, token: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const tokenByRoomType = new Map<string, string>();
    for (const link of activeShareLinks) {
      if (link.roomTypeId && !tokenByRoomType.has(link.roomTypeId)) {
        tokenByRoomType.set(link.roomTypeId, link.token);
      }
    }

    const withShareToken = roomTypes.map(rt => {
      const images = [...(rt.images || []), ...(rt.property?.images || [])].slice(0, 3);
      const hasVideo = (rt.videos?.length || 0) + (rt.videoLinks?.length || 0) > 0;
      return {
        id: rt.id,
        name: rt.name,
        listingCode: rt.listingCode,
        typeName: rt.typeName,
        areaSqm: rt.areaSqm,
        priceMonthly: rt.priceMonthly,
        deposit: rt.deposit,
        amenities: rt.amenities,
        images,
        hasVideo,
        videoLinks: rt.videoLinks || [],
        // Trả video upload (URL) để thẻ dùng khung hình làm ảnh đại diện khi tin không có ảnh.
        videos: rt.videos || [],
        availableUnits: rt.availableUnits,
        status: rt.status,
        expectedAvailableDate: rt.expectedAvailableDate,
        shortTermAllowed: rt.shortTermAllowed,
        // Ẩn số nhà: redact tên tòa + tên đường (vài bản ghi nhồi cả số nhà vào streetName).
        property: rt.property
          ? { ...rt.property, name: redactName(rt.property.name), streetName: redactHouseNumber(rt.property.streetName) }
          : rt.property,
        shareToken: tokenByRoomType.get(rt.id) || null,
      };
    });

    // Public, no per-user data → CDN-cacheable. s-maxage keeps listings fresh
    // within a minute; SWR serves stale instantly while revalidating in the
    // background. Per-query-string variants cache separately.
    return NextResponse.json(paginatedResponse(withShareToken, total, page, limit), {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('/api/rooms/public error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
