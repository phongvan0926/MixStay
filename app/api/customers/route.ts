import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';

/**
 * HỒ SƠ KHÁCH — gom mọi dấu vết của MỘT SỐ ĐIỆN THOẠI về một chỗ.
 *
 * Vì sao cần: đo ngày 16/08/2026 — 56 lượt hỏi phòng chỉ đến từ 33 người, có người hỏi tới 5
 * phòng. Người hỏi 5 phòng là khách nghiêm túc nhất trong kho, nhưng màn hình cũ xếp theo
 * TỪNG LƯỢT HỎI lẻ nên admin không nhìn ra — gọi họ y như gọi người hỏi một lần rồi thôi.
 *
 * - GET (không tham số) → danh sách khách, gộp theo SĐT, mới hoạt động xếp trước.
 * - GET ?phone=… → toàn bộ lịch sử của một khách: đã hỏi tin nào, săn tiêu chí gì, ai đã gọi.
 *
 * CHỈ admin-family: đây là dữ liệu cá nhân đã được gom lại, còn nhạy cảm hơn từng bản ghi lẻ.
 */
export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, 'api');
  if (limited) return limited;

  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || (role !== 'ADMIN' && role !== 'ADMIN_STAFF')) {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const url = new URL(req.url);
    const phone = (url.searchParams.get('phone') || '').replace(/\D/g, '').slice(0, 15);

    // ── CHI TIẾT MỘT KHÁCH ────────────────────────────────────────────────────────
    if (phone) {
      const [requests, searches] = await Promise.all([
        prisma.viewingRequest.findMany({
          where: { phone },
          orderBy: { createdAt: 'desc' },
          // select tường minh — KHÔNG include property (kéo cả toạ độ, zaloPhone, landlordNotes)
          select: {
            id: true, name: true, note: true, status: true, source: true, createdAt: true,
            preferredDate: true, preferredSlot: true, guideSentAt: true,
            broker: { select: { name: true } },
            roomType: {
              select: {
                id: true, name: true, listingCode: true, priceMonthly: true, areaSqm: true,
                property: { select: { district: true } },
              },
            },
          },
        }),
        prisma.savedSearch.findMany({
          where: { phone },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, name: true, district: true, typeName: true, minPrice: true,
            maxPrice: true, note: true, isActive: true, lastMatchedAt: true, createdAt: true,
          },
        }),
      ]);
      if (!requests.length && !searches.length) {
        return NextResponse.json({ error: 'Không tìm thấy khách này' }, { status: 404 });
      }

      // Tóm tắt để admin nắm trong 2 giây trước khi bấm gọi
      const prices = requests.map(r => r.roomType?.priceMonthly).filter((n): n is number => !!n);
      const districts = Array.from(new Set([
        ...requests.map(r => r.roomType?.property?.district),
        ...searches.flatMap(s => (s.district || '').split(',').map(d => d.trim())),
      ].filter(Boolean))) as string[];

      return NextResponse.json({
        phone,
        name: requests.find(r => r.name)?.name || searches.find(s => s.name)?.name || null,
        summary: {
          requests: requests.length,
          searches: searches.length,
          pending: requests.filter(r => r.status === 'NEW' || r.status === 'CONTACTED').length,
          districts,
          minPrice: prices.length ? Math.min(...prices) : null,
          maxPrice: prices.length ? Math.max(...prices) : null,
          firstAt: [...requests, ...searches].map(x => x.createdAt).sort()[0] || null,
        },
        requests,
        searches,
      });
    }

    // ── DANH SÁCH KHÁCH ───────────────────────────────────────────────────────────
    const q = (url.searchParams.get('q') || '').trim().slice(0, 40);
    const onlyPending = url.searchParams.get('pending') === 'true';
    const { page, limit, skip } = getPaginationParams(url);

    // Gộp 2 nguồn (xin xem phòng + săn phòng) bằng SQL: một khách có thể chỉ xuất hiện ở một
    // bên. Prisma groupBy không union được 2 bảng nên phải dùng raw — tham số vẫn truyền qua
    // $queryRaw (tagged template) để không hở SQL injection.
    const digits = q.replace(/\D/g, '');
    const like = `%${q}%`;
    const likeDigits = `%${digits}%`;
    const hasQ = q.length > 0;
    // Gõ chữ ("Hà") thì digits rỗng → `phone LIKE '%%'` khớp MỌI số, tìm tên hoá ra không lọc
    // gì cả. Chỉ so SĐT khi người dùng thật sự gõ số.
    const hasDigits = digits.length > 0;

    const rows = await prisma.$queryRaw<{
      phone: string; name: string | null; requests: bigint; searches: bigint;
      pending: bigint; last_at: Date; first_at: Date;
    }[]>`
      SELECT phone,
             max(name) AS name,
             count(*) FILTER (WHERE src = 'vr')                      AS requests,
             count(*) FILTER (WHERE src = 'ss')                      AS searches,
             count(*) FILTER (WHERE src = 'vr' AND pending)          AS pending,
             max(created)                                            AS last_at,
             min(created)                                            AS first_at
      FROM (
        SELECT phone, name, "createdAt" AS created, 'vr' AS src,
               status IN ('NEW','CONTACTED') AS pending
        FROM viewing_requests
        UNION ALL
        SELECT phone, name, "createdAt" AS created, 'ss' AS src, false AS pending
        FROM saved_searches
      ) x
      WHERE (${!hasQ} OR (${hasDigits} AND phone LIKE ${likeDigits}) OR name ILIKE ${like})
      GROUP BY phone
      HAVING (${!onlyPending} OR count(*) FILTER (WHERE src = 'vr' AND pending) > 0)
      ORDER BY last_at DESC
      LIMIT ${limit} OFFSET ${skip}`;

    const totals = await prisma.$queryRaw<{ total: bigint; pending_total: bigint }[]>`
      SELECT count(*) AS total,
             count(*) FILTER (WHERE p > 0) AS pending_total
      FROM (
        SELECT phone, count(*) FILTER (WHERE src = 'vr' AND pending) AS p
        FROM (
          SELECT phone, name, 'vr' AS src, status IN ('NEW','CONTACTED') AS pending
          FROM viewing_requests
          UNION ALL
          SELECT phone, name, 'ss' AS src, false AS pending FROM saved_searches
        ) y
        WHERE (${!hasQ} OR (${hasDigits} AND phone LIKE ${likeDigits}) OR name ILIKE ${like})
        GROUP BY phone
      ) z`;

    // count(*) của Postgres về JS là BigInt — JSON.stringify ném lỗi nếu để nguyên
    const data = rows.map(r => ({
      phone: r.phone,
      name: r.name,
      requests: Number(r.requests),
      searches: Number(r.searches),
      pending: Number(r.pending),
      lastAt: r.last_at,
      firstAt: r.first_at,
    }));
    const total = Number(totals[0]?.total || 0);

    return NextResponse.json({
      ...paginatedResponse(data, total, page, limit),
      counts: { all: total, pending: Number(totals[0]?.pending_total || 0) },
    });
  } catch (error: any) {
    console.error('GET /api/customers error:', error);
    return NextResponse.json({ error: 'Không tải được hồ sơ khách' }, { status: 500 });
  }
}
