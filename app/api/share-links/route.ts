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
          roomTypes: {
            where: { isAvailable: true, isApproved: true, availableUnits: { gt: 0 } },
            select: {
              id: true, name: true, typeName: true, areaSqm: true,
              priceMonthly: true, deposit: true, description: true,
              amenities: true, images: true,
              totalUnits: true, availableUnits: true, availableRoomNames: true,
              shortTermAllowed: true, shortTermMonths: true, shortTermPrice: true,
            },
          },
        },
      });

      const landlord = await prisma.user.findUnique({
        where: { id: landlordId },
        select: { name: true },
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
        include: {
          roomType: {
            include: {
              property: {
                select: {
                  name: true, district: true, streetName: true, city: true,
                  amenities: true, images: true, totalFloors: true,
                  parkingCar: true, parkingBike: true, evCharging: true, petAllowed: true, foreignerOk: true,
                  // NO fullAddress, lat, lng, landlord phone
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
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
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

    // Regular share link for broker
    if (session.user.role !== 'BROKER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      url: `${appUrl}/share/${token}`,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
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
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
