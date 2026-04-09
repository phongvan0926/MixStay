import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { roomTypeCreateSchema, roomTypeUpdateSchema, validateBody } from '@/lib/validations';

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const propertyId = url.searchParams.get('propertyId');
    const available = url.searchParams.get('available');
    const district = url.searchParams.get('district');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const search = url.searchParams.get('search');

    const typeName = url.searchParams.get('typeName') || url.searchParams.get('roomType');
    const parkingCar = url.searchParams.get('parkingCar');
    const foreignerOk = url.searchParams.get('foreignerOk');
    const evCharging = url.searchParams.get('evCharging');
    const petAllowed = url.searchParams.get('petAllowed');
    const shortTerm = url.searchParams.get('shortTerm');
    const companyId = url.searchParams.get('companyId');
    const landlordId = url.searchParams.get('landlordId');
    const status = url.searchParams.get('status'); // available/unavailable/all

    const where: any = {};

    // Admin sees all rooms; others only see approved
    if (session?.user?.role !== 'ADMIN') {
      where.isApproved = true;
    }

    if (propertyId) where.propertyId = propertyId;
    if (typeName) where.typeName = typeName;
    if (minPrice) where.priceMonthly = { ...where.priceMonthly, gte: parseFloat(minPrice) };
    if (maxPrice) where.priceMonthly = { ...where.priceMonthly, lte: parseFloat(maxPrice) };
    if (shortTerm === 'true') where.shortTermAllowed = true;

    // Status filter
    if (status === 'available' || available === 'true') where.isAvailable = true;
    else if (status === 'unavailable' || available === 'false') where.isAvailable = false;
    // status === 'all' → no filter

    // Property-level filters
    const propertyWhere: any = {};
    if (district) propertyWhere.district = { contains: district, mode: 'insensitive' };
    if (parkingCar === 'true') propertyWhere.parkingCar = true;
    if (foreignerOk === 'true') propertyWhere.foreignerOk = true;
    if (evCharging === 'true') propertyWhere.evCharging = true;
    if (petAllowed === 'true') propertyWhere.petAllowed = true;
    if (companyId) propertyWhere.companyId = companyId;
    if (landlordId) propertyWhere.landlordId = landlordId;

    if (Object.keys(propertyWhere).length > 0) {
      where.property = { ...where.property, ...propertyWhere };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { property: { name: { contains: search, mode: 'insensitive' } } },
        { property: { district: { contains: search, mode: 'insensitive' } } },
        { property: { streetName: { contains: search, mode: 'insensitive' } } },
        { property: { fullAddress: { contains: search, mode: 'insensitive' } } },
        { property: { zaloPhone: { contains: search, mode: 'insensitive' } } },
        { property: { landlord: { phone: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    // For landlord, show their own room types regardless of approval
    if (session?.user?.role === 'LANDLORD') {
      delete where.isApproved;
      where.property = { ...where.property, landlordId: session.user.id };
    }

    const isBrokerOrAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'BROKER';
    const isCustomerOrPublic = !session || session?.user?.role === 'CUSTOMER';

    const { page, limit, skip } = getPaginationParams(url);

    const [roomTypes, total] = await Promise.all([
      prisma.roomType.findMany({
        where,
        select: {
          id: true,
          propertyId: true,
          name: true,
          typeName: true,
          areaSqm: true,
          priceMonthly: true,
          deposit: true,
          description: true,
          amenities: true,
          images: true,
          totalUnits: true,
          availableUnits: true,
          availableRoomNames: true,
          isAvailable: true,
          isApproved: true,
          commissionJson: isBrokerOrAdmin ? true : false,
          shortTermAllowed: true,
          shortTermMonths: true,
          shortTermPrice: true,
          landlordNotes: isCustomerOrPublic ? false : true,
          viewCount: isBrokerOrAdmin ? true : false,
          createdAt: true,
          updatedAt: true,
          property: {
            select: {
              id: true,
              name: true,
              district: true,
              streetName: true,
              city: true,
              amenities: true,
              images: true,
              totalFloors: true,
              parkingCar: true,
              parkingBike: true,
              evCharging: true,
              petAllowed: true,
              foreignerOk: true,
              status: true,
              // Only broker/admin see fullAddress, coords, zaloPhone
              ...(isBrokerOrAdmin ? {
                fullAddress: true,
                latitude: true,
                longitude: true,
                zaloPhone: true,
                landlordNotes: true,
                companyId: true,
              } : {}),
              company: {
                select: { id: true, name: true, zaloGroupLink: true },
              },
              landlord: {
                select: {
                  id: true,
                  name: true,
                  // Only broker/admin see landlord phone/email
                  ...(isBrokerOrAdmin ? { phone: true, email: true } : {}),
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.roomType.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(roomTypes, total, page, limit));
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
    const validated = validateBody(roomTypeCreateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const roomType = await prisma.roomType.create({
      data: {
        propertyId: body.propertyId,
        name: body.name,
        typeName: body.typeName || 'don',
        areaSqm: parseFloat(body.areaSqm),
        priceMonthly: parseFloat(body.priceMonthly),
        deposit: body.deposit ? parseFloat(body.deposit) : null,
        description: body.description,
        amenities: body.amenities || [],
        images: body.images || [],
        totalUnits: parseInt(body.totalUnits) || 1,
        availableUnits: parseInt(body.availableUnits) ?? parseInt(body.totalUnits) ?? 1,
        availableRoomNames: body.availableRoomNames || null,
        commissionJson: body.commissionJson || null,
        shortTermAllowed: body.shortTermAllowed ?? false,
        shortTermMonths: body.shortTermMonths || null,
        shortTermPrice: body.shortTermPrice ? parseFloat(body.shortTermPrice) : null,
        landlordNotes: body.landlordNotes || null,
        isAvailable: body.isAvailable ?? true,
        isApproved: session.user.role === 'ADMIN' ? (body.isApproved ?? true) : false,
      },
    });

    return NextResponse.json(roomType, { status: 201 });
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
    const validated = validateBody(roomTypeUpdateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { id, ...data } = body;

    const roomType = await prisma.roomType.update({
      where: { id },
      data: {
        ...(data.propertyId && { propertyId: data.propertyId }),
        ...(data.name && { name: data.name }),
        ...(data.typeName && { typeName: data.typeName }),
        ...(data.areaSqm && { areaSqm: parseFloat(data.areaSqm) }),
        ...(data.priceMonthly && { priceMonthly: parseFloat(data.priceMonthly) }),
        ...(data.deposit !== undefined && { deposit: data.deposit ? parseFloat(data.deposit) : null }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amenities && { amenities: data.amenities }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.totalUnits !== undefined && { totalUnits: parseInt(data.totalUnits) }),
        ...(data.availableUnits !== undefined && { availableUnits: parseInt(data.availableUnits) }),
        ...(data.availableRoomNames !== undefined && { availableRoomNames: data.availableRoomNames }),
        ...(data.commissionJson !== undefined && { commissionJson: data.commissionJson }),
        ...(data.shortTermAllowed !== undefined && { shortTermAllowed: data.shortTermAllowed }),
        ...(data.shortTermMonths !== undefined && { shortTermMonths: data.shortTermMonths }),
        ...(data.shortTermPrice !== undefined && { shortTermPrice: data.shortTermPrice ? parseFloat(data.shortTermPrice) : null }),
        ...(data.landlordNotes !== undefined && { landlordNotes: data.landlordNotes }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.isApproved !== undefined && { isApproved: data.isApproved }),
      },
    });

    return NextResponse.json(roomType);
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

    await prisma.roomType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
