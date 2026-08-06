import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { profileUpdateSchema, validateBody } from '@/lib/validations';

/**
 * Hồ sơ CỦA CHÍNH MÌNH — mọi user đã đăng nhập.
 *
 * Trước đây chỉ có PUT /api/users (gated MANAGE_USERS = admin) nên CTV KHÔNG có cách nào tự
 * điền số điện thoại → link chia sẻ của họ không có nút liên hệ về đúng người. Route này cho
 * user tự sửa name + phone của mình, KHÔNG đụng tới role/permissions/isActive (chống tự nâng quyền).
 */
export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, avatar: true, phoneConfirmedAt: true },
  });
  if (!user) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // "Số này đúng" trên banner cảnh báo — chỉ tắt nhắc, KHÔNG đụng field nào khác.
    if (body?.phoneConfirmed === true) {
      const user = await prisma.user.update({
        where: { id: session.user.id },
        data: { phoneConfirmedAt: new Date() },
        select: { id: true, phone: true, phoneConfirmedAt: true },
      });
      return NextResponse.json(user);
    }

    const validated = validateBody(profileUpdateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { name, phone, avatar } = validated.data;

    // SĐT là field đăng nhập (lib/auth cho phép login bằng phone) → không cho trùng người khác.
    // CHỈ kiểm khi client thực sự gửi phone: `where: { phone: undefined }` bị Prisma BỎ QUA,
    // truy vấn thành "user bất kỳ khác mình" → sửa mỗi tên cũng ăn 409 oan.
    if (phone) {
      const taken = await prisma.user.findFirst({
        where: { phone, NOT: { id: session.user.id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: 'Số điện thoại này đã được tài khoản khác sử dụng' }, { status: 409 });
      }
    }

    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    });

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name, phone,
        // avatar: undefined = client không gửi (giữ nguyên); '' = người dùng bấm "Gỡ ảnh" → null.
        ...(avatar !== undefined && { avatar: avatar || null }),
        // Đổi sang số khác → bỏ xác nhận cũ, số mới phải được kiểm lại từ đầu
        ...(phone !== undefined && phone !== current?.phone && { phoneConfirmedAt: null }),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, avatar: true, phoneConfirmedAt: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('PUT /api/users/me error:', error);
    return NextResponse.json({ error: 'Không cập nhật được hồ sơ' }, { status: 500 });
  }
}
