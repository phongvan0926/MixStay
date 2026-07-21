import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { propertyCreateSchema, propertyUpdateSchema, validateBody } from '@/lib/validations';
import { requirePermission } from '@/lib/permissions-server';
import { geocodeAddress } from '@/lib/geocode';

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
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
        { fullAddress: { contains: search, mode: 'insensitive' } },
        { landlord: { is: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const companyId = url.searchParams.get('companyId');
    if (companyId === '__none__') where.companyId = null;      // tòa chưa thuộc công ty nào
    else if (companyId) where.companyId = companyId;

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
          company: {
            select: { id: true, name: true, logo: true, isApproved: true },
          },
          roomTypes: {
            select: {
              id: true,
              status: true,
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
  } catch (error: any) {
    console.error('/api/properties error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Chỉ LANDLORD (tự tạo), ADMIN, ADMIN_STAFF được tạo tòa nhà — chặn BROKER/CUSTOMER
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'ADMIN_STAFF' && role !== 'LANDLORD') {
      return NextResponse.json({ error: 'Không có quyền tạo tòa nhà' }, { status: 403 });
    }

    const body = await req.json();
    const validated = validateBody(propertyCreateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    // Đã bỏ ô chọn chủ nhà: LANDLORD tự tạo → chính họ; admin/staff → gắn chính người tạo
    // (tòa nhà thuộc CÔNG TY đã chọn). Vẫn cho phép truyền landlordId nếu có (tương thích cũ).
    const landlordId = session.user.role === 'LANDLORD' ? session.user.id : (body.landlordId || session.user.id);

    // LANDLORD chỉ được gán tòa vào công ty ĐÃ DUYỆT, hoặc công ty do CHÍNH HỌ tạo (chờ duyệt).
    if (body.companyId && session.user.role === 'LANDLORD') {
      const co = await prisma.company.findUnique({ where: { id: body.companyId }, select: { isApproved: true, createdById: true } });
      if (!co || (!co.isApproved && co.createdById !== session.user.id)) {
        return NextResponse.json({ error: 'Không thể gán tòa nhà vào công ty này' }, { status: 403 });
      }
    }

    // Chủ nhà không chọn công ty NHƯNG có ĐÚNG 1 công ty của mình → tự gắn (tránh tòa "mồ côi"
    // công ty như trước: chủ nhà tạo công ty riêng nhưng tòa lại companyId=null).
    let resolvedCompanyId: string | null = body.companyId || null;
    if (!resolvedCompanyId && session.user.role === 'LANDLORD') {
      const own = await prisma.company.findMany({ where: { createdById: session.user.id }, select: { id: true }, take: 2 });
      if (own.length === 1) resolvedCompanyId = own[0].id;
    }

    // Tự geocode toạ độ từ địa chỉ khi client không gửi (để pin tự có trên bản đồ /ban-do).
    // Geocode lỗi → null, KHÔNG chặn tạo tòa (backfill lại bằng scripts/geocode-properties.js).
    let geo: { lat: number; lng: number } | null = null;
    if (!body.latitude || !body.longitude) {
      geo = await geocodeAddress({ fullAddress: body.fullAddress, streetName: body.streetName, district: body.district, city: body.city });
    }

    const property = await prisma.property.create({
      data: {
        landlordId,
        companyId: resolvedCompanyId,
        name: body.name,
        description: body.description,
        fullAddress: body.fullAddress,
        houseNumber: body.houseNumber || null, // số nhà (ẩn với khách)
        district: body.district,
        streetName: body.streetName,
        city: body.city || 'Hà Nội',
        latitude: body.latitude ? parseFloat(body.latitude) : (geo?.lat ?? null),
        longitude: body.longitude ? parseFloat(body.longitude) : (geo?.lng ?? null),
        totalFloors: parseInt(body.totalFloors) || 1,
        zaloPhone: body.zaloPhone || null,
        landlordNotes: body.landlordNotes || null,
        services: body.services ?? undefined,
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
  } catch (error: any) {
    console.error('/api/properties error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
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

    // Verify ownership for landlord; load current for admin/staff (need for permission check + landlordId transfer)
    let current: { landlordId: string; status: string } | null = null;
    if (session.user.role === 'LANDLORD') {
      const prop = await prisma.property.findFirst({ where: { id, landlordId: session.user.id }, select: { landlordId: true, status: true } });
      if (!prop) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
      current = prop;
      // Landlord không được đổi landlordId (chuyển sở hữu cho người khác)
      if (data.landlordId && data.landlordId !== current.landlordId) {
        return NextResponse.json({ error: 'Chủ nhà không có quyền chuyển sở hữu tòa nhà' }, { status: 403 });
      }
    } else if (session.user.role === 'ADMIN' || session.user.role === 'ADMIN_STAFF') {
      current = await prisma.property.findUnique({ where: { id }, select: { landlordId: true, status: true } });
      if (!current) return NextResponse.json({ error: 'Không tìm thấy tòa nhà' }, { status: 404 });

      // TRANSFER_PROPERTY_OWNERSHIP: chỉ check khi đổi landlord (super-admin bypass trong requirePermission)
      if (data.landlordId && data.landlordId !== current.landlordId) {
        const denial = requirePermission(session, 'TRANSFER_PROPERTY_OWNERSHIP');
        if (denial) return denial;
      }
      // APPROVE_LISTINGS: chỉ check khi đổi status
      if (data.status && data.status !== current.status) {
        const denial = requirePermission(session, 'APPROVE_LISTINGS');
        if (denial) return denial;
      }
    } else {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    // LANDLORD chỉ được gán tòa vào công ty ĐÃ DUYỆT, hoặc công ty do CHÍNH HỌ tạo (chờ duyệt).
    if (session.user.role === 'LANDLORD' && data.companyId) {
      const co = await prisma.company.findUnique({ where: { id: data.companyId }, select: { isApproved: true, createdById: true } });
      if (!co || (!co.isApproved && co.createdById !== session.user.id)) {
        return NextResponse.json({ error: 'Không thể gán tòa nhà vào công ty này' }, { status: 403 });
      }
    }

    // Địa chỉ đổi mà client không gửi toạ độ mới → re-geocode để pin bản đồ đi theo địa chỉ.
    let geo: { lat: number; lng: number } | null = null;
    if ((data.fullAddress || data.streetName || data.district) && !data.latitude && !data.longitude) {
      const cur = await prisma.property.findUnique({
        where: { id },
        select: { fullAddress: true, streetName: true, district: true, city: true },
      });
      geo = await geocodeAddress({
        fullAddress: data.fullAddress ?? cur?.fullAddress,
        streetName: data.streetName ?? cur?.streetName,
        district: data.district ?? cur?.district,
        city: data.city ?? cur?.city,
      });
    }

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...(data.companyId !== undefined && { companyId: data.companyId || null }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.fullAddress && { fullAddress: data.fullAddress }),
        ...(data.houseNumber !== undefined && { houseNumber: data.houseNumber || null }),
        ...(data.district && { district: data.district }),
        ...(data.streetName && { streetName: data.streetName }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.totalFloors && { totalFloors: parseInt(data.totalFloors) }),
        ...(data.zaloPhone !== undefined && { zaloPhone: data.zaloPhone }),
        ...(data.landlordNotes !== undefined && { landlordNotes: data.landlordNotes }),
        ...(data.services !== undefined && { services: data.services }),
        ...(data.amenities && { amenities: data.amenities }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.landlordId && session.user.role !== 'LANDLORD' && { landlordId: data.landlordId }),
        ...(data.parkingCar !== undefined && { parkingCar: data.parkingCar }),
        ...(data.parkingBike !== undefined && { parkingBike: data.parkingBike }),
        ...(data.evCharging !== undefined && { evCharging: data.evCharging }),
        ...(data.petAllowed !== undefined && { petAllowed: data.petAllowed }),
        ...(data.foreignerOk !== undefined && { foreignerOk: data.foreignerOk }),
        ...(data.status && { status: data.status }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.latitude && { latitude: parseFloat(data.latitude) }),
        ...(data.longitude && { longitude: parseFloat(data.longitude) }),
        ...(geo && { latitude: geo.lat, longitude: geo.lng }),
      },
    });

    return NextResponse.json(property);
  } catch (error: any) {
    console.error('/api/properties error:', error);
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

    if (session.user.role === 'LANDLORD') {
      // Landlord chỉ xóa property của mình
      const prop = await prisma.property.findFirst({ where: { id, landlordId: session.user.id } });
      if (!prop) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    } else if (session.user.role === 'ADMIN_STAFF') {
      const denial = requirePermission(session, 'DELETE_PROPERTY');
      if (denial) return denial;
    } else if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('/api/properties error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
