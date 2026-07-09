import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { redactName, redactHouseNumber } from '@/lib/address';

const PRICE_TOLERANCE = 0.3; // ±30% → "cùng phân khúc giá"
const MAX_PER_BUCKET = 9;    // trả dư để client xáo trộn → mỗi lần xem thấy bộ khác
const POOL = 200;            // chọn ngẫu nhiên trong tối đa 200 tin gần nhất mỗi tiêu chí

// Fisher–Yates shuffle (random thật, không lệ thuộc thứ tự DB) → giới thiệu sản phẩm đa dạng.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const url = new URL(req.url);
    const roomTypeId = url.searchParams.get('roomTypeId');

    if (!roomTypeId) {
      return NextResponse.json({ error: 'Thiếu roomTypeId' }, { status: 400 });
    }

    const base = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      select: {
        id: true,
        propertyId: true,
        priceMonthly: true,
        property: { select: { district: true, streetName: true, landlordId: true } },
      },
    });

    if (!base) {
      return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 });
    }

    const minPrice = base.priceMonthly * (1 - PRICE_TOLERANCE);
    const maxPrice = base.priceMonthly * (1 + PRICE_TOLERANCE);

    const baseWhere = {
      id: { not: roomTypeId },
      isApproved: true,
      status: { in: ['AVAILABLE', 'UPCOMING'] as ('AVAILABLE' | 'UPCOMING')[] },
      property: { status: 'APPROVED' as const, isActive: true },
    };

    // Điều kiện: cùng phân khúc GIÁ (±30%) và cùng QUẬN — 2 tab đều yêu cầu CẢ HAI theo yêu cầu.
    const priceCond = { priceMonthly: { gte: minPrice, lte: maxPrice } };
    const districtCond = base.property.district?.trim()
      ? { district: { contains: base.property.district.trim(), mode: 'insensitive' as const } }
      : {};

    // Bước 1: lấy NHẸ id ứng viên theo từng tiêu chí (pool 200 tin gần nhất), rồi xáo trộn.
    const idsOnly = { select: { id: true }, take: POOL, orderBy: { createdAt: 'desc' as const } };
    const [buildingPool, pricePool, streetPool, districtPool] = await Promise.all([
      prisma.roomType.findMany({ where: { ...baseWhere, propertyId: base.propertyId }, ...idsOnly }),
      // "Cùng mức giá": cùng giá NHƯNG cũng phải cùng quận.
      prisma.roomType.findMany({ where: { ...baseWhere, ...priceCond, property: { ...baseWhere.property, ...districtCond } }, ...idsOnly }),
      // Cùng tuyến đường (và cùng giá) — ưu tiên gần nhất trong "Cùng khu vực".
      base.property.streetName?.trim()
        ? prisma.roomType.findMany({ where: { ...baseWhere, ...priceCond, property: { ...baseWhere.property, streetName: { contains: base.property.streetName.trim(), mode: 'insensitive' } } }, ...idsOnly })
        : Promise.resolve([] as { id: string }[]),
      // "Cùng khu vực": cùng quận NHƯNG cũng phải cùng giá.
      base.property.district?.trim()
        ? prisma.roomType.findMany({ where: { ...baseWhere, ...priceCond, property: { ...baseWhere.property, ...districtCond } }, ...idsOnly })
        : Promise.resolve([] as { id: string }[]),
    ]);

    const sameBuildingIds = shuffle(buildingPool.map(r => r.id)).slice(0, MAX_PER_BUCKET);
    const samePriceIds = shuffle(pricePool.map(r => r.id)).slice(0, MAX_PER_BUCKET);
    // "Cùng khu vực" = ưu tiên cùng TUYẾN ĐƯỜNG (gần nhất), rồi tới cùng QUẬN — mỗi nhóm ngẫu nhiên.
    const locationIds = Array.from(new Set([
      ...shuffle(streetPool.map(r => r.id)),
      ...shuffle(districtPool.map(r => r.id)),
    ])).slice(0, MAX_PER_BUCKET);

    // Bước 2: fetch ĐẦY ĐỦ cho các id đã chọn trong 1 query.
    const neededIds = Array.from(new Set([...sameBuildingIds, ...samePriceIds, ...locationIds]));
    const rows = neededIds.length
      ? await prisma.roomType.findMany({
          where: { id: { in: neededIds } },
          select: {
            id: true, name: true, listingCode: true, typeName: true, areaSqm: true,
            priceMonthly: true, deposit: true, amenities: true, images: true,
            availableUnits: true, status: true, expectedAvailableDate: true, shortTermAllowed: true,
            property: {
              select: {
                id: true, name: true, district: true, streetName: true, city: true, images: true,
                parkingCar: true, parkingBike: true, evCharging: true, petAllowed: true, foreignerOk: true,
              },
            },
          },
        })
      : [];
    const byId = new Map(rows.map(r => [r.id, r]));

    // Share token cho các tin có link lẻ đang active (để mở đúng trang share nếu có).
    const shareLinks = neededIds.length > 0
      ? await prisma.shareLink.findMany({
          where: { roomTypeId: { in: neededIds }, isActive: true, isSystem: false },
          select: { roomTypeId: true, token: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const tokenByRoomType = new Map<string, string>();
    for (const link of shareLinks) {
      if (link.roomTypeId && !tokenByRoomType.has(link.roomTypeId)) {
        tokenByRoomType.set(link.roomTypeId, link.token);
      }
    }

    const hydrate = (ids: string[]) =>
      ids
        .map(id => byId.get(id))
        .filter(Boolean)
        .map((r: any) => ({
          ...r,
          // Ẩn số nhà: redact tên tòa + tên đường trước khi trả cho khách.
          property: r.property
            ? { ...r.property, name: redactName(r.property.name), streetName: redactHouseNumber(r.property.streetName) }
            : r.property,
          shareToken: tokenByRoomType.get(r.id) || null,
        }));

    // Cache ngắn để vẫn re-random thường xuyên (đa dạng) mà không tải nặng server.
    return NextResponse.json({
      sameBuilding: hydrate(sameBuildingIds),
      samePrice: hydrate(samePriceIds),
      sameDistrict: hydrate(locationIds),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error('/api/rooms/related error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
