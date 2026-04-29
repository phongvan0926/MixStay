import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { shareLinkCreateSchema, validateBody } from '@/lib/validations';

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const systemToken = url.searchParams.get('systemToken');

    // Public: view system share link (landlord's all available rooms)
    if (systemToken) {
      const link = await prisma.shareLink.findUnique({
        where: { token: systemToken },
      });

      if (!link || !link.isActive || !link.isSystem) {
        return NextResponse.json({ error: 'Link không tồn tại hoặc đã hết hạn' }, { status: 404 });
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 });
      }

      // Increment view count
      await prisma.shareLink.update({ where: { token: systemToken }, data: { viewCount: { increment: 1 } } });

      // Fetch all available room types from this landlord's properties
      const landlordId = link.brokerId; // brokerId stores landlordId for system links
      const properties = await prisma.property.findMany({
        where: { landlordId, status: 'APPROVED' },
        select: {
          id: true, name: true, district: true, streetName: true, city: true,
          amenities: true, images: true, totalFloors: true,
          parkingCar: true, parkingBike: true, evCharging: true, petAllowed: true, foreignerOk: true,
          company: { select: { id: true, name: true, logo: true, zaloGroupLink: true, description: true } },
          roomTypes: {
            where: { isApproved: true, status: { in: ['AVAILABLE', 'UPCOMING'] } },
            select: {
              id: true, name: true, typeName: true, areaSqm: true,
              priceMonthly: true, deposit: true, description: true,
              amenities: true, images: true, videos: true, videoLinks: true,
              totalUnits: true, availableUnits: true,
              // KHÔNG select availableRoomNames — leak sang khách
              status: true, expectedAvailableDate: true,
              shortTermAllowed: true, shortTermMonths: true, shortTermPrice: true,
            },
            orderBy: [
              { status: 'asc' },
              { expectedAvailableDate: { sort: 'asc', nulls: 'last' } },
              { createdAt: 'desc' },
            ],
          },
        },
      });

      const landlord = await prisma.user.findUnique({
        where: { id: landlordId },
        select: { name: true, phone: true }, // phone dùng cho FAB Zalo deeplink (KHÔNG render UI)
      });

      return NextResponse.json({
        link,
        landlord,
        properties,
      });
    }

    // Public: view by token (for customers — single room type)
    if (token) {
      const link = await prisma.shareLink.findUnique({
        where: { token },
        select: {
          id: true, token: true, viewCount: true, isActive: true, isSystem: true,
          expiresAt: true, createdAt: true, roomTypeId: true, brokerId: true,
          roomType: {
            select: {
              id: true, name: true, typeName: true, areaSqm: true,
              priceMonthly: true, deposit: true, description: true,
              amenities: true, images: true, videos: true, videoLinks: true,
              totalUnits: true, availableUnits: true,
              // KHÔNG select availableRoomNames — khách chỉ thấy số lượng
              status: true, expectedAvailableDate: true,
              shortTermAllowed: true, shortTermMonths: true, shortTermPrice: true,
              property: {
                select: {
                  id: true, name: true, district: true, streetName: true, city: true,
                  amenities: true, images: true, totalFloors: true,
                  parkingCar: true, parkingBike: true, evCharging: true, petAllowed: true, foreignerOk: true,
                  // NO fullAddress, lat, lng, landlord phone
                  company: { select: { id: true, name: true, logo: true, zaloGroupLink: true, description: true } },
                  landlord: { select: { id: true, name: true, phone: true } }, // phone dùng cho FAB Zalo deeplink (KHÔNG render trên UI)
                },
              },
            },
          },
          broker: { select: { name: true, phone: true } },
        },
      });

      if (!link || !link.isActive) {
        return NextResponse.json({ error: 'Link không tồn tại hoặc đã hết hạn' }, { status: 404 });
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 });
      }

      // Increment view count
      await prisma.shareLink.update({ where: { token }, data: { viewCount: { increment: 1 } } });

      return NextResponse.json(link);
    }

    // Authenticated: list user's links
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where: any = {};
    if (session.user.role === 'BROKER') {
      where.brokerId = session.user.id;
      where.isSystem = false;
    } else if (session.user.role === 'LANDLORD') {
      where.brokerId = session.user.id;
    }

    const { page, limit, skip } = getPaginationParams(url);

    const [links, total] = await Promise.all([
      prisma.shareLink.findMany({
        where,
        include: {
          roomType: { include: { property: { select: { name: true, district: true, images: true } } } },
          broker: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.shareLink.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(links, total, page, limit));
  } catch (error: any) {
    console.error('/api/share-links error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = validateBody(shareLinkCreateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const token = nanoid(12);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // System link for landlord
    if (body.isSystem) {
      if (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const link = await prisma.shareLink.create({
        data: {
          brokerId: session.user.id, // landlord's id
          token,
          isSystem: true,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        },
      });

      return NextResponse.json({
        ...link,
        url: `${appUrl}/share/system/${token}`,
      }, { status: 201 });
    }

    // Regular share link: BROKER, LANDLORD (own room types), or ADMIN
    if (session.user.role !== 'BROKER' && session.user.role !== 'ADMIN' && session.user.role !== 'LANDLORD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!body.roomTypeId) {
      return NextResponse.json({ error: 'Thiếu roomTypeId' }, { status: 400 });
    }

    // LANDLORD can only share their own room types
    if (session.user.role === 'LANDLORD') {
      const rt = await prisma.roomType.findUnique({
        where: { id: body.roomTypeId },
        select: { property: { select: { landlordId: true } } },
      });
      if (!rt || rt.property.landlordId !== session.user.id) {
        return NextResponse.json({ error: 'Không có quyền chia sẻ phòng này' }, { status: 403 });
      }
    }

    // Reuse existing active link from this user for this room type
    const existing = await prisma.shareLink.findFirst({
      where: {
        roomTypeId: body.roomTypeId,
        brokerId: session.user.id,
        isSystem: false,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing && (!existing.expiresAt || new Date(existing.expiresAt) > new Date())) {
      return NextResponse.json({
        ...existing,
        url: `${appUrl}/p/${existing.token}`,
      });
    }

    const link = await prisma.shareLink.create({
      data: {
        roomTypeId: body.roomTypeId,
        brokerId: session.user.id,
        token,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    return NextResponse.json({
      ...link,
      url: `${appUrl}/p/${token}`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('/api/share-links error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await prisma.shareLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('/api/share-links error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
