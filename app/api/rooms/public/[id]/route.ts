import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

// GET /api/rooms/public/[id] — public listing detail by room id (no auth, no share token).
// Customer-safe fields ONLY (same as the share-link view): NO fullAddress, lat/lng,
// zaloPhone, availableRoomNames, landlordNotes, commission. Landlord phone is returned
// only for the Zalo deeplink (not rendered as text). Shape mirrors the share-link payload
// ({ roomType, broker }) so ShareViewClient can render it directly (broker = null → no
// broker attribution; contact falls back to company group / landlord Zalo).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const roomType = await prisma.roomType.findFirst({
      where: {
        id: params.id,
        isApproved: true,
        property: { status: 'APPROVED', isActive: true },
      },
      select: {
        id: true, name: true, typeName: true, areaSqm: true,
        priceMonthly: true, deposit: true, description: true,
        amenities: true, images: true, videos: true, videoLinks: true,
        listingCode: true,
        totalUnits: true, availableUnits: true,
        // KHÔNG select availableRoomNames — khách chỉ thấy số lượng
        status: true, expectedAvailableDate: true,
        shortTermAllowed: true, shortTermMonths: true, shortTermPrice: true,
        property: {
          select: {
            id: true, name: true, district: true, streetName: true, city: true,
            amenities: true, images: true, totalFloors: true,
            parkingCar: true, parkingBike: true, evCharging: true, petAllowed: true, foreignerOk: true,
            // NO fullAddress, lat, lng, zaloPhone
            company: { select: { id: true, name: true, logo: true, zaloGroupLink: true, description: true } },
            landlord: { select: { id: true, name: true, phone: true } }, // phone dùng cho FAB Zalo deeplink (KHÔNG render trên UI)
          },
        },
      },
    });

    if (!roomType) {
      return NextResponse.json({ error: 'Tin đăng không tồn tại hoặc chưa được duyệt' }, { status: 404 });
    }

    // Lượt xem tự nhiên (không chặn response nếu lỗi)
    prisma.roomType.update({ where: { id: params.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    // broker = null → không gắn môi giới (truy cập tự nhiên từ trang chủ / link trực tiếp)
    return NextResponse.json({ roomType, broker: null });
  } catch (error: any) {
    console.error('/api/rooms/public/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
