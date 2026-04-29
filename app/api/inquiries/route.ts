import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const roomTypeId = url.searchParams.get('roomTypeId') || url.searchParams.get('roomId');
    const where: any = {};

    // Broker sees their own inquiries
    if (session.user.role === 'BROKER') {
      where.brokerId = session.user.id;
    }

    // Landlord sees inquiries for their room types
    if (session.user.role === 'LANDLORD') {
      where.roomType = { property: { landlordId: session.user.id } };
    }

    if (roomTypeId) where.roomTypeId = roomTypeId;

    const inquiries = await prisma.roomInquiry.findMany({
      where,
      include: {
        roomType: { include: { property: { select: { name: true, landlordId: true } } } },
        broker: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(inquiries);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'BROKER') {
      return NextResponse.json({ error: 'Chỉ Môi giới mới gửi được' }, { status: 403 });
    }

    const { roomTypeId, message } = await req.json();

    // Create inquiry
    const inquiry = await prisma.roomInquiry.create({
      data: {
        roomTypeId,
        brokerId: session.user.id,
        message: message || 'Còn phòng không?',
      },
      include: { roomType: { include: { property: true } } },
    });

    // Create notification for landlord
    await prisma.notification.create({
      data: {
        userId: inquiry.roomType.property.landlordId,
        type: 'inquiry',
        title: `MG hỏi về ${inquiry.roomType.name}`,
        message: `${session.user.name} hỏi: "${inquiry.message}"`,
        link: `/landlord/properties`,
      },
    });

    return NextResponse.json(inquiry, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// Landlord replies to inquiry
export async function PUT(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'LANDLORD') {
      return NextResponse.json({ error: 'Chỉ Chủ nhà mới trả lời được' }, { status: 403 });
    }

    const { id, reply } = await req.json();

    const inquiry = await prisma.roomInquiry.update({
      where: { id },
      data: { reply, repliedAt: new Date() },
      include: { roomType: true, broker: true },
    });

    // Notify broker of reply
    await prisma.notification.create({
      data: {
        userId: inquiry.brokerId,
        type: 'reply',
        title: `Chủ nhà trả lời: ${reply}`,
        message: `${inquiry.roomType.name}: "${reply}"`,
        link: `/broker/inventory`,
      },
    });

    // If reply is "HẾT", auto-update room type availability
    if (reply === 'HẾT') {
      await prisma.roomType.update({
        where: { id: inquiry.roomTypeId },
        data: { availableUnits: 0, status: 'UNAVAILABLE' },
      });
    }

    return NextResponse.json(inquiry);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
