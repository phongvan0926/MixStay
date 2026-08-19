import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { appointmentLabel } from '@/lib/appointment';
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

    // LỊCH HẸN CÓ CẤU TRÚC. Chỉ nhận ngày dạng YYYY-MM-DD và buổi trong danh sách cố định —
    // dữ liệu này về sau dùng để LỌC/ĐẾM ở server ("hẹn hôm nay"), rác lọt vào là hỏng bộ đếm.
    // Ngày quá khứ hoặc quá 60 ngày tới → bỏ qua, coi như khách không chọn.
    // QUY ƯỚC (xem prisma/schema.prisma): giờ hẹn LUÔN nằm trong preferredDate, nhờ vậy trang
    // "Lịch khách xem phòng" chỉ cần orderBy preferredDate là ra đúng thứ tự.
    //   - Khách chọn GIỜ CỤ THỂ  → preferredDate = ngày + giờ đó, preferredSlot = null
    //   - Khách chỉ chọn BUỔI    → preferredDate = ngày + giờ ĐẠI DIỆN, preferredSlot = buổi
    // Không có giờ đại diện thì mọi lịch "chỉ chọn buổi" đều là 00:00 và bị xếp lên trước cả
    // lịch 7h sáng cùng ngày.
    // 'day' = biết ngày chưa biết giờ (chỉ sinh khi bóc ghi chú cũ, form không gửi) — xem lib/appointment.ts
    const SLOT_HOUR: Record<string, string> = { morning: '08:00', afternoon: '14:00', evening: '19:00', day: '09:00' };
    const rawDate: string = (body.preferredDate || '').trim();
    const rawSlot: string = (body.preferredSlot || '').trim();
    const rawTime: string = (body.preferredTime || '').trim();

    let preferredDate: Date | null = null;
    let preferredSlot: string | null = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      // Giờ cụ thể thắng buổi; giờ phải hợp lệ 00:00–23:59, sai thì bỏ qua (không đoán bừa).
      const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(rawTime) ? rawTime : '';
      // Khách chọn NGÀY mà bỏ trống cả buổi lẫn giờ → slot 'day' (biết ngày, chưa chốt giờ).
      // KHÔNG được để rơi về 00:00 + slot null: màn hình sẽ in "Hẹn 00:00 16/08" và người dẫn
      // khách bị hẹn lúc nửa đêm. Lỗi thật 15/08/2026, một khách đã dính trước khi vá.
      const slot = validTime ? '' : (SLOT_HOUR[rawSlot] ? rawSlot : 'day');
      const clock = validTime || SLOT_HOUR[slot];

      const d = new Date(`${rawDate}T${clock}:00+07:00`); // giờ VN — tránh lệch ngày do UTC
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (!isNaN(d.getTime()) && d.getTime() >= today.getTime() - 86400000
          && d.getTime() <= Date.now() + 60 * 86400000) {
        preferredDate = d;
        preferredSlot = slot || null;
      }
    }

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
      data: { roomTypeId, brokerId, companyId, name, phone, note, source, preferredDate, preferredSlot },
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
      const appt = appointmentLabel(preferredDate, preferredSlot);
      await prisma.notification.createMany({
        data: Array.from(targets, ([userId, link]) => ({
          userId,
          type: 'viewing_request',
          title: '📅 Khách xin xem phòng',
          // Giờ hẹn đứng NGAY SAU tên khách: người nhận thông báo cần biết "phải gọi trước
          // lúc nào" chứ không phải đọc hết câu mới thấy.
          message: `${who}${appt ? ` — ${appt.text}` : ''} muốn xem "${roomType.name}"${roomType.property?.district ? ` — ${roomType.property.district}` : ''}${note ? `. Ghi chú: ${note}` : ''}`,
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
    const appt = url.searchParams.get('appt'); // 'today' = có hẹn hôm nay/ngày mai
    // view=schedule → TRANG LỊCH: chỉ khách ĐÃ chọn giờ hẹn, xếp theo thời gian gần nhất
    // trước (không phải theo lúc gửi form như bảng lead), kèm địa chỉ ĐẦY ĐỦ cho người dẫn.
    const schedule = url.searchParams.get('view') === 'schedule';
    const guide = url.searchParams.get('guide'); // 'no' = chưa gửi người dẫn | 'yes' = đã gửi

    // Mốc ngày theo GIỜ VN — server Vercel chạy UTC, lấy nhầm mốc là "hẹn hôm nay" lệch 1 ngày.
    const vnMidnight = (offsetDays: number) => {
      const now = new Date();
      const vn = new Date(now.getTime() + 7 * 3600000); // → giờ VN
      const d = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + offsetDays);
      return new Date(d - 7 * 3600000); // → mốc UTC tương ứng 00:00 giờ VN
    };
    const apptWindow = { gte: vnMidnight(0), lt: vnMidnight(2) }; // hôm nay + ngày mai

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
    if (schedule) {
      // Lịch chỉ tính từ ĐẦU HÔM NAY trở đi — lịch hôm qua là việc đã qua, không phải kế hoạch.
      where.preferredDate = { gte: vnMidnight(0) };
      if (!where.status) where.status = { in: ['NEW', 'CONTACTED'] };
      if (guide === 'no') where.guideSentAt = null;
      if (guide === 'yes') where.guideSentAt = { not: null };
    }
    if (appt === 'today') {
      // "Hẹn hôm nay/mai" — việc phải chạy trong 48h tới. Chỉ tính lead chưa dẫn xem xong.
      where.preferredDate = apptWindow;
      if (!where.status) where.status = { in: ['NEW', 'CONTACTED'] };
    }

    const [data, total, grouped, overdueCount, apptCount, guideGroups] = await Promise.all([
      prisma.viewingRequest.findMany({
        where,
        include: {
          roomType: {
            select: {
              id: true, name: true, listingCode: true, priceMonthly: true, areaSqm: true,
              // fullAddress + zaloPhone CHỈ cho người trong nhà: endpoint này đã chặn ở đầu
              // handler, chỉ ADMIN/ADMIN_STAFF/BROKER vào được. Người dẫn khách cần địa chỉ
              // thật mới tới nơi được — bản redact ("Ngõ 103 …") không đủ để đi.
              property: { select: { district: true, streetName: true, fullAddress: true, zaloPhone: true } },
            },
          },
          broker: { select: { id: true, name: true, phone: true } },
          // Deal đã ghi từ lead này (nếu có) — để bảng hiện "💰 Đã chốt N triệu" và KHÔNG
          // mời ghi lại lần nữa. Chỉ lấy 3 field, không kéo cả hoa hồng ra bảng lead.
          deal: { select: { id: true, dealPrice: true, status: true } },
        },
        // Trang lịch xếp theo GIỜ HẸN gần nhất trước; bảng lead vẫn theo lúc khách gửi.
        orderBy: schedule ? { preferredDate: 'asc' } : { createdAt: 'desc' },
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
      // Đếm trên TOÀN TẬP (không phải trang hiện tại) — chip "Hẹn hôm nay" mà đếm 20 dòng
      // đang hiện thì khách hẹn chiều nay nằm ở trang 2 sẽ biến mất khỏi số đếm.
      prisma.viewingRequest.count({
        where: { ...base, status: { in: ['NEW', 'CONTACTED'] }, preferredDate: apptWindow },
      }),
      // Lịch sắp tới, tách theo đã/chưa giao người dẫn — đếm trên TOÀN TẬP cho chip trang Lịch.
      prisma.viewingRequest.groupBy({
        by: ['guideSentAt'],
        where: { ...base, status: { in: ['NEW', 'CONTACTED'] }, preferredDate: { gte: vnMidnight(0) } },
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = { NEW: 0, CONTACTED: 0, DONE: 0, CANCELLED: 0 };
    for (const g of grouped) counts[g.status] = g._count._all;
    counts.PENDING = counts.NEW + counts.CONTACTED;
    counts.ALL = counts.PENDING + counts.DONE + counts.CANCELLED;
    counts.OVERDUE = overdueCount;
    counts.APPT = apptCount;
    // groupBy trả từng mốc thời gian khác nhau → gộp lại thành 2 nhóm đã gửi / chưa gửi
    counts.SCHEDULE_PENDING = guideGroups.filter(g => g.guideSentAt === null)
      .reduce((n, g) => n + g._count._all, 0);
    counts.SCHEDULE_SENT = guideGroups.filter(g => g.guideSentAt !== null)
      .reduce((n, g) => n + g._count._all, 0);
    counts.SCHEDULE = counts.SCHEDULE_PENDING + counts.SCHEDULE_SENT;

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

    const { id, status, guideSent } = await req.json();
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    // Hai việc khác nhau qua cùng một cửa: đổi TRẠNG THÁI lead, hoặc đánh dấu ĐÃ GIAO NGƯỜI
    // DẪN KHÁCH. Gửi guideSent thì không bắt buộc kèm status (và ngược lại).
    const data: any = {};
    if (typeof guideSent === 'boolean') data.guideSentAt = guideSent ? new Date() : null;
    if (status !== undefined) {
      if (!STATUSES.includes(status as Status)) {
        return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
      }
      data.status = status;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Không có gì để cập nhật' }, { status: 400 });
    }

    // CTV chỉ đổi được lead của chính mình.
    const where = isAdminFamily ? { id } : { id, brokerId: session.user.id };
    const owned = await prisma.viewingRequest.findFirst({ where, select: { id: true } });
    if (!owned) return NextResponse.json({ error: 'Không có quyền với yêu cầu này' }, { status: 403 });

    const updated = await prisma.viewingRequest.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/viewing-requests error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
