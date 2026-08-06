import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { requirePermission } from '@/lib/permissions-server';

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const roomTypeId = url.searchParams.get('roomTypeId') || url.searchParams.get('roomId');
    const where: any = {};

    // Broker sees their own inquiries
    if (session.user.role === 'BROKER') {
      where.brokerId = session.user.id;
    }

    // Landlord sees inquiries for their room types
    if (session.user.role === 'LANDLORD') {
      where.roomType = { property: { landlordId: session.user.id } };
    }

    if (roomTypeId) where.roomTypeId = roomTypeId;

    const inquiries = await prisma.roomInquiry.findMany({
      where,
      include: {
        roomType: { include: { property: { select: { name: true, landlordId: true } } } },
        broker: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(inquiries);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'BROKER') {
      return NextResponse.json({ error: 'Chỉ Cộng tác viên mới gửi được' }, { status: 403 });
    }

    const { roomTypeId, message } = await req.json();

    // 🔴 Trước đây roomTypeId nhận thẳng không kiểm, và `include: { property: true }` trả VỀ
    // MỌI cột của Property. CTV chưa được cấp canViewContact chỉ cần lặp POST với id lấy từ
    // /api/rooms/public là moi sạch fullAddress + toạ độ + zaloPhone + landlordNotes của cả kho
    // — vô hiệu hoá đúng cơ chế canViewContact sinh ra để chặn (phát hiện khi kiểm định 07/08/2026).
    // Nay: kiểm tin có thật + đã duyệt, và CHỈ lấy đúng field cần cho thông báo.
    const target = await prisma.roomType.findFirst({
      where: { id: roomTypeId, isApproved: true, property: { status: 'APPROVED', isActive: true } },
      select: { id: true, name: true, property: { select: { landlordId: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: 'Tin đăng không tồn tại hoặc chưa được duyệt' }, { status: 404 });
    }

    const inquiry = await prisma.roomInquiry.create({
      data: {
        roomTypeId,
        brokerId: session.user.id,
        message: message || 'Còn phòng không?',
      },
      select: { id: true, roomTypeId: true, message: true, createdAt: true },
    });

    // Create notification for landlord
    await prisma.notification.create({
      data: {
        userId: target.property.landlordId,
        type: 'inquiry',
        title: `CTV hỏi về ${target.name}`,
        message: `${session.user.name} hỏi: "${inquiry.message}"`,
        link: `/landlord/properties`,
      },
    });

    return NextResponse.json(inquiry, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

/**
 * Trả lời câu hỏi của CTV — CHỦ NHÀ (tin của mình) hoặc ADMIN (mọi tin).
 *
 * Trước đây chỉ LANDLORD trả lời được, nên câu nào chủ nhà bỏ quên là treo vĩnh viễn:
 * admin nhìn thấy trên /admin/dashboard mà không có cách nào xử lý. Nay admin trả lời hộ được.
 *
 * Hai hành động:
 *  - { id, reply: 'CÒN' | 'HẾT' } → lưu câu trả lời + BÁO CTV. 'HẾT' đồng thời gỡ tin khỏi thị trường.
 *  - { id, dismiss: true }        → chỉ ẩn khỏi danh sách việc cần làm của admin, KHÔNG báo CTV.
 */
export async function PUT(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    const isAdminFamily = role === 'ADMIN' || role === 'ADMIN_STAFF';
    if (!session || (role !== 'LANDLORD' && !isAdminFamily)) {
      return NextResponse.json({ error: 'Không có quyền trả lời' }, { status: 403 });
    }
    // Trả lời "HẾT" sẽ gỡ tin khỏi thị trường → với staff phải có quyền duyệt tin.
    if (role === 'ADMIN_STAFF') {
      const denial = requirePermission(session, 'APPROVE_LISTINGS');
      if (denial) return denial;
    }

    const { id, reply, dismiss } = await req.json();
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    // Chủ nhà chỉ đụng được câu hỏi về tin CỦA MÌNH (tránh ép phòng người khác thành HẾT).
    const where = isAdminFamily
      ? { id }
      : { id, roomType: { property: { landlordId: session.user.id } } };
    const owned = await prisma.roomInquiry.findFirst({ where, select: { id: true } });
    if (!owned) {
      return NextResponse.json({ error: 'Không có quyền với câu hỏi này' }, { status: 403 });
    }

    // Bỏ qua: chỉ dọn hộp việc của admin, CTV không nhận thông báo gì.
    if (dismiss) {
      const skipped = await prisma.roomInquiry.update({
        where: { id },
        data: { dismissedAt: new Date() },
      });
      return NextResponse.json(skipped);
    }

    if (reply !== 'CÒN' && reply !== 'HẾT') {
      return NextResponse.json({ error: 'Câu trả lời phải là CÒN hoặc HẾT' }, { status: 400 });
    }

    const inquiry = await prisma.roomInquiry.update({
      where: { id },
      data: { reply, repliedAt: new Date() },
      include: { roomType: true, broker: true },
    });

    // Báo CTV — nói rõ ai trả lời để CTV biết độ tin cậy của thông tin.
    const answerer = isAdminFamily ? 'Quản trị viên' : 'Chủ nhà';
    await prisma.notification.create({
      data: {
        userId: inquiry.brokerId,
        type: 'reply',
        title: `${answerer} trả lời: ${reply}`,
        message: `${inquiry.roomType.name}: "${reply}"`,
        link: `/broker/inventory`,
      },
    });

    // "HẾT" → gỡ tin khỏi thị trường ngay, khỏi để CTV khác dẫn khách tới phòng đã cho thuê.
    if (reply === 'HẾT') {
      await prisma.roomType.update({
        where: { id: inquiry.roomTypeId },
        data: { availableUnits: 0, status: 'UNAVAILABLE' },
      });
    }

    return NextResponse.json(inquiry);
  } catch (error) {
    console.error('PUT /api/inquiries error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
