import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { shareLinkCreateSchema, validateBody } from '@/lib/validations';
import { requirePermission } from '@/lib/permissions-server';
import { publicAddress, redactName, redactHouseNumber } from '@/lib/address';

// Ẩn số nhà: redact name + streetName, thêm publicAddress (ngõ/ngách + đường), loại fullAddress khỏi payload khách.
function sanitizeProperty<T extends { name?: string | null; fullAddress?: string | null; streetName?: string | null }>(p: T) {
  const { fullAddress, name, streetName, ...rest } = p as any;
  const safeStreet = redactHouseNumber(streetName);
  return {
    ...rest,
    name: redactName(name),
    streetName: safeStreet,
    publicAddress: publicAddress(fullAddress, safeStreet),
  };
}

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const systemToken = url.searchParams.get('systemToken');

    // Public: view system share link (landlord's all available rooms)
    if (systemToken) {
      const link = await prisma.shareLink.findUnique({
        where: { token: systemToken },
      });

      if (!link || !link.isActive || !link.isSystem) {
        return NextResponse.json({ error: 'Link không tồn tại hoặc đã hết hạn' }, { status: 404 });
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 });
      }

      // Increment view count
      await prisma.shareLink.update({ where: { token: systemToken }, data: { viewCount: { increment: 1 } } });

      // Người tạo link quyết định phạm vi + liên hệ:
      //  - BROKER  → kho CẢ HỆ THỐNG (mọi phòng đang trống), liên hệ CHỈ cộng tác viên (ẩn company/chủ nhà/hotline)
      //  - LANDLORD → kho của chính chủ nhà đó (hành vi cũ)
      const creator = await prisma.user.findUnique({
        where: { id: link.brokerId },
        select: { name: true, phone: true, role: true },
      });
      const isBrokerLink = creator?.role === 'BROKER';

      const propertyWhere: any = isBrokerLink
        ? { status: 'APPROVED', isActive: true }
        : { landlordId: link.brokerId, status: 'APPROVED' };

      const propsRaw = await prisma.property.findMany({
        where: propertyWhere,
        select: {
          id: true, name: true, district: true, streetName: true, city: true,
          amenities: true, images: true, totalFloors: true, services: true,
          fullAddress: true, // server-side dựng publicAddress (ẩn số nhà) — sanitizeProperty bỏ trước khi trả về
          parkingCar: true, parkingBike: true, evCharging: true, petAllowed: true, foreignerOk: true,
          company: { select: { id: true, name: true, logo: true, zaloGroupLink: true, description: true } },
          roomTypes: {
            where: { isApproved: true, status: { in: ['AVAILABLE', 'UPCOMING'] } },
            select: {
              id: true, name: true, typeName: true, areaSqm: true,
              priceMonthly: true, deposit: true, description: true,
              amenities: true, images: true, videos: true, videoLinks: true,
              listingCode: true,
              totalUnits: true, availableUnits: true,
              // KHÔNG select availableRoomNames — leak sang khách
              status: true, expectedAvailableDate: true,
              shortTermAllowed: true, shortTermMonths: true, shortTermPrice: true,
            },
            orderBy: [
              { status: 'asc' },
              { expectedAvailableDate: { sort: 'asc', nulls: 'last' } },
              { createdAt: 'desc' },
            ],
          },
        },
      });

      if (isBrokerLink) {
        // KHOÁ liên hệ về cộng tác viên: bỏ HẲN company (Zalo nhóm/đơn vị vận hành) khỏi payload,
        // không trả landlord → trang share chỉ có thể hiển thị liên hệ cộng tác viên.
        const properties = propsRaw
          .filter(p => p.roomTypes.length > 0)
          .map(p => ({ ...sanitizeProperty(p), company: null }));
        return NextResponse.json({
          link,
          isBrokerLink: true,
          broker: { name: creator?.name, phone: creator?.phone },
          properties,
        });
      }

      return NextResponse.json({
        link,
        landlord: { name: creator?.name, phone: creator?.phone },
        properties: propsRaw.map(p => sanitizeProperty(p)),
      });
    }

    // Public: view by token (for customers — single room type)
    if (token) {
      const link = await prisma.shareLink.findUnique({
        where: { token },
        select: {
          id: true, token: true, viewCount: true, isActive: true, isSystem: true,
          expiresAt: true, createdAt: true, roomTypeId: true, brokerId: true,
          roomType: {
            select: {
              id: true, name: true, typeName: true, areaSqm: true,
              priceMonthly: true, deposit: true, depositType: true, description: true,
              amenities: true, images: true, videos: true, videoLinks: true,
              listingCode: true,
              totalUnits: true, availableUnits: true,
              // KHÔNG select availableRoomNames — khách chỉ thấy số lượng
              status: true, expectedAvailableDate: true,
              shortTermAllowed: true, shortTermMonths: true, shortTermPrice: true,
              property: {
                select: {
                  id: true, name: true, district: true, streetName: true, city: true,
                  amenities: true, images: true, totalFloors: true, services: true,
                  fullAddress: true, // server-side dựng publicAddress (ẩn số nhà) — bỏ trước khi trả về
                  parkingCar: true, parkingBike: true, evCharging: true, petAllowed: true, foreignerOk: true,
                  // NO lat, lng, landlord phone
                  company: { select: { id: true, name: true, logo: true, zaloGroupLink: true, description: true } },
                  landlord: { select: { id: true, name: true, phone: true } }, // phone dùng cho FAB Zalo deeplink (KHÔNG render trên UI)
                },
              },
            },
          },
          broker: { select: { name: true, phone: true, role: true } }, // role → biết link do BROKER tạo (đổi đích Zalo)
        },
      });

      if (!link || !link.isActive) {
        return NextResponse.json({ error: 'Link không tồn tại hoặc đã hết hạn' }, { status: 404 });
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 });
      }

      // Link do BROKER tạo: BỎ HẲN SĐT chủ nhà khỏi payload để khách không thể liên hệ
      // thẳng chủ nhà, bỏ qua broker. CTA Zalo/gọi sẽ trỏ về broker (getZaloLink + data.broker).
      // Link chủ nhà tự đăng giữ nguyên SĐT chủ nhà (hành vi cũ).
      if (link.broker?.role === 'BROKER' && link.roomType?.property?.landlord) {
        (link.roomType.property.landlord as any).phone = null;
      }

      // Ẩn số nhà cho khách: thay property bằng bản đã redact (publicAddress thay fullAddress).
      if (link.roomType?.property) {
        (link.roomType as any).property = sanitizeProperty(link.roomType.property as any);
      }

      // Link do BROKER tạo: kèm token KHO TỔNG của cộng tác viên (find-or-create) để trang share lẻ
      // dẫn khách sang xem TOÀN BỘ phòng của cộng tác viên — giữ khách trong kênh cộng tác viên, không cho
      // nhảy sang trang chủ (thay cho "Tin đăng liên quan" vốn dẫn ra trang /tin công khai).
      let brokerSystemToken: string | null = null;
      if (link.broker?.role === 'BROKER' && link.brokerId) {
        const sys = await prisma.shareLink.findFirst({
          where: { brokerId: link.brokerId, isSystem: true, isActive: true },
          orderBy: { createdAt: 'desc' },
          select: { token: true },
        });
        brokerSystemToken = sys
          ? sys.token
          : (await prisma.shareLink.create({
              data: { brokerId: link.brokerId, token: nanoid(12), isSystem: true },
              select: { token: true },
            })).token;
      }

      // Increment view count
      await prisma.shareLink.update({ where: { token }, data: { viewCount: { increment: 1 } } });

      return NextResponse.json({ ...link, brokerSystemToken });
    }

    // Authenticated: list user's links
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where: any = {};
    if (session.user.role === 'BROKER' || session.user.role === 'LANDLORD') {
      // Liệt kê mọi link của chính mình — gồm cả link kho tổng (isSystem) để xem/copy/xoá.
      where.brokerId = session.user.id;
    }

    const { page, limit, skip } = getPaginationParams(url);

    const [links, total] = await Promise.all([
      prisma.shareLink.findMany({
        where,
        include: {
          roomType: { include: { property: { select: { name: true, district: true, images: true } } } },
          broker: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.shareLink.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(links, total, page, limit));
  } catch (error: any) {
    console.error('/api/share-links error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = validateBody(shareLinkCreateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const token = nanoid(12);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // System link: landlord (kho của mình) / broker (kho cả hệ thống, liên hệ về MG) / admin / admin-staff
    if (body.isSystem) {
      if (['LANDLORD', 'BROKER', 'ADMIN'].includes(session.user.role)) {
        // landlord/broker tạo system link cho chính mình, super-admin OK
      } else if (session.user.role === 'ADMIN_STAFF') {
        const denial = requirePermission(session, 'MANAGE_SYSTEM_SHARE_LINKS');
        if (denial) return denial;
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const link = await prisma.shareLink.create({
        data: {
          brokerId: session.user.id, // landlord's id
          token,
          isSystem: true,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        },
      });

      return NextResponse.json({
        ...link,
        url: `${appUrl}/share/system/${token}`,
      }, { status: 201 });
    }

    // Regular (non-system) share link: BROKER, LANDLORD (own RT), ADMIN, ADMIN_STAFF — không cần permission đặc biệt (hỗ trợ tác nghiệp)
    if (!['BROKER', 'LANDLORD', 'ADMIN', 'ADMIN_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!body.roomTypeId) {
      return NextResponse.json({ error: 'Thiếu roomTypeId' }, { status: 400 });
    }

    // LANDLORD can only share their own room types
    if (session.user.role === 'LANDLORD') {
      const rt = await prisma.roomType.findUnique({
        where: { id: body.roomTypeId },
        select: { property: { select: { landlordId: true } } },
      });
      if (!rt || rt.property.landlordId !== session.user.id) {
        return NextResponse.json({ error: 'Không có quyền chia sẻ phòng này' }, { status: 403 });
      }
    }

    // Reuse existing active link from this user for this room type
    const existing = await prisma.shareLink.findFirst({
      where: {
        roomTypeId: body.roomTypeId,
        brokerId: session.user.id,
        isSystem: false,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing && (!existing.expiresAt || new Date(existing.expiresAt) > new Date())) {
      return NextResponse.json({
        ...existing,
        url: `${appUrl}/p/${existing.token}`,
      });
    }

    const link = await prisma.shareLink.create({
      data: {
        roomTypeId: body.roomTypeId,
        brokerId: session.user.id,
        token,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    return NextResponse.json({
      ...link,
      url: `${appUrl}/p/${token}`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('/api/share-links error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Load để check isSystem
    const link = await prisma.shareLink.findUnique({ where: { id }, select: { isSystem: true, brokerId: true } });
    if (!link) return NextResponse.json({ error: 'Không tìm thấy link' }, { status: 404 });

    // Ownership: owner luôn xóa được link của mình
    const isOwner = link.brokerId === (session.user as any).id;
    if (!isOwner) {
      if (link.isSystem) {
        // Admin-staff xóa system link của người khác → cần MANAGE_SYSTEM_SHARE_LINKS (super-admin bypass)
        const denial = requirePermission(session, 'MANAGE_SYSTEM_SHARE_LINKS');
        if (denial) return denial;
      } else if (session.user.role !== 'ADMIN' && session.user.role !== 'ADMIN_STAFF') {
        return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
      }
    }

    await prisma.shareLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('/api/share-links error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
