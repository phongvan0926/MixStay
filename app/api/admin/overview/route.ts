import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { hasPermission } from '@/lib/permissions';

/**
 * TRUNG TÂM ĐIỀU HÀNH của admin — nguồn dữ liệu cho /admin/dashboard.
 *
 * Gom TOÀN BỘ số liệu vào MỘT request (Promise.all) thay vì để trang gọi 15 API rời:
 * mỗi request là một lần đánh thức Postgres + một function invocation trên Vercel,
 * gọi rời sẽ vừa chậm vừa tốn compute.
 *
 * Nguyên tắc chọn số: ưu tiên số DẪN TỚI HÀNH ĐỘNG (còn bao nhiêu việc phải làm,
 * chất lượng kho hàng đang hổng ở đâu) rồi mới tới số để ngắm (tổng tòa/tổng user).
 */
export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || (role !== 'ADMIN' && role !== 'ADMIN_STAFF')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canSeeFinancials = hasPermission(session.user as any, 'VIEW_FINANCIAL_REPORTS');
  const canManageCompanies = hasPermission(session.user as any, 'MANAGE_COMPANIES');

  const now = new Date();
  const d7 = new Date(Date.now() - 7 * DAY);
  const d30 = new Date(Date.now() - 30 * DAY);

  try {
    const [
      // ① Việc cần làm
      pendingRooms, pendingProperties, pendingCompanies, activeLeads, openInquiries,
      // ② Sức khoẻ kho hàng
      roomsNoImage, propsNoCompany, propsNoGeo, staleRooms, overdueUpcoming,
      // ③ Nhịp + ④ số tổng
      totalProperties, totalRooms, availableRooms, totalCompanies, totalBrokers, totalLandlords,
      newRooms7d, newUsers7d, totalDeals, confirmedDeals,
    ] = await Promise.all([
      prisma.roomType.count({ where: { isApproved: false } }),
      prisma.property.count({ where: { status: 'PENDING' } }),
      prisma.company.count({ where: { isApproved: false } }),
      prisma.savedSearch.count({ where: { isActive: true } }),
      prisma.roomInquiry.count({ where: { reply: null, dismissedAt: null } }),

      prisma.roomType.count({ where: { images: { isEmpty: true } } }),
      prisma.property.count({ where: { companyId: null } }),
      prisma.property.count({ where: { OR: [{ latitude: null }, { longitude: null }] } }),
      prisma.roomType.count({ where: { status: 'AVAILABLE', isApproved: true, updatedAt: { lt: d30 } } }),
      prisma.roomType.count({ where: { status: 'UPCOMING', expectedAvailableDate: { lte: now } } }),

      prisma.property.count(),
      prisma.roomType.count(),
      prisma.roomType.count({ where: { status: 'AVAILABLE', isApproved: true } }),
      prisma.company.count(),
      prisma.user.count({ where: { role: 'BROKER' } }),
      prisma.user.count({ where: { role: 'LANDLORD' } }),
      prisma.roomType.count({ where: { createdAt: { gte: d7 } } }),
      prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      prisma.deal.count(),
      prisma.deal.count({ where: { status: 'CONFIRMED' } }),
    ]);

    // Các truy vấn nặng hơn (join/aggregate) — tách khỏi nhóm đếm ở trên cho dễ đọc.
    const [weekly, topCompanies, topRooms, viewsAgg, linkViewsAgg, revenueAgg, inquiryList] = await Promise.all([
      // Nhịp đăng tin 8 tuần — thấy ngay đà tăng/giảm của nguồn hàng.
      prisma.$queryRawUnsafe<{ tuan: string; tin: number }[]>(`
        SELECT to_char(date_trunc('week', "createdAt"), 'DD/MM') AS tuan,
               count(*)::int AS tin,
               date_trunc('week', "createdAt") AS w
        FROM room_types
        WHERE "createdAt" > now() - interval '8 weeks'
        GROUP BY w ORDER BY w`),
      prisma.$queryRawUnsafe<{ id: string; name: string; tin: number }[]>(`
        SELECT co.id, co.name, count(rt.id)::int AS tin
        FROM companies co
        JOIN properties pr ON pr."companyId" = co.id
        JOIN room_types rt ON rt."propertyId" = pr.id
        GROUP BY co.id, co.name ORDER BY tin DESC LIMIT 5`),
      prisma.roomType.findMany({
        where: { viewCount: { gt: 0 } },
        orderBy: { viewCount: 'desc' },
        take: 5,
        select: { id: true, name: true, viewCount: true, property: { select: { district: true } } },
      }),
      prisma.roomType.aggregate({ _sum: { viewCount: true } }),
      prisma.shareLink.aggregate({ _sum: { viewCount: true } }),
      prisma.deal.aggregate({
        where: { status: { in: ['CONFIRMED', 'PAID'] } },
        _sum: { commissionCompany: true, commissionTotal: true },
      }),
      // Chỉ 3–5 câu hỏi chưa trả lời → hiện thẳng danh sách trên dashboard,
      // khỏi phải dựng thêm một trang admin riêng chỉ để xem vài dòng.
      prisma.roomInquiry.findMany({
        where: { reply: null, dismissedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, message: true, createdAt: true,
          broker: { select: { name: true } },
          roomType: { select: { id: true, name: true, listingCode: true } },
        },
      }),
    ]);

    return NextResponse.json({
      todo: {
        pendingRooms,
        pendingProperties,
        pendingCompanies: canManageCompanies ? pendingCompanies : null,
        activeLeads,
        openInquiries,
        inquiries: inquiryList,
      },
      health: {
        roomsNoImage,
        propsNoCompany,
        propsNoGeo,
        staleRooms,
        overdueUpcoming,
      },
      pulse: {
        weekly: weekly.map(w => ({ tuan: w.tuan, tin: Number(w.tin) })),
        topCompanies: topCompanies.map(c => ({ ...c, tin: Number(c.tin) })),
        topRooms,
        totalViews: viewsAgg._sum.viewCount || 0,
        linkViews: linkViewsAgg._sum.viewCount || 0,
        newRooms7d,
        newUsers7d,
      },
      totals: {
        totalProperties, totalRooms, availableRooms, totalCompanies,
        totalBrokers, totalLandlords, totalDeals, confirmedDeals,
        totalRevenue: canSeeFinancials ? revenueAgg._sum.commissionCompany || 0 : null,
        totalCommission: canSeeFinancials ? revenueAgg._sum.commissionTotal || 0 : null,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/overview error:', error);
    return NextResponse.json({ error: 'Không tải được số liệu tổng quan' }, { status: 500 });
  }
}
