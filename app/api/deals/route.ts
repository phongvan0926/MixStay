import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const where: any = {};

    if (session.user.role === 'BROKER') where.brokerId = session.user.id;
    if (status) where.status = status;

    const deals = await prisma.deal.findMany({
      where,
      include: {
        roomType: { include: { property: { select: { name: true, district: true, images: true, companyId: true } } } },
        broker: { select: { id: true, name: true, phone: true, email: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(deals);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

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
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
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
            isAvailable: newAvailable > 0,
          },
        });
      }
    }

    return NextResponse.json(deal);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
