import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { needsPhoneWarning, checkPhone } from '@/lib/phone';
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
      pendingRooms, pendingProperties, pendingCompanies, activeLeads, openInquiries, newViewingRequests,
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
      // Khách xin xem phòng chưa ai gọi — lead nóng nhất, để tụt là mất khách.
      prisma.viewingRequest.count({ where: { status: 'NEW' } }),

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

    // ⚠️ SĐT sai định dạng — khách bấm gọi/Zalo không tới nơi mà không ai biết.
    // Lọc bằng JS (không phải SQL) vì luật số VN cần regex + bóc số; dữ liệu chỉ vài chục bản ghi.
    const [allCompanies, allUsers] = await Promise.all([
      prisma.company.findMany({
        where: { phoneConfirmedAt: null, phone: { not: null } },
        select: { id: true, name: true, phone: true },
      }),
      prisma.user.findMany({
        where: { phoneConfirmedAt: null, phone: { not: null }, isActive: true },
        select: { id: true, name: true, email: true, role: true, phone: true },
      }),
    ]);
    const badPhones = {
      companies: allCompanies
        .filter(c => needsPhoneWarning(c.phone))
        .map(c => ({ ...c, reason: checkPhone(c.phone).reason })),
      users: allUsers
        .filter(u => needsPhoneWarning(u.phone))
        .map(u => ({ ...u, reason: checkPhone(u.phone).reason })),
    };

    // ── CUNG ↔ CẦU theo quận ────────────────────────────────────────────────
    // Trả lời câu hỏi "đẩy CTV đi gom hàng ở đâu": quận nào khách hỏi nhiều mà kho mỏng
    // (cháy hàng), quận nào ôm hàng mà không ai hỏi (vốn chết). Đo 14/08/2026: Hai Bà Trưng
    // hút 33% lượng khách bằng 4% kho, còn Cầu Giấy ôm 134 tin chỉ ra 4 khách.
    const [supplyRows, demandRows] = await Promise.all([
      prisma.roomType.findMany({
        where: { isApproved: true, status: 'AVAILABLE', property: { status: 'APPROVED' } },
        select: { property: { select: { district: true } } },
      }),
      prisma.viewingRequest.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 90 * 86400000) } },
        select: { roomType: { select: { property: { select: { district: true } } } } },
      }),
    ]);
    const supplyBy = new Map<string, number>();
    const demandBy = new Map<string, number>();
    for (const r of supplyRows) {
      const d = r.property?.district;
      if (d) supplyBy.set(d, (supplyBy.get(d) || 0) + 1);
    }
    for (const v of demandRows) {
      const d = v.roomType?.property?.district;
      if (d) demandBy.set(d, (demandBy.get(d) || 0) + 1);
    }
    const supplyDemand = Array.from(new Set(Array.from(supplyBy.keys()).concat(Array.from(demandBy.keys()))))
      .map(district => {
        const tin = supplyBy.get(district) || 0;
        const khach = demandBy.get(district) || 0;
        // "Bao nhiêu tin mới đẻ ra 1 khách" — càng THẤP càng cháy hàng, cần gom thêm gấp.
        return { district, tin, khach, tinMoiKhach: khach > 0 ? Math.round((tin / khach) * 10) / 10 : null };
      })
      .filter(r => r.tin >= 5 || r.khach > 0)
      .sort((a, b) => {
        // Cháy hàng lên đầu; quận 0 khách xếp cuối (không phải "tốt nhất", là hàng chết)
        if (a.tinMoiKhach === null) return 1;
        if (b.tinMoiKhach === null) return -1;
        return a.tinMoiKhach - b.tinMoiKhach;
      });

    return NextResponse.json({
      badPhones,
      supplyDemand,
      todo: {
        pendingRooms,
        pendingProperties,
        pendingCompanies: canManageCompanies ? pendingCompanies : null,
        newViewingRequests,
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
