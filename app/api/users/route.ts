import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { userCreateSchema, userUpdateSchema, validateBody } from '@/lib/validations';
import { requirePermission } from '@/lib/permissions-server';

// Safe user select — NEVER return password
const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  permissions: true,
  createdAt: true,
} as const;

function guardManageUsers(session: any) {
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'ADMIN') return null;
  if (session.user.role === 'ADMIN_STAFF') {
    return requirePermission(session, 'MANAGE_USERS');
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Staff không được tạo/promote người khác lên role=ADMIN (privilege escalation prevention). */
function guardRoleEscalation(session: any, targetRole?: string) {
  if (session.user.role === 'ADMIN_STAFF' && targetRole === 'ADMIN') {
    return NextResponse.json({ error: 'Staff không thể tạo/gán role Super Admin' }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const denial = guardManageUsers(session);
    if (denial) return denial;

    const url = new URL(req.url);
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    const where: any = {};
    if (role) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const { page, limit, skip } = getPaginationParams(url);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: safeUserSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(users, total, page, limit));
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const denial = guardManageUsers(session);
    if (denial) return denial;

    const body = await req.json();
    const validated = validateBody(userCreateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { name, email, phone, password, role, isActive, permissions } = validated.data;

    const esc = guardRoleEscalation(session, role);
    if (esc) return esc;

    // Email không bắt buộc — chỉ chống trùng khi có nhập email.
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 400 });
      }
    }

    const hashed = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name, email: email || null, phone: phone || null, password: hashed, role,
        isActive: isActive ?? true,
        permissions: role === 'ADMIN_STAFF' ? (permissions ?? []) : [],
      },
      select: safeUserSelect,
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const denial = guardManageUsers(session);
    if (denial) return denial;

    const body = await req.json();
    const validated = validateBody(userUpdateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { id, name, email, phone, password, role, isActive, permissions } = validated.data;

    const currentUserId = (session!.user as any).id;

    const esc = guardRoleEscalation(session, role);
    if (esc) return esc;

    // Không cho đổi role chính mình
    if (id === currentUserId && role) {
      const self = await prisma.user.findUnique({ where: { id } });
      if (self && self.role !== role) {
        return NextResponse.json({ error: 'Không thể đổi vai trò của chính mình' }, { status: 400 });
      }
    }

    if (email) {
      const existing = await prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (existing) {
        return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Permissions chỉ có ý nghĩa với ADMIN_STAFF. Nếu role đổi sang khác → reset.
    if (permissions !== undefined || role) {
      const effectiveRole = role ?? (await prisma.user.findUnique({ where: { id }, select: { role: true } }))?.role;
      if (effectiveRole === 'ADMIN_STAFF') {
        if (permissions !== undefined) updateData.permissions = permissions;
      } else {
        updateData.permissions = [];
      }
    }

    if (password && password.trim().length > 0) {
      updateData.password = await hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: safeUserSelect,
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const denial = guardManageUsers(session);
    if (denial) return denial;

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    const currentUserId = (session!.user as any).id;
    if (id === currentUserId) {
      return NextResponse.json({ error: 'Không thể xoá tài khoản đang đăng nhập' }, { status: 400 });
    }

    const [propertyCount, dealCount, shareLinkCount] = await Promise.all([
      prisma.property.count({ where: { landlordId: id } }),
      prisma.deal.count({ where: { brokerId: id } }),
      prisma.shareLink.count({ where: { brokerId: id } }),
    ]);

    const hasRelated = propertyCount > 0 || dealCount > 0 || shareLinkCount > 0;

    if (hasRelated) {
      // Soft delete
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ deleted: false, deactivated: true, message: 'Đã vô hiệu hoá (có dữ liệu liên quan)' });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ deleted: true, deactivated: false, message: 'Đã xoá tài khoản' });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
