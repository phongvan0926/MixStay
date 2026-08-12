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
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
    const broker = url.searchParams.get('broker'); // 'yes' = qua CTV | 'no' = khách tự tìm
    const days = parseInt(url.searchParams.get('days') || '', 10);
    const overdue = url.searchParams.get('overdue') === 'true';

    // ── Bộ lọc phải chạy Ở SERVER, không phải lọc mảng của trang hiện tại ──────────────
    // Danh sách có phân trang: lọc 20 dòng đang hiện thì "🔴 Mới" của trang 3 không bao giờ
    // hiện ra — admin tưởng đã gọi hết trong khi vẫn còn khách chờ. Vì vậy mọi điều kiện đều
    // nằm trong `where` của Prisma, và số đếm trên chip lấy bằng groupBy trên TOÀN BỘ tập.
    // CTV chỉ thấy lead từ link CỦA MÌNH; admin thấy tất cả.
    const base: any = isAdminFamily ? {} : { brokerId: session.user.id };

    if (q) {
      const digits = q.replace(/\D/g, '');
      base.OR = [
        ...(digits ? [{ phone: { contains: digits } }] : []),
        { name: { contains: q, mode: 'insensitive' } },
        { note: { contains: q, mode: 'insensitive' } },
        { roomType: { name: { contains: q, mode: 'insensitive' } } },
        { roomType: { listingCode: { contains: q.toUpperCase() } } },
      ];
    }
    // Lọc "qua CTV / khách tự tìm" chỉ có nghĩa với admin — CTV vốn chỉ thấy lead của mình.
    if (isAdminFamily && broker === 'yes') base.brokerId = { not: null };
    if (isAdminFamily && broker === 'no') base.brokerId = null;
    if (days > 0) base.createdAt = { gte: new Date(Date.now() - days * 86400000) };

    const where: any = { ...base };
    if (overdue) {
      // "Quá 24h chưa gọi": còn NEW mà đã để quá một ngày — nhóm cần gọi gấp nhất.
      where.status = 'NEW';
      where.createdAt = { ...(base.createdAt || {}), lte: new Date(Date.now() - 86400000) };
    } else if (status === 'PENDING') {
      where.status = { in: ['NEW', 'CONTACTED'] };
    } else if (status && (STATUSES as readonly string[]).includes(status)) {
      where.status = status;
    }

    const [data, total, grouped, overdueCount] = await Promise.all([
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
      // Số đếm cho chip: tính trên `base` (đã áp dụng tìm kiếm/nguồn/thời gian) nhưng KHÔNG
      // áp dụng chính bộ lọc trạng thái — nếu không, chip đang chọn sẽ là chip duy nhất có số.
      prisma.viewingRequest.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
      prisma.viewingRequest.count({
        where: { ...base, status: 'NEW', createdAt: { ...(base.createdAt || {}), lte: new Date(Date.now() - 86400000) } },
      }),
    ]);

    const counts: Record<string, number> = { NEW: 0, CONTACTED: 0, DONE: 0, CANCELLED: 0 };
    for (const g of grouped) counts[g.status] = g._count._all;
    counts.PENDING = counts.NEW + counts.CONTACTED;
    counts.ALL = counts.PENDING + counts.DONE + counts.CANCELLED;
    counts.OVERDUE = overdueCount;

    return NextResponse.json({ ...paginatedResponse(data, total, page, limit), counts });
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
