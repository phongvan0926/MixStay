import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { dealCreateSchema, dealUpdateSchema, validateBody } from '@/lib/validations';
import { hasPermission } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const where: any = {};

    // Broker chỉ thấy deals CỦA MÌNH
    if (session.user.role === 'BROKER') where.brokerId = session.user.id;
    if (status) where.status = status;

    const { page, limit, skip } = getPaginationParams(url);

    const isBroker = session.user.role === 'BROKER';
    const isAdminFamily = session.user.role === 'ADMIN' || session.user.role === 'ADMIN_STAFF';
    const canSeeFinancials = isAdminFamily ? hasPermission(session.user as any, 'VIEW_FINANCIAL_REPORTS') : !isBroker;

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        select: {
          id: true,
          roomTypeId: true,
          brokerId: true,
          customerId: true,
          customerName: true,
          customerPhone: true,
          dealPrice: true,
          commissionTotal: true,
          commissionBroker: true,
          commissionCompany: canSeeFinancials,
          commissionRate: true,
          notes: true,
          status: true,
          dealDate: true,
          confirmedAt: true,
          createdAt: true,
          updatedAt: true,
          roomType: {
            select: {
              id: true,
              name: true,
              typeName: true,
              priceMonthly: true,
              property: {
                select: {
                  name: true,
                  district: true,
                  images: true,
                  companyId: true,
                },
              },
            },
          },
          broker: {
            select: {
              id: true,
              name: true,
              // Broker thấy info mình, Admin thấy tất cả
              phone: true,
              email: true,
            },
          },
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deal.count({ where }),
    ]);

    // Field-strip cho ADMIN_STAFF thiếu VIEW_FINANCIAL_REPORTS:
    // strip TOÀN BỘ số tài chính (kể cả commissionBroker — hoa hồng của broker khác, không phải của staff).
    // BROKER caller KHÔNG bị strip — họ chỉ thấy deal của chính mình (where.brokerId), cần biết hoa hồng của mình.
    // CTV (BROKER) chưa được cấp quyền xem hoa hồng → ẩn mọi số hoa hồng (vẫn thấy deal & giá).
    const brokerHideCommission = isBroker && !(session.user as any)?.canViewCommission;
    const stripped = (isAdminFamily && !canSeeFinancials)
      ? deals.map(d => ({
          ...d,
          dealPrice: null,
          commissionTotal: null,
          commissionBroker: null,
          commissionCompany: null,
        }))
      : brokerHideCommission
      ? deals.map(d => ({
          ...d,
          commissionTotal: null,
          commissionBroker: null,
          commissionCompany: null,
          commissionRate: null,
        }))
      : deals;

    return NextResponse.json(paginatedResponse(stripped, total, page, limit));
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Chỉ BROKER (tự tạo), ADMIN, ADMIN_STAFF được tạo giao dịch — chặn CUSTOMER/LANDLORD
    const role = session.user.role;
    if (role !== 'BROKER' && role !== 'ADMIN' && role !== 'ADMIN_STAFF') {
      return NextResponse.json({ error: 'Không có quyền tạo giao dịch' }, { status: 403 });
    }

    const body = await req.json();
    const validated = validateBody(dealCreateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    // Get commission rate from settings or default
    const setting = await prisma.setting.findUnique({ where: { key: 'commission_broker_percent' } });
    const brokerPercent = setting ? parseFloat(setting.value) : 60;
    const companyPercent = 100 - brokerPercent;

    const commissionTotal = parseFloat(body.commissionTotal) || parseFloat(body.dealPrice) * 0.5;
    const commissionBroker = commissionTotal * (brokerPercent / 100);
    const commissionCompany = commissionTotal * (companyPercent / 100);

    // BROKER tự tạo → gắn chính mình. ADMIN/ADMIN_STAFF gán brokerId → BẮT BUỘC là 1 CTV (role=BROKER)
    // đang hoạt động, tránh gán giao dịch/hoa hồng cho tài khoản bất kỳ.
    let dealBrokerId = session.user.id;
    if (role !== 'BROKER') {
      if (!body.brokerId) {
        return NextResponse.json({ error: 'Thiếu brokerId (cộng tác viên)' }, { status: 400 });
      }
      const broker = await prisma.user.findUnique({ where: { id: body.brokerId }, select: { role: true, isActive: true } });
      if (!broker || broker.role !== 'BROKER' || !broker.isActive) {
        return NextResponse.json({ error: 'brokerId không phải cộng tác viên hợp lệ' }, { status: 400 });
      }
      dealBrokerId = body.brokerId;
    }

    const deal = await prisma.deal.create({
      data: {
        roomTypeId: body.roomTypeId,
        brokerId: dealBrokerId,
        customerId: body.customerId || null,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        dealPrice: parseFloat(body.dealPrice),
        commissionTotal,
        commissionBroker,
        commissionCompany,
        commissionRate: brokerPercent,
        notes: body.notes,
        status: session.user.role === 'ADMIN' ? 'CONFIRMED' : 'PENDING',
      },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = validateBody(dealUpdateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { id, status: newStatus, ...rest } = body;

    const updateData: any = {};
    if (newStatus) {
      updateData.status = newStatus;
      if (newStatus === 'CONFIRMED') updateData.confirmedAt = new Date();
    }
    if (rest.commissionTotal) {
      const ct = parseFloat(rest.commissionTotal);
      const rate = rest.commissionRate || 60;
      updateData.commissionTotal = ct;
      updateData.commissionBroker = ct * (rate / 100);
      updateData.commissionCompany = ct * ((100 - rate) / 100);
      updateData.commissionRate = rate;
    }

    const deal = await prisma.deal.update({ where: { id }, data: updateData });

    // If confirmed, decrement availableUnits
    if (newStatus === 'CONFIRMED') {
      const roomType = await prisma.roomType.findUnique({ where: { id: deal.roomTypeId } });
      if (roomType) {
        const newAvailable = Math.max(0, roomType.availableUnits - 1);
        await prisma.roomType.update({
          where: { id: deal.roomTypeId },
          data: {
            availableUnits: newAvailable,
            ...(newAvailable === 0 ? { status: 'UNAVAILABLE' as const } : {}),
          },
        });
      }
    }

    return NextResponse.json(deal);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
