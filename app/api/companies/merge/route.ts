import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions-server';

/**
 * POST /api/companies/merge — gộp nhiều công ty trùng về 1 công ty GIỮ LẠI.
 * Body: { keeperId, mergeIds: string[] }.
 * Chuyển TẤT CẢ tòa nhà của các công ty mergeIds về keeper, rồi XOÁ mergeIds (đã rỗng).
 * Transaction — an toàn (kiểm 0 tòa còn sót mới xoá). Cần MANAGE_COMPANIES (ADMIN bypass).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denial = requirePermission(session, 'MANAGE_COMPANIES');
  if (denial) return denial;

  const body = await req.json();
  const keeperId: string = body.keeperId;
  const mergeIds: string[] = Array.isArray(body.mergeIds) ? body.mergeIds.filter((x: any) => typeof x === 'string' && x !== keeperId) : [];
  if (!keeperId || mergeIds.length === 0) {
    return NextResponse.json({ error: 'Thiếu keeperId hoặc danh sách công ty cần gộp' }, { status: 400 });
  }

  // Kiểm tất cả tồn tại
  const all = await prisma.company.findMany({ where: { id: { in: [keeperId, ...mergeIds] } }, select: { id: true } });
  if (all.length !== mergeIds.length + 1) {
    return NextResponse.json({ error: 'Có công ty không tồn tại' }, { status: 400 });
  }

  try {
    const res = await prisma.$transaction(async (tx) => {
      const moved = await tx.property.updateMany({ where: { companyId: { in: mergeIds } }, data: { companyId: keeperId } });
      const stillHave = await tx.property.count({ where: { companyId: { in: mergeIds } } });
      if (stillHave !== 0) throw new Error(`Còn ${stillHave} tòa chưa chuyển — huỷ, không xoá`);
      const del = await tx.company.deleteMany({ where: { id: { in: mergeIds } } });
      return { moved: moved.count, deleted: del.count };
    });
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Lỗi khi gộp công ty' }, { status: 500 });
  }
}
