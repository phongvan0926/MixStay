import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions-server';

/**
 * GET /api/users/stats — số liệu TỔNG toàn nền tảng (không theo trang, không theo bộ lọc).
 * Dùng cho các thẻ thống kê ở đầu trang Quản lý người dùng (trước đây cộng nhầm theo trang 20 dòng).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    const denial = requirePermission(session, 'MANAGE_USERS');
    if (denial) return denial;
  }

  const [byRoleRaw, active, total] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count(),
  ]);
  const byRole: Record<string, number> = {};
  byRoleRaw.forEach((g: any) => { byRole[g.role] = typeof g._count === 'number' ? g._count : g._count?._all ?? 0; });

  return NextResponse.json({ total, active, byRole });
}
