import prisma from '@/lib/prisma';
import { redactHouseNumber, redactTitle } from '@/lib/address';

/**
 * SERVER-ONLY. Bộ khớp "Săn phòng" ↔ kho tin — dùng chung cho 3 đường:
 *   1. Khách vừa để lại tiêu chí   → POST /api/saved-searches  (quét NGƯỢC kho có sẵn)
 *   2. Tin mới được duyệt          → PUT  /api/rooms           (quét XUÔI khách đang săn)
 *   3. Quét lại hằng ngày          → GET  /api/cron/lifecycle
 *
 * ⚠️ LÝ DO TỒN TẠI: trước đây chỉ có đường (2). Khách để lại tiêu chí hôm nay thì im lặng
 * tuyệt đối cho tới khi tình cờ có tin MỚI khớp — dù kho đang sẵn hàng đúng ý. Đo ngày
 * 14/08/2026: 10/15 khách đang săn có tin khớp trong kho mà KHÔNG ai được báo (một khách
 * Hà Đông ≤4tr trong khi kho có 28 tin). Giữa mùa sinh viên nhập học, đó là tiền rơi.
 */

/** Tin ĐANG cho khách xem được: đã duyệt, còn phòng, thuộc tòa đã duyệt. */
export const MATCHABLE_ROOM: any = {
  isApproved: true,
  status: 'AVAILABLE',
  property: { status: 'APPROVED' },
};

export type SearchCriteria = {
  id?: string;
  district: string | null;
  typeName: string | null;
  minPrice: number | null;
  maxPrice: number | null;
};

/**
 * Khách có nêu tiêu chí lọc được không?
 *
 * Có khách để trống hết rồi gõ địa chỉ vào ô ghi chú ("ngách 62 ngõ 1 Bùi Xương Trạch").
 * Tiêu chí rỗng thì "khớp" cả 632 tin — báo admin "kho có 632 tin khớp" mỗi sáng là rác,
 * không phải việc. Những khách này admin gọi thẳng để hỏi nhu cầu, không tự động khớp.
 */
export function hasCriteria(s: SearchCriteria) {
  return !!(s.district || s.typeName || s.minPrice || s.maxPrice);
}

/**
 * Dựng `where` Prisma từ tiêu chí của khách.
 * `district` lưu dạng chuỗi "Cầu Giấy,Hà Đông" (khách chọn nhiều quận) → tách ra lọc `in`.
 */
export function roomWhereForSearch(s: SearchCriteria): any {
  const where: any = { ...MATCHABLE_ROOM, property: { ...MATCHABLE_ROOM.property } };

  const districts = (s.district || '').split(',').map(d => d.trim()).filter(Boolean);
  if (districts.length) where.property.district = { in: districts };
  if (s.typeName) where.typeName = s.typeName;
  if (s.minPrice || s.maxPrice) {
    where.priceMonthly = {
      ...(s.minPrice ? { gte: s.minPrice } : {}),
      ...(s.maxPrice ? { lte: s.maxPrice } : {}),
    };
  }
  return where;
}

/** Đếm số tin trong kho khớp tiêu chí (dùng cho badge "🎯 N tin khớp" ở /admin/leads). */
export function countMatches(s: SearchCriteria) {
  if (!hasCriteria(s)) return Promise.resolve(0);
  return prisma.roomType.count({ where: roomWhereForSearch(s) });
}

/**
 * Danh sách tin khớp, mới nhất trước — admin bấm vào xem để gọi chào phòng.
 *
 * ⚠️ Tên tin + tên đường ĐÃ REDACT dù đây là màn hình admin: nội dung này được copy nguyên
 * văn để gửi cho KHÁCH qua Zalo (nút "Copy gửi Zalo"), mà chủ nhà rất hay gõ số nhà vào
 * tiêu đề. Không redact ở đây là luật ẩn số nhà bị lách qua đường copy-paste.
 */
export async function findMatches(s: SearchCriteria, take = 20) {
  const rows = await prisma.roomType.findMany({
    where: roomWhereForSearch(s),
    // select tường minh: KHÔNG include property (kéo cả fullAddress, toạ độ, zaloPhone).
    select: {
      id: true, name: true, listingCode: true, priceMonthly: true, areaSqm: true,
      typeName: true, images: true, updatedAt: true,
      property: { select: { district: true, streetName: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take,
  });
  return rows.map(r => ({
    ...r,
    name: redactTitle(r.name),
    property: r.property
      ? { ...r.property, streetName: redactHouseNumber(r.property.streetName) }
      : r.property,
  }));
}

const adminIds = () =>
  prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });

/**
 * Quét kho cho MỘT yêu cầu săn phòng rồi báo admin nếu có hàng.
 *
 * `since`: chỉ tính tin cập nhật SAU mốc này — dùng cho lượt quét lại hằng ngày để admin
 * không bị nhắc lại cùng một bộ tin mỗi sáng. Bỏ trống = quét toàn kho (lần đầu).
 * Trả số tin khớp; 0 nghĩa là không báo gì.
 */
export async function matchAndNotify(
  s: SearchCriteria & { name?: string | null; phone: string },
  opts: { since?: Date | null; reason?: 'new' | 'daily' } = {},
) {
  if (!hasCriteria(s)) return 0;

  const where = roomWhereForSearch(s);
  if (opts.since) where.updatedAt = { gt: opts.since };

  const [count, top] = await Promise.all([
    prisma.roomType.count({ where }),
    prisma.roomType.findMany({
      where,
      select: { listingCode: true, priceMonthly: true, property: { select: { district: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    }),
  ]);
  if (count === 0) return 0;

  const admins = await adminIds();
  if (admins.length) {
    const preview = top
      .map(r => `${r.listingCode || '—'} ${(r.priceMonthly / 1e6).toFixed(1)}tr ${r.property?.district || ''}`.trim())
      .join(' · ');
    const title = opts.reason === 'daily' ? '🎯 Tin mới khớp khách đang săn' : '🎯 Có phòng cho khách vừa săn';
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId: a.id,
        type: 'saved_search',
        title,
        message: `${s.name || 'Khách'} ${s.phone} — kho có ${count} tin khớp: ${preview}${count > 3 ? '…' : ''}. Gọi chào phòng ngay!`,
        link: '/admin/leads?tab=saved',
      })),
    });
  }
  if (s.id) {
    await prisma.savedSearch.update({ where: { id: s.id }, data: { lastMatchedAt: new Date() } });
  }
  return count;
}
