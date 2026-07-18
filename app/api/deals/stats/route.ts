import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

/**
 * GET /api/deals/stats — số liệu TỔNG toàn nền tảng cho trang Giao dịch (không theo trang).
 * Hoa hồng CHỈ trả khi có quyền xem tài chính (ADMIN, hoặc ADMIN_STAFF có VIEW_FINANCIAL_REPORTS);
 * thiếu quyền → commission* = null (giữ đúng field-strip như GET /api/deals).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.role;
  const isAdminFamily = role === 'ADMIN' || role === 'ADMIN_STAFF';
  if (!isAdminFamily) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const canSeeFinancials = hasPermission(session.user as any, 'VIEW_FINANCIAL_REPORTS');

  const [byStatusRaw, total, money] = await Promise.all([
    prisma.deal.groupBy({ by: ['status'], _count: true }),
    prisma.deal.count(),
    prisma.deal.aggregate({
      where: { status: { in: ['CONFIRMED', 'PAID'] } },
      _sum: { commissionTotal: true, commissionCompany: true },
    }),
  ]);
  const byStatus: Record<string, number> = {};
  byStatusRaw.forEach((g: any) => { byStatus[g.status] = typeof g._count === 'number' ? g._count : g._count?._all ?? 0; });

  return NextResponse.json({
    total,
    byStatus,
    commissionTotal: canSeeFinancials ? (money._sum.commissionTotal ?? 0) : null,
    commissionCompany: canSeeFinancials ? (money._sum.commissionCompany ?? 0) : null,
  });
}
