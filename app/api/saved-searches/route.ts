import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { countMatches, findMatches, matchAndNotify } from '@/lib/saved-search-match';

/**
 * "Săn phòng": khách (KHÔNG cần tài khoản) để lại tiêu chí + SĐT.
 * - POST: public, rate-limit 'auth' chống spam — tạo yêu cầu săn phòng.
 * - GET:  admin-family — danh sách lead để gọi lại.
 * - PUT:  admin-family — bật/tắt (gọi xong/khách thuê rồi thì tắt).
 *
 * KHỚP TIN 3 ĐƯỜNG (lib/saved-search-match.ts): khách vừa để lại tiêu chí → quét NGƯỢC kho
 * có sẵn ngay tại POST này; tin mới duyệt → quét XUÔI (PUT /api/rooms); và quét lại hằng
 * ngày (cron/lifecycle). Trước đây chỉ có đường thứ hai nên khách phải chờ vô thời hạn.
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
      data: { phone, name, district, typeName, minPrice, maxPrice, note, token: nanoid(12) },
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
          link: '/admin/leads?tab=saved',
        })),
      });
    }

    // QUÉT NGƯỢC KHO NGAY: khách vừa nêu tiêu chí thì kho thường đã sẵn hàng đúng ý —
    // không có lý do gì bắt họ chờ tới khi tình cờ có tin MỚI được duyệt. Lỗi ở đây
    // không được chặn response (khách đã để lại SĐT thành công rồi).
    let matchCount = 0;
    try {
      matchCount = await matchAndNotify({ ...created, name, phone });
    } catch (e) {
      console.error('saved-search reverse match error:', e);
    }
    return NextResponse.json({ ok: true, id: created.id, matchCount });
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

    // ?matchesFor=<id> → danh sách tin trong kho khớp tiêu chí của ĐÚNG khách đó, để admin
    // mở ra ngay tại bảng lead mà đọc mã tin cho khách qua điện thoại.
    const matchesFor = url.searchParams.get('matchesFor');
    if (matchesFor) {
      const s = await prisma.savedSearch.findUnique({ where: { id: matchesFor } });
      if (!s) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
      // Sinh token LƯỜI cho bản ghi cũ (trước khi có cột token): admin mở danh sách khớp
      // lần đầu là có ngay link theo dõi /san-phong/<token> để kèm vào tin nhắn Zalo.
      let token = s.token;
      if (!token) {
        token = nanoid(12);
        await prisma.savedSearch.update({ where: { id: s.id }, data: { token } });
      }
      return NextResponse.json({ data: await findMatches(s), token });
    }

    const { page, limit, skip } = getPaginationParams(url);
    // state: active (đang săn) | off (đã tắt) | all. Giữ tương thích tham số cũ `active=false`
    // (nghĩa cũ của nó là "hiện cả yêu cầu đã tắt", tức là tất cả).
    const state = url.searchParams.get('state') || (url.searchParams.get('active') === 'false' ? 'all' : 'active');
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
    const district = (url.searchParams.get('district') || '').trim();
    const matched = url.searchParams.get('matched'); // 'no' = chưa có tin nào khớp

    // Lọc ở server (xem chú thích cùng ý trong /api/viewing-requests): danh sách có phân trang
    // nên lọc phía client sẽ bỏ sót khách ở các trang sau.
    const base: any = {};
    if (q) {
      const digits = q.replace(/\D/g, '');
      base.OR = [
        ...(digits ? [{ phone: { contains: digits } }] : []),
        { name: { contains: q, mode: 'insensitive' } },
        { note: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (district) base.district = { contains: district, mode: 'insensitive' };
    if (matched === 'no') base.lastMatchedAt = null;

    const where: any = { ...base };
    if (state === 'active') where.isActive = true;
    else if (state === 'off') where.isActive = false;

    const [rows, total, activeCount, offCount] = await Promise.all([
      prisma.savedSearch.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.savedSearch.count({ where }),
      prisma.savedSearch.count({ where: { ...base, isActive: true } }),
      prisma.savedSearch.count({ where: { ...base, isActive: false } }),
    ]);
    // Số tin khớp cho TỪNG khách trên trang hiện tại (20 count song song) — admin nhìn phát
    // biết khách nào đang có hàng để gọi, khách nào kho thật sự hết.
    const withMatches = await Promise.all(
      rows.map(async r => ({ ...r, matchCount: await countMatches(r) })),
    );

    return NextResponse.json({
      ...paginatedResponse(withMatches, total, page, limit),
      counts: { active: activeCount, off: offCount, all: activeCount + offCount },
    });
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
