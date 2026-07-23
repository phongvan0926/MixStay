import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { redactName, redactHouseNumber } from '@/lib/address';
import { HANOI_UNIVERSITIES } from '@/lib/hanoi-locations';

// Khoảng cách km giữa 2 tọa độ (haversine) — dùng cho lọc "gần trường ĐH"
function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, dLat = ((bLat - aLat) * Math.PI) / 180, dLng = ((bLng - aLng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
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

    // Tìm theo TỪ KHÓA (q): khớp tên tin, mã tin (MS-…), mô tả (đều CÔNG KHAI) + quận.
    // CỐ Ý KHÔNG tìm trên property.streetName/name/fullAddress (có thể chứa số nhà — app đang
    // redact số nhà; tìm trên field thô sẽ cho phép dò số nhà qua kết quả). Tên tòa/đường mà chủ
    // nhà muốn công khai thường đã nằm trong tiêu đề tin (name). where.OR được AND với where.property
    // (status=APPROVED, isActive) nên không lộ tin ẩn/chưa duyệt.
    const q = url.searchParams.get('q')?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { listingCode: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { property: { district: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const { page, limit, skip } = getPaginationParams(url);

    // Lọc "gần trường ĐH": ?uni=<short name> — tính khoảng cách SERVER-SIDE từ tọa độ tòa
    // (tọa độ KHÔNG trả về client, chỉ trả distanceKm) rồi sắp gần nhất trước.
    const uniParam = url.searchParams.get('uni');
    const uni = uniParam ? HANOI_UNIVERSITIES.find(u => u.short === uniParam) : null;

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
              // CHỈ dùng server-side tính khoảng cách tới trường — bị xoá trước khi trả response
              latitude: true,
              longitude: true,
            },
          },
        },
        // AVAILABLE trước (status asc), trong UPCOMING xếp theo ngày sắp trống gần nhất, còn lại mới nhất trước
        orderBy: [
          { status: 'asc' },
          { expectedAvailableDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        // Chế độ gần trường: lấy rộng rồi sort theo khoảng cách + tự cắt trang (distance không sort được trong SQL)
        skip: uni ? 0 : skip,
        take: uni ? 500 : limit,
      }),
      prisma.roomType.count({ where }),
    ]);

    // Sắp theo khoảng cách tới trường rồi cắt trang thủ công
    let pageRows = roomTypes;
    const distanceById = new Map<string, number>();
    if (uni) {
      const withDist = roomTypes
        .filter(rt => rt.property?.latitude != null && rt.property?.longitude != null)
        .map(rt => {
          const d = kmBetween(uni.lat, uni.lng, rt.property!.latitude!, rt.property!.longitude!);
          distanceById.set(rt.id, d);
          return { rt, d };
        })
        .sort((a, b) => a.d - b.d);
      pageRows = withDist.slice(skip, skip + limit).map(x => x.rt);
    }

    // Scope the share-link lookup to only the rooms on this page (≤ limit rows),
    // instead of scanning every active broker share link in the system.
    const roomIds = pageRows.map(rt => rt.id);
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

    const withShareToken = pageRows.map(rt => {
      const images = [...(rt.images || []), ...(rt.property?.images || [])].slice(0, 3);
      const hasVideo = (rt.videos?.length || 0) + (rt.videoLinks?.length || 0) > 0;
      // Tách tọa độ ra khỏi property — TUYỆT ĐỐI không trả lat/lng cho client (chống dò vị trí)
      const { latitude: _lat, longitude: _lng, ...safeProp } = (rt.property || {}) as any;
      const distanceKm = distanceById.has(rt.id) ? Math.round(distanceById.get(rt.id)! * 10) / 10 : undefined;
      return {
        ...(distanceKm !== undefined ? { distanceKm, uniShort: uni?.short } : {}),
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
          ? { ...safeProp, name: redactName(rt.property.name), streetName: redactHouseNumber(rt.property.streetName) }
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
