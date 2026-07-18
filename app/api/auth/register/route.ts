import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { registerSchema, validateBody } from '@/lib/validations';

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'auth');
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const validated = validateBody(registerSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { name, email, phone, password, role, companyName } = validated.data;

    // Email không bắt buộc — chỉ chống trùng khi có nhập email
    if (email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 400 });
      }
    }
    // SĐT là định danh đăng nhập → enforce duy nhất ở tầng ứng dụng (không đổi schema)
    if (phone) {
      const phoneExists = await prisma.user.findFirst({ where: { phone } });
      if (phoneExists) {
        return NextResponse.json({ error: 'Số điện thoại đã được sử dụng' }, { status: 400 });
      }
    }

    const hashedPassword = await hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email: email || null, phone: phone || null, password: hashedPassword, role },
      select: { id: true, name: true, email: true, role: true },
    });

    // Chủ nhà đăng ký kèm tên công ty → tạo công ty CHỜ DUYỆT (createdById = chính họ) +
    // nhắc admin duyệt. Duyệt công ty sẽ tự duyệt các tòa của công ty (xem PUT /api/companies).
    if (role === 'LANDLORD' && companyName && companyName.trim()) {
      try {
        const company = await prisma.company.create({
          data: { name: companyName.trim(), isApproved: false, isActive: true, createdById: user.id },
        });
        const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'ADMIN_STAFF'] }, isActive: true }, select: { id: true } });
        if (admins.length) {
          await prisma.notification.createMany({
            data: admins.map(a => ({
              userId: a.id,
              type: 'company_pending',
              title: 'Công ty mới chờ duyệt',
              message: `${name} vừa đăng ký chủ nhà và tạo công ty "${company.name}" — cần duyệt.`,
              link: `/admin/companies`,
            })),
          });
        }
      } catch { /* lỗi tạo công ty không được chặn việc đăng ký tài khoản */ }
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
