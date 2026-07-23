import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/broker/stats — thống kê CÁ NHÂN của CTV đang đăng nhập:
 * tổng deal + hoa hồng, chuỗi 6 tháng, lượt xem link chia sẻ, và HẠNG trong tháng
 * (so mọi CTV theo hoa hồng CONFIRMED/PAID — chỉ trả vị trí, không lộ tên/số của người khác).
 */
export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'BROKER') {
      return NextResponse.json({ error: 'Chỉ dành cho cộng tác viên' }, { status: 403 });
    }
    const brokerId = session.user.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const DONE = ['CONFIRMED', 'PAID'] as const;

    const [byStatus, myDeals6m, monthAll, links] = await Promise.all([
      // Đếm deal của tôi theo trạng thái + tổng hoa hồng
      prisma.deal.groupBy({
        by: ['status'], where: { brokerId },
        _count: true, _sum: { commissionBroker: true },
      }),
      // Deal chốt 6 tháng gần nhất của tôi (vẽ chuỗi theo tháng)
      prisma.deal.findMany({
        where: { brokerId, status: { in: DONE as any }, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, commissionBroker: true },
      }),
      // Toàn bộ deal chốt THÁNG NÀY của mọi CTV → tính hạng (không trả chi tiết ra ngoài)
      prisma.deal.groupBy({
        by: ['brokerId'], where: { status: { in: DONE as any }, createdAt: { gte: monthStart } },
        _sum: { commissionBroker: true }, _count: true,
      }),
      prisma.shareLink.aggregate({
        where: { brokerId }, _count: true, _sum: { viewCount: true },
      }),
    ]);

    // Chuỗi 6 tháng: { "2026-02": {count, commission}, ... }
    const months: { key: string; label: string; count: number; commission: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `T${d.getMonth() + 1}`, count: 0, commission: 0 });
    }
    const byKey = new Map(months.map(m => [m.key, m]));
    for (const d of myDeals6m) {
      const k = `${d.createdAt.getFullYear()}-${String(d.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const m = byKey.get(k);
      if (m) { m.count++; m.commission += d.commissionBroker || 0; }
    }

    // Hạng tháng này theo hoa hồng
    const ranking = monthAll
      .map(r => ({ brokerId: r.brokerId, commission: r._sum.commissionBroker || 0, count: r._count }))
      .sort((a, b) => b.commission - a.commission);
    const myIdx = ranking.findIndex(r => r.brokerId === brokerId);
    const mine = myIdx >= 0 ? ranking[myIdx] : null;

    const statusMap: Record<string, { count: number; commission: number }> = {};
    for (const s of byStatus) statusMap[s.status] = { count: s._count, commission: s._sum.commissionBroker || 0 };

    return NextResponse.json({
      byStatus: statusMap,
      totalCommissionDone: (statusMap.CONFIRMED?.commission || 0) + (statusMap.PAID?.commission || 0),
      months,
      thisMonth: { rank: myIdx >= 0 ? myIdx + 1 : null, totalBrokers: ranking.length, count: mine?.count || 0, commission: mine?.commission || 0 },
      shareLinks: { count: links._count, views: links._sum.viewCount || 0 },
    });
  } catch (error: any) {
    console.error('/api/broker/stats error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
