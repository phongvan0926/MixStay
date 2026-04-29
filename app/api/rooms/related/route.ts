import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

const PRICE_TOLERANCE = 0.3; // ±30%
const MAX_PER_BUCKET = 6;

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
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
        property: { select: { district: true, landlordId: true } },
      },
    });

    if (!base) {
      return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 });
    }

    const minPrice = base.priceMonthly * (1 - PRICE_TOLERANCE);
    const maxPrice = base.priceMonthly * (1 + PRICE_TOLERANCE);

    const commonSelect = {
      id: true,
      name: true,
      typeName: true,
      areaSqm: true,
      priceMonthly: true,
      deposit: true,
      amenities: true,
      images: true,
      availableUnits: true,
      status: true,
      expectedAvailableDate: true,
      shortTermAllowed: true,
      property: {
        select: {
          id: true, name: true, district: true, streetName: true, city: true, images: true,
          parkingCar: true, parkingBike: true, evCharging: true, petAllowed: true, foreignerOk: true,
        },
      },
    } as const;

    const baseWhere = {
      id: { not: roomTypeId },
      isApproved: true,
      status: { in: ['AVAILABLE', 'UPCOMING'] as ('AVAILABLE' | 'UPCOMING')[] },
      property: { status: 'APPROVED' as const, isActive: true },
    };

    const [sameBuilding, samePrice, sameDistrict, all] = await Promise.all([
      prisma.roomType.findMany({
        where: { ...baseWhere, propertyId: base.propertyId },
        select: commonSelect,
        orderBy: { createdAt: 'desc' },
        take: MAX_PER_BUCKET,
      }),
      prisma.roomType.findMany({
        where: {
          ...baseWhere,
          priceMonthly: { gte: minPrice, lte: maxPrice },
        },
        select: commonSelect,
        orderBy: { createdAt: 'desc' },
        take: MAX_PER_BUCKET,
      }),
      prisma.roomType.findMany({
        where: {
          ...baseWhere,
          property: { ...baseWhere.property, district: base.property.district },
        },
        select: commonSelect,
        orderBy: { createdAt: 'desc' },
        take: MAX_PER_BUCKET,
      }),
      prisma.roomType.findMany({
        where: baseWhere,
        select: commonSelect,
        orderBy: { createdAt: 'desc' },
        take: MAX_PER_BUCKET,
      }),
    ]);

    const ids = Array.from(new Set([
      ...sameBuilding.map(r => r.id),
      ...samePrice.map(r => r.id),
      ...sameDistrict.map(r => r.id),
      ...all.map(r => r.id),
    ]));

    const shareLinks = ids.length > 0
      ? await prisma.shareLink.findMany({
          where: { roomTypeId: { in: ids }, isActive: true, isSystem: false },
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

    const withToken = (r: any) => ({ ...r, shareToken: tokenByRoomType.get(r.id) || null });

    return NextResponse.json({
      sameBuilding: sameBuilding.map(withToken),
      samePrice: samePrice.map(withToken),
      sameDistrict: sameDistrict.map(withToken),
      all: all.map(withToken),
    });
  } catch (error: any) {
    console.error('/api/rooms/related error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
