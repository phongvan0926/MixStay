import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

// Tin đã lưu (bookmark) của người dùng — chủ yếu cho Cộng tác viên xem lại sau.
export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const saved = await prisma.savedListing.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        roomType: {
          select: {
            id: true, name: true, listingCode: true, typeName: true, areaSqm: true,
            priceMonthly: true, deposit: true, images: true, videos: true, videoLinks: true, status: true,
            availableUnits: true, expectedAvailableDate: true, shortTermAllowed: true,
            property: { select: { name: true, district: true, streetName: true, images: true } },
          },
        },
      },
    });

    // Bỏ những bản ghi mà roomType đã bị xoá (roomType null).
    const listings = saved.filter(s => s.roomType).map(s => ({ ...s.roomType, savedAt: s.createdAt }));
    const savedIds = listings.map(l => l.id);
    return NextResponse.json({ savedIds, listings });
  } catch (error: any) {
    console.error('/api/saved-listings GET error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const roomTypeId = body?.roomTypeId;
    if (!roomTypeId) return NextResponse.json({ error: 'Thiếu roomTypeId' }, { status: 400 });

    // Tránh trùng nhờ @@unique([userId, roomTypeId]); upsert cho idempotent.
    await prisma.savedListing.upsert({
      where: { userId_roomTypeId: { userId: session.user.id, roomTypeId } },
      create: { userId: session.user.id, roomTypeId },
      update: {},
    });
    return NextResponse.json({ saved: true }, { status: 201 });
  } catch (error: any) {
    console.error('/api/saved-listings POST error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const roomTypeId = new URL(req.url).searchParams.get('roomTypeId');
    if (!roomTypeId) return NextResponse.json({ error: 'Thiếu roomTypeId' }, { status: 400 });

    await prisma.savedListing.deleteMany({ where: { userId: session.user.id, roomTypeId } });
    return NextResponse.json({ saved: false });
  } catch (error: any) {
    console.error('/api/saved-listings DELETE error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
