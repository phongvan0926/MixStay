import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { propertyCreateSchema, propertyUpdateSchema, validateBody } from '@/lib/validations';

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const landlordId = url.searchParams.get('landlordId');
    const search = url.searchParams.get('search');

    const where: any = {};

    if (session?.user?.role === 'LANDLORD') {
      where.landlordId = session.user.id;
    } else if (landlordId) {
      where.landlordId = landlordId;
    }

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { district: { contains: search, mode: 'insensitive' } },
        { streetName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const companyId = url.searchParams.get('companyId');
    if (companyId) where.companyId = companyId;

    const { page, limit, skip } = getPaginationParams(url);

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          landlord: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              // password is NOT selected
            },
          },
          roomTypes: {
            select: {
              id: true,
              isAvailable: true,
              priceMonthly: true,
              availableUnits: true,
              totalUnits: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(properties, total, page, limit));
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
    const validated = validateBody(propertyCreateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const landlordId = session.user.role === 'LANDLORD' ? session.user.id : body.landlordId;

    const property = await prisma.property.create({
      data: {
        landlordId,
        companyId: body.companyId || null,
        name: body.name,
        description: body.description,
        fullAddress: body.fullAddress,
        district: body.district,
        streetName: body.streetName,
        city: body.city || 'Hà Nội',
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        totalFloors: parseInt(body.totalFloors) || 1,
        zaloPhone: body.zaloPhone || null,
        landlordNotes: body.landlordNotes || null,
        amenities: body.amenities || [],
        images: body.images || [],
        parkingCar: body.parkingCar ?? false,
        parkingBike: body.parkingBike ?? true,
        evCharging: body.evCharging ?? false,
        petAllowed: body.petAllowed ?? false,
        foreignerOk: body.foreignerOk ?? false,
        status: session.user.role === 'ADMIN' ? (body.status || 'APPROVED') : 'PENDING',
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = validateBody(propertyUpdateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { id, ...data } = body;

    // Verify ownership
    if (session.user.role === 'LANDLORD') {
      const prop = await prisma.property.findFirst({ where: { id, landlordId: session.user.id } });
      if (!prop) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...(data.companyId !== undefined && { companyId: data.companyId || null }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.fullAddress && { fullAddress: data.fullAddress }),
        ...(data.district && { district: data.district }),
        ...(data.streetName && { streetName: data.streetName }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.totalFloors && { totalFloors: parseInt(data.totalFloors) }),
        ...(data.zaloPhone !== undefined && { zaloPhone: data.zaloPhone }),
        ...(data.landlordNotes !== undefined && { landlordNotes: data.landlordNotes }),
        ...(data.amenities && { amenities: data.amenities }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.parkingCar !== undefined && { parkingCar: data.parkingCar }),
        ...(data.parkingBike !== undefined && { parkingBike: data.parkingBike }),
        ...(data.evCharging !== undefined && { evCharging: data.evCharging }),
        ...(data.petAllowed !== undefined && { petAllowed: data.petAllowed }),
        ...(data.foreignerOk !== undefined && { foreignerOk: data.foreignerOk }),
        ...(data.status && { status: data.status }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    if (session.user.role !== 'ADMIN') {
      const prop = await prisma.property.findFirst({ where: { id, landlordId: session.user.id } });
      if (!prop) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
