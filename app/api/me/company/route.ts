import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getUserCompany } from '@/lib/user-company';
import { applyRateLimit } from '@/lib/rate-limit';
import { companySelfUpdateSchema, validateBody } from '@/lib/validations';
import { normalizeZaloInput } from '@/lib/zalo';

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const company = await getUserCompany(session.user.id);
  // Chủ nhà chỉ sửa được công ty do CHÍNH MÌNH tạo → nói luôn cho client biết để ẩn/hiện form.
  let canEdit = false;
  if (company?.id && session.user.id) {
    const owned = await prisma.company.findFirst({
      where: { id: company.id, createdById: session.user.id },
      select: { id: true },
    });
    canEdit = !!owned;
  }
  return NextResponse.json({ company, canEdit });
}

/**
 * Công ty TỰ sửa hồ sơ của mình — dành cho CHỦ NHÀ đã tạo ra công ty đó.
 *
 * Trước đây sửa công ty chỉ có PUT /api/companies (gate MANAGE_COMPANIES = admin), nên chủ nhà
 * tạo công ty xong là không đổi được gì, kể cả cái logo hiện trên trang kho phòng của chính họ.
 *
 * Quyền: chỉ người có `createdById` = mình MỚI sửa được, và chỉ các trường nhận diện/liên hệ.
 * Tên công ty, mã, isActive, isApproved vẫn thuộc về admin (đổi tên hay tự duyệt là chuyện khác).
 */
export async function PUT(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const validated = validateBody(companySelfUpdateSchema, await req.json());
    if (!validated.success) return NextResponse.json({ error: validated.error }, { status: 400 });

    const { id, ...data } = validated.data;

    const owned = await prisma.company.findFirst({
      where: { id, createdById: session.user.id },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json(
        { error: 'Bạn không có quyền sửa công ty này. Liên hệ quản trị viên để được hỗ trợ.' },
        { status: 403 },
      );
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(data.logo !== undefined && { logo: data.logo || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.zaloGroupLink !== undefined && { zaloGroupLink: normalizeZaloInput(data.zaloGroupLink) }),
      },
      select: {
        id: true, name: true, logo: true, phone: true,
        email: true, address: true, description: true, zaloGroupLink: true,
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error('PUT /api/me/company error:', error);
    return NextResponse.json({ error: 'Không cập nhật được thông tin công ty' }, { status: 500 });
  }
}
