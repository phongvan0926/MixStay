import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { hasPermission } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = session.user.role;

    if (role === 'ADMIN' || role === 'ADMIN_STAFF') {
      const canSeeFinancials = hasPermission(session.user as any, 'VIEW_FINANCIAL_REPORTS');
      const [totalProperties, totalRoomTypes, availableRoomTypes, totalDeals, confirmedDeals, totalBrokers, totalLandlords, pendingProperties] = await Promise.all([
        prisma.property.count(),
        prisma.roomType.count(),
        prisma.roomType.count({ where: { status: 'AVAILABLE', isApproved: true } }),
        prisma.deal.count(),
        prisma.deal.count({ where: { status: 'CONFIRMED' } }),
        prisma.user.count({ where: { role: 'BROKER' } }),
        prisma.user.count({ where: { role: 'LANDLORD' } }),
        prisma.property.count({ where: { status: 'PENDING' } }),
      ]);

      const revenueResult = await prisma.deal.aggregate({
        where: { status: { in: ['CONFIRMED', 'PAID'] } },
        _sum: { commissionCompany: true, commissionTotal: true },
      });

      const recentDeals = await prisma.deal.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          broker: { select: { name: true } },
          roomType: { include: { property: { select: { name: true } } } },
        },
      });

      // Field-strip cho staff không có VIEW_FINANCIAL_REPORTS: giữ key, set null
      const strippedDeals = canSeeFinancials
        ? recentDeals
        : recentDeals.map(d => ({
            ...d,
            commissionTotal: null,
            commissionBroker: null,
            commissionCompany: null,
            dealPrice: null,
          }));

      return NextResponse.json({
        totalProperties, totalRooms: totalRoomTypes, availableRooms: availableRoomTypes,
        totalDeals, confirmedDeals,
        totalBrokers, totalLandlords, pendingProperties,
        totalRevenue: canSeeFinancials ? (revenueResult._sum.commissionCompany || 0) : null,
        totalCommission: canSeeFinancials ? (revenueResult._sum.commissionTotal || 0) : null,
        recentDeals: strippedDeals,
      });
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
