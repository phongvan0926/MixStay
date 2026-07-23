import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';

/**
 * "Săn phòng": khách (KHÔNG cần tài khoản) để lại tiêu chí + SĐT.
 * - POST: public, rate-limit 'auth' chống spam — tạo yêu cầu săn phòng.
 * - GET:  admin-family — danh sách lead để gọi lại.
 * - PUT:  admin-family — bật/tắt (gọi xong/khách thuê rồi thì tắt).
 * Khi tin mới được duyệt khớp tiêu chí → notification cho ADMIN (xem PUT /api/rooms).
 */
const PHONE_RE = /^0\d{9}$/;

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'auth');
  if (rateLimited) return rateLimited;
  try {
    const body = await req.json();
    const phone = String(body.phone || '').replace(/\D/g, '');
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ error: 'Số điện thoại chưa đúng (10 số, bắt đầu bằng 0)' }, { status: 400 });
    }
    const district = String(body.district || '').slice(0, 200) || null;
    const typeName = String(body.typeName || '').slice(0, 20) || null;
    const minPrice = Number(body.minPrice) > 0 ? Number(body.minPrice) : null;
    const maxPrice = Number(body.maxPrice) > 0 ? Number(body.maxPrice) : null;
    const name = String(body.name || '').slice(0, 100) || null;
    const note = String(body.note || '').slice(0, 300) || null;

    // Chống trùng: cùng SĐT + cùng tiêu chí đang bật → không tạo bản ghi mới
    const dup = await prisma.savedSearch.findFirst({
      where: { phone, district, typeName, minPrice, maxPrice, isActive: true },
    });
    if (dup) return NextResponse.json({ ok: true, id: dup.id, duplicated: true });

    const created = await prisma.savedSearch.create({
      data: { phone, name, district, typeName, minPrice, maxPrice, note },
    });

    // Báo admin có khách săn phòng mới (lead chủ động liên hệ ngay cũng được)
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map(a => ({
          userId: a.id,
          type: 'saved_search',
          title: '🔔 Khách săn phòng mới',
          message: `${name || 'Khách'} (${phone}) cần: ${[district, typeName, maxPrice ? `≤${(maxPrice / 1e6).toFixed(1)}tr` : ''].filter(Boolean).join(' · ') || 'chưa rõ tiêu chí'}`,
          link: '/admin/leads',
        })),
      });
    }
    return NextResponse.json({ ok: true, id: created.id });
  } catch (error: any) {
    console.error('POST /api/saved-searches error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'ADMIN_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(req.url);
    const { page, limit, skip } = getPaginationParams(url);
    const onlyActive = url.searchParams.get('active') !== 'false';
    const where = onlyActive ? { isActive: true } : {};
    const [rows, total] = await Promise.all([
      prisma.savedSearch.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.savedSearch.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(rows, total, page, limit));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'ADMIN_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    const updated = await prisma.savedSearch.update({
      where: { id: body.id },
      data: { isActive: !!body.isActive },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
