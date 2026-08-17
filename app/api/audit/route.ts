import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';

/**
 * NHẬT KÝ THAO TÁC — chỉ ĐỌC, chỉ ADMIN (không mở cho ADMIN_STAFF).
 *
 * Staff bị loại có chủ đích: nhật ký là chỗ soi lại việc của chính staff, cho họ tự xem —
 * và biết mình đang bị ghi những gì — thì mất tác dụng giám sát. Không có đường ghi/sửa/xoá
 * qua API: nhật ký sửa được thì không còn là nhật ký.
 */
export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, 'api');
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const url = new URL(req.url);
    const { page, limit, skip } = getPaginationParams(url);
    const entity = url.searchParams.get('entity');
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');
    const q = (url.searchParams.get('q') || '').trim().slice(0, 60);

    // Lọc ở SERVER (danh sách có phân trang) — xem quy tắc trong CLAUDE.md
    const where: any = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (q) {
      where.OR = [
        { entityLabel: { contains: q, mode: 'insensitive' } },
        { userName: { contains: q, mode: 'insensitive' } },
        { entityId: q },
      ];
    }

    const [data, total, byAction, actors] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.auditLog.count({ where }),
      // Số đếm cho chip: áp dụng các bộ lọc KHÁC nhưng không áp dụng chính bộ lọc `action`
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { ...where, action: undefined },
        _count: { _all: true },
      }),
      prisma.auditLog.groupBy({
        by: ['userId', 'userName'],
        where: {},
        _count: { _all: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const g of byAction) counts[g.action] = g._count._all;

    return NextResponse.json({
      ...paginatedResponse(data, total, page, limit),
      counts,
      actors: actors.map(a => ({ userId: a.userId, userName: a.userName, count: a._count._all })),
    });
  } catch (error: any) {
    console.error('GET /api/audit error:', error);
    return NextResponse.json({ error: 'Không tải được nhật ký' }, { status: 500 });
  }
}
