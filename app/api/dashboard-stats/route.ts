import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = session.user.role;

    // ADMIN/ADMIN_STAFF: số liệu quản trị đã chuyển hẳn sang GET /api/admin/overview
    // (trang /admin/dashboard). Nhánh cũ ở đây từng tính thêm recentDeals — 5 giao dịch gần
    // nhất kèm 3 phép join — mà KHÔNG màn hình nào hiển thị, tốn truy vấn mỗi lần tải trang.
    // Trả 501 thay vì {} để nếu có chỗ nào lỡ gọi lại thì lộ ra ngay, không âm thầm ra số 0.
    if (role === 'ADMIN' || role === 'ADMIN_STAFF') {
      return NextResponse.json(
        { error: 'Dùng /api/admin/overview cho số liệu quản trị' },
        { status: 501 },
      );
    }

    if (role === 'BROKER') {
      const [totalDeals, confirmedDeals, totalLinks] = await Promise.all([
        prisma.deal.count({ where: { brokerId: session.user.id } }),
        prisma.deal.count({ where: { brokerId: session.user.id, status: { in: ['CONFIRMED', 'PAID'] } } }),
        prisma.shareLink.count({ where: { brokerId: session.user.id } }),
      ]);

      const commission = await prisma.deal.aggregate({
        where: { brokerId: session.user.id, status: { in: ['CONFIRMED', 'PAID'] } },
        _sum: { commissionBroker: true },
      });

      const totalViews = await prisma.shareLink.aggregate({
        where: { brokerId: session.user.id },
        _sum: { viewCount: true },
      });

      // CTV chỉ thấy tổng hoa hồng khi được cấp quyền xem hoa hồng.
      const canCommission = !!(session.user as any)?.canViewCommission;
      return NextResponse.json({
        totalDeals, confirmedDeals, totalLinks,
        totalCommission: canCommission ? (commission._sum.commissionBroker || 0) : null,
        totalViews: totalViews._sum.viewCount || 0,
      });
    }

    if (role === 'LANDLORD') {
      const [totalProperties, totalRoomTypes, availableRoomTypes] = await Promise.all([
        prisma.property.count({ where: { landlordId: session.user.id } }),
        prisma.roomType.count({ where: { property: { landlordId: session.user.id } } }),
        prisma.roomType.count({ where: { property: { landlordId: session.user.id }, status: 'AVAILABLE' } }),
      ]);

      const totalViews = await prisma.roomType.aggregate({
        where: { property: { landlordId: session.user.id } },
        _sum: { viewCount: true },
      });

      return NextResponse.json({
        totalProperties, totalRooms: totalRoomTypes, availableRooms: availableRoomTypes,
        totalViews: totalViews._sum.viewCount || 0,
      });
    }

    return NextResponse.json({});
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
