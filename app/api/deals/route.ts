import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { dealCreateSchema, dealUpdateSchema, validateBody } from '@/lib/validations';

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
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
          commissionCompany: isBroker ? false : true, // Broker không thấy phần công ty
          commissionRate: true,
          notes: true,
          status: true,
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

    return NextResponse.json(paginatedResponse(deals, total, page, limit));
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    const deal = await prisma.deal.create({
      data: {
        roomTypeId: body.roomTypeId,
        brokerId: session.user.role === 'BROKER' ? session.user.id : body.brokerId,
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
  const rateLimited = applyRateLimit(req, 'api');
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
