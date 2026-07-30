import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';

/**
 * "Đặt lịch xem phòng" — khách để lại SĐT ngay trên một tin cụ thể.
 *
 * Điểm cốt lõi: CTV được ghi công suy ra từ SHARE TOKEN phía server, KHÔNG nhận brokerId
 * do client gửi (nếu tin client thì ai cũng cướp được lead của người khác).
 */

const STATUSES = ['NEW', 'CONTACTED', 'DONE', 'CANCELLED'] as const;
type Status = (typeof STATUSES)[number];

const isPhone = (s: string) => /^0\d{9}$/.test(s.replace(/\D/g, ''));

export async function POST(req: NextRequest) {
  // Rate limit chặt như đăng nhập: form công khai, không đăng nhập → dễ bị spam.
  const limited = await applyRateLimit(req, 'auth');
  if (limited) return limited;

  try {
    const body = await req.json();
    const roomTypeId: string = (body.roomTypeId || '').trim();
    const phoneRaw: string = (body.phone || '').trim();
    const phone = phoneRaw.replace(/\D/g, '');
    const name: string | null = (body.name || '').trim().slice(0, 80) || null;
    const note: string | null = (body.note || '').trim().slice(0, 500) || null;
    const shareToken: string | null = (body.shareToken || '').trim() || null;
    const companyId: string | null = (body.companyId || '').trim() || null;

    if (!roomTypeId) return NextResponse.json({ error: 'Thiếu tin đăng' }, { status: 400 });
    if (!isPhone(phone)) {
      return NextResponse.json({ error: 'Số điện thoại chưa đúng (10 số, bắt đầu bằng 0)' }, { status: 400 });
    }

    // Chỉ nhận lead cho tin đang hiển thị công khai — tránh dò id tin ẩn/chưa duyệt.
    const roomType = await prisma.roomType.findFirst({
      where: {
        id: roomTypeId,
        isApproved: true,
        property: { status: 'APPROVED', isActive: true },
      },
      select: { id: true, name: true, listingCode: true, property: { select: { district: true, landlordId: true } } },
    });
    if (!roomType) return NextResponse.json({ error: 'Tin đăng không tồn tại' }, { status: 404 });

    // Ghi công CTV theo token: token còn hiệu lực + đúng của CTV thì lead thuộc về người đó.
    let brokerId: string | null = null;
    let source = companyId ? 'company' : 'tin';
    if (shareToken) {
      const link = await prisma.shareLink.findFirst({
        where: { token: shareToken, isActive: true },
        select: { brokerId: true, isSystem: true, expiresAt: true },
      });
      if (link && (!link.expiresAt || link.expiresAt > new Date())) {
        brokerId = link.brokerId;
        source = link.isSystem ? 'system' : 'share';
      }
    }

    const request = await prisma.viewingRequest.create({
      data: { roomTypeId, brokerId, companyId, name, phone, note, source },
    });

    // Báo NGAY cho người phải gọi khách: CTV giữ link (nếu có) + toàn bộ admin.
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'ADMIN_STAFF'] }, isActive: true },
      select: { id: true },
    });
    const targets = new Map<string, string>(); // userId → link mở khi bấm thông báo
    if (brokerId) targets.set(brokerId, '/broker/leads');
    for (const a of admins) if (!targets.has(a.id)) targets.set(a.id, '/admin/leads?tab=xem-phong');

    if (targets.size > 0) {
      const who = name ? `${name} (${phone})` : phone;
      await prisma.notification.createMany({
        data: Array.from(targets, ([userId, link]) => ({
          userId,
          type: 'viewing_request',
          title: '📅 Khách xin xem phòng',
          message: `${who} muốn xem "${roomType.name}"${roomType.property?.district ? ` — ${roomType.property.district}` : ''}${note ? `. Ghi chú: ${note}` : ''}`,
          link,
        })),
      });
    }

    return NextResponse.json({ id: request.id, ok: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/viewing-requests error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, 'api');
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    const isAdminFamily = role === 'ADMIN' || role === 'ADMIN_STAFF';
    if (!session || (!isAdminFamily && role !== 'BROKER')) {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const url = new URL(req.url);
    const { page, limit, skip } = getPaginationParams(url);
    const status = url.searchParams.get('status');

    // CTV chỉ thấy lead từ link CỦA MÌNH; admin thấy tất cả.
    const where: any = isAdminFamily ? {} : { brokerId: session.user.id };
    if (status && (STATUSES as readonly string[]).includes(status)) where.status = status;

    const [data, total] = await Promise.all([
      prisma.viewingRequest.findMany({
        where,
        include: {
          roomType: {
            select: {
              id: true, name: true, listingCode: true, priceMonthly: true, areaSqm: true,
              property: { select: { district: true, streetName: true } },
            },
          },
          broker: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.viewingRequest.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    console.error('GET /api/viewing-requests error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const limited = await applyRateLimit(req, 'api');
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    const isAdminFamily = role === 'ADMIN' || role === 'ADMIN_STAFF';
    if (!session || (!isAdminFamily && role !== 'BROKER')) {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const { id, status } = await req.json();
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    if (!STATUSES.includes(status as Status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    // CTV chỉ đổi được lead của chính mình.
    const where = isAdminFamily ? { id } : { id, brokerId: session.user.id };
    const owned = await prisma.viewingRequest.findFirst({ where, select: { id: true } });
    if (!owned) return NextResponse.json({ error: 'Không có quyền với yêu cầu này' }, { status: 403 });

    const updated = await prisma.viewingRequest.update({ where: { id }, data: { status } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/viewing-requests error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
