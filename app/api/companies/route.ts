import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
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
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'Tên công ty là bắt buộc' }, { status: 400 });

    const company = await prisma.company.create({
      data: {
        name: body.name,
        description: body.description || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        logo: body.logo || null,
        zaloGroupLink: body.zaloGroupLink || null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        ...(data.zaloGroupLink !== undefined && { zaloGroupLink: data.zaloGroupLink || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json(company);
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
