import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { applyRateLimit } from '@/lib/rate-limit';

// GET /api/share-links/system?token=xxx — public: lấy tất cả RoomType trống của landlord
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Thiếu token' }, { status: 400 });
    }

    const link = await prisma.shareLink.findUnique({
      where: { token },
    });

    if (!link || !link.isActive || !link.isSystem) {
      return NextResponse.json({ error: 'Link không tồn tại hoặc đã hết hạn' }, { status: 404 });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 });
    }

    // Increment view count
    await prisma.shareLink.update({
      where: { token },
      data: { viewCount: { increment: 1 } },
    });

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

    return NextResponse.json({ link, landlord, properties });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// POST /api/share-links/system — tạo system share link (landlord/admin only)
export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ chủ nhà hoặc admin mới tạo được link hệ thống' }, { status: 403 });
    }

    const body = await req.json();
    const token = nanoid(12);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
