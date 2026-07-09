import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { requirePermission } from '@/lib/permissions-server';
import { normalizeZaloInput } from '@/lib/zalo';

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope');

    // scope=active: danh sách công ty ĐANG HOẠT ĐỘNG + ĐÃ DUYỆT — cho các ô CHỌN công ty
    // (chủ nhà tự đăng tin, CTV lọc, form gán công ty). Mọi user đã đăng nhập đều gọi được.
    if (scope === 'active') {
      if (!session?.user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
      const activeCompanies = await prisma.company.findMany({
        where: { isActive: true, isApproved: true },
        select: { id: true, name: true, logo: true },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(activeCompanies);
    }

    // Mặc định: trang QUẢN TRỊ công ty — cần MANAGE_COMPANIES, trả TẤT CẢ (kể cả chờ duyệt).
    const denial = requirePermission(session, 'MANAGE_COMPANIES');
    if (denial) return denial;

    const search = url.searchParams.get('search');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: { select: { properties: true } },
        properties: {
          select: {
            _count: { select: { roomTypes: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add roomTypes count to _count
    const companiesWithRoomCount = companies.map(c => {
      const roomTypeCount = c.properties.reduce((sum, p) => sum + p._count.roomTypes, 0);
      const { properties: _props, ...rest } = c;
      return { ...rest, _count: { ...rest._count, roomTypes: roomTypeCount } };
    });

    return NextResponse.json(companiesWithRoomCount);
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    // Quản trị (MANAGE_COMPANIES) tạo → duyệt luôn. CHỦ NHÀ tự tạo → CHỜ DUYỆT (isApproved=false).
    const isManager = !requirePermission(session, 'MANAGE_COMPANIES');
    const role = (session.user as any).role;
    if (!isManager && role !== 'LANDLORD') {
      return NextResponse.json({ error: 'Không có quyền tạo công ty' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'Tên công ty là bắt buộc' }, { status: 400 });

    const isApproved = isManager ? (body.isApproved ?? true) : false;

    const company = await prisma.company.create({
      data: {
        name: body.name.trim(),
        description: body.description || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        logo: body.logo || null,
        zaloGroupLink: normalizeZaloInput(body.zaloGroupLink),
        isActive: isManager ? (body.isActive ?? true) : true,
        isApproved,
        createdById: (session.user as any).id || null,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const denial = requirePermission(session, 'MANAGE_COMPANIES');
    if (denial) return denial;

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.logo !== undefined && { logo: data.logo || null }),
        ...(data.zaloGroupLink !== undefined && { zaloGroupLink: normalizeZaloInput(data.zaloGroupLink) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        // Duyệt công ty (admin bấm "Duyệt") — duyệt thì đồng thời bật hoạt động.
        ...(data.isApproved !== undefined && { isApproved: data.isApproved, ...(data.isApproved ? { isActive: true } : {}) }),
      },
    });

    return NextResponse.json(company);
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const denial = requirePermission(session, 'MANAGE_COMPANIES');
    if (denial) return denial;

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    const propCount = await prisma.property.count({ where: { companyId: id } });
    if (propCount > 0) {
      return NextResponse.json({ error: `Công ty có ${propCount} tòa nhà, không thể xoá. Hãy chuyển tòa nhà sang công ty khác trước.` }, { status: 400 });
    }

    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ message: 'Đã xoá công ty' });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
