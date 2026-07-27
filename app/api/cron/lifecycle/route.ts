import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * CRON vòng đời phòng — Vercel gọi hằng ngày (vercel.json):
 *  1. Phòng 🟡 UPCOMING đã đến ngày trống dự kiến → tự chuyển 🟢 AVAILABLE + báo chủ nhà kiểm tra.
 *  2. Tin 🟢 AVAILABLE quá 30 ngày không cập nhật → nhắc chủ nhà xác nhận còn phòng
 *     (chỉ nhắc 1 lần khi vừa chạm mốc 30–31 ngày — cron ngày nào cũng chạy nên không spam).
 * Bảo mật 2 lớp:
 *  - CRON_SECRET (khuyến nghị): có env này thì bắt buộc Bearer khớp — Vercel Cron tự gắn header.
 *  - Khi CHƯA đặt CRON_SECRET: vẫn chặn gọi hàng loạt bằng rate limit + chỉ nhận lời gọi mang
 *    dấu vết Vercel Cron (user-agent vercel-cron hoặc header x-vercel-cron mà Vercel tự chèn).
 *    Đây là hàng rào tạm; đặt CRON_SECRET vẫn là cách chuẩn.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    const limited = await applyRateLimit(req, 'auth');
    if (limited) return limited;
    const fromVercelCron =
      req.headers.get('x-vercel-cron') !== null ||
      (req.headers.get('user-agent') || '').includes('vercel-cron');
    if (!fromVercelCron) {
      return NextResponse.json(
        { error: 'Unauthorized', hint: 'Đặt CRON_SECRET để bảo vệ endpoint này' },
        { status: 401 },
      );
    }
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
