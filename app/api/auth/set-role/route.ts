import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'auth');
  if (rateLimited) return rateLimited;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { role } = await req.json();
  if (!['BROKER', 'LANDLORD', 'CUSTOMER'].includes(role)) {
    return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 });
  }

  const userId = (session.user as any).id;

  // Chỉ đặt vai trò MỘT LẦN, cho tài khoản OAuth chưa thiết lập. Trước đây route này
  // đặt được BẤT CỨ LÚC NÀO → một chủ nhà đang có tòa có thể tự đổi mình thành CTV
  // (hoặc ngược lại) để nhìn dữ liệu của vai trò kia. Vai trò ADMIN/ADMIN_STAFF vốn đã
  // bị chặn bởi danh sách ở trên nên không leo lên admin được, nhưng đổi qua lại vẫn sai.
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { setupComplete: true, role: true },
  });
  if (!current) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
  if (current.setupComplete) {
    return NextResponse.json(
      { error: 'Tài khoản đã thiết lập vai trò — liên hệ quản trị viên nếu cần đổi' },
      { status: 409 },
    );
  }

  await prisma.user.update({ where: { id: userId }, data: { role, setupComplete: true } });

  return NextResponse.json({ ok: true, role });
}
