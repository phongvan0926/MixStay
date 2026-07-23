import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * CRON vòng đời phòng — Vercel gọi hằng ngày (vercel.json):
 *  1. Phòng 🟡 UPCOMING đã đến ngày trống dự kiến → tự chuyển 🟢 AVAILABLE + báo chủ nhà kiểm tra.
 *  2. Tin 🟢 AVAILABLE quá 30 ngày không cập nhật → nhắc chủ nhà xác nhận còn phòng
 *     (chỉ nhắc 1 lần khi vừa chạm mốc 30–31 ngày — cron ngày nào cũng chạy nên không spam).
 * Bảo mật: có CRON_SECRET thì yêu cầu Bearer khớp; Vercel Cron tự gắn header này khi env tồn tại.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // ── 1. UPCOMING đến hạn → AVAILABLE ──────────────────────────────────────
    const due = await prisma.roomType.findMany({
      where: { status: 'UPCOMING', expectedAvailableDate: { lte: now } },
      select: {
        id: true, name: true, listingCode: true, availableUnits: true,
        property: { select: { landlordId: true, name: true } },
      },
    });
    for (const rt of due) {
      await prisma.roomType.update({
        where: { id: rt.id },
        data: {
          status: 'AVAILABLE',
          // Sắp trống nghĩa là sẽ có ít nhất 1 phòng — đảm bảo availableUnits ≥ 1
          availableUnits: Math.max(rt.availableUnits, 1),
          expectedAvailableDate: null,
        },
      });
    }
    if (due.length) {
      await prisma.notification.createMany({
        data: due.map(rt => ({
          userId: rt.property.landlordId,
          type: 'lifecycle',
          title: '🟢 Phòng đã đến ngày trống dự kiến',
          message: `Tin "${rt.name}" (${rt.property.name}) vừa TỰ CHUYỂN sang Còn phòng theo ngày bạn đặt — kiểm tra lại số phòng trống nhé.`,
          link: '/landlord/properties',
        })),
      });
    }

    // ── 2. Tin 30 ngày không cập nhật → nhắc chủ nhà xác nhận ────────────────
    const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const d31 = new Date(now.getTime() - 31 * 24 * 3600 * 1000);
    const stale = await prisma.roomType.findMany({
      where: {
        status: 'AVAILABLE', isApproved: true,
        updatedAt: { lte: d30, gt: d31 }, // vừa chạm mốc → mỗi tin chỉ bị nhắc 1 lần
      },
      select: { id: true, name: true, property: { select: { landlordId: true, name: true } } },
    });
    if (stale.length) {
      await prisma.notification.createMany({
        data: stale.map(rt => ({
          userId: rt.property.landlordId,
          type: 'lifecycle',
          title: '⏰ Tin đăng 30 ngày chưa cập nhật',
          message: `Tin "${rt.name}" (${rt.property.name}) đã 30 ngày không cập nhật — phòng còn trống không? Vào chỉnh trạng thái để khách không gọi nhầm phòng đã cho thuê.`,
          link: '/landlord/properties',
        })),
      });
    }

    return NextResponse.json({ ok: true, autoAvailable: due.length, staleReminded: stale.length });
  } catch (error: any) {
    console.error('/api/cron/lifecycle error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
