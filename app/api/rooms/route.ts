import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { roomTypeCreateSchema, roomTypeUpdateSchema, validateBody } from '@/lib/validations';
import { requirePermission } from '@/lib/permissions-server';
import { normalizeListingCode, LISTING_CODE_REGEX, parseComposedListingCode } from '@/lib/listing-code';
import { generateUniqueListingCode } from '@/lib/listing-code-server';

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
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
    const status = url.searchParams.get('status'); // AVAILABLE/UPCOMING/UNAVAILABLE/all

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

    // Status filter (status enum)
    if (status === 'AVAILABLE' || status === 'available' || available === 'true') where.status = 'AVAILABLE';
    else if (status === 'UNAVAILABLE' || status === 'unavailable' || available === 'false') where.status = 'UNAVAILABLE';
    else if (status === 'UPCOMING' || status === 'upcoming') where.status = 'UPCOMING';

    // Property-level filters
    const propertyWhere: any = {};
    // Cho phép lọc nhiều quận cùng lúc: district=Quận A,Quận B
    const districts = district ? district.split(',').map(d => d.trim()).filter(Boolean) : [];
    if (districts.length === 1) {
      propertyWhere.district = { contains: districts[0], mode: 'insensitive' };
    } else if (districts.length > 1) {
      propertyWhere.OR = districts.map(d => ({ district: { contains: d, mode: 'insensitive' } }));
    }
    if (parkingCar === 'true') propertyWhere.parkingCar = true;
    if (foreignerOk === 'true') propertyWhere.foreignerOk = true;
    if (evCharging === 'true') propertyWhere.evCharging = true;
    if (petAllowed === 'true') propertyWhere.petAllowed = true;
    if (companyId === '__none__') propertyWhere.companyId = null;   // tin thuộc tòa CHƯA gán công ty
    else if (companyId) propertyWhere.companyId = companyId;
    if (landlordId) propertyWhere.landlordId = landlordId;

    if (Object.keys(propertyWhere).length > 0) {
      where.property = { ...where.property, ...propertyWhere };
    }
    if (search) {
      const composed = parseComposedListingCode(search);
      if (composed.companyCode && LISTING_CODE_REGEX.test(composed.baseCode)) {
        // Nhập "MS-066-F76EAW" → khớp đúng mã tin + đúng công ty có mã 066
        where.listingCode = composed.baseCode;
        where.property = { ...(where.property || {}), company: { is: { code: { equals: composed.companyCode, mode: 'insensitive' } } } };
      } else {
        const code = normalizeListingCode(search);
        if (LISTING_CODE_REGEX.test(code)) {
          // Nhập đúng mã đầy đủ → tra cứu chính xác theo listingCode
          where.listingCode = code;
        } else {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { listingCode: { contains: search.trim().toUpperCase(), mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            // gõ mã công ty (vd "066") → ra mọi tin của công ty đó
            { property: { company: { is: { code: { equals: search.trim().toUpperCase(), mode: 'insensitive' } } } } },
            { property: { name: { contains: search, mode: 'insensitive' } } },
            { property: { district: { contains: search, mode: 'insensitive' } } },
            { property: { streetName: { contains: search, mode: 'insensitive' } } },
            { property: { fullAddress: { contains: search, mode: 'insensitive' } } },
            { property: { zaloPhone: { contains: search, mode: 'insensitive' } } },
            { property: { landlord: { phone: { contains: search, mode: 'insensitive' } } } },
          ];
        }
      }
    }

    // For landlord, show their own room types regardless of approval
    if (session?.user?.role === 'LANDLORD') {
      delete where.isApproved;
      where.property = { ...where.property, landlordId: session.user.id };
    }

    const role = session?.user?.role;
    const isAdmin = role === 'ADMIN';
    const isBroker = role === 'BROKER';
    const isBrokerOrAdmin = isAdmin || isBroker;
    const isLandlord = role === 'LANDLORD';
    const isInternal = isBrokerOrAdmin || isLandlord; // landlord/admin/broker được thấy availableRoomNames
    const isCustomerOrPublic = !session || role === 'CUSTOMER';
    // CTV (BROKER): chỉ xem liên hệ/hoa hồng khi admin đã cấp quyền tương ứng. ADMIN luôn thấy.
    const canContact = isAdmin || (isBroker && !!(session?.user as any)?.canViewContact);
    const canCommission = isAdmin || (isBroker && !!(session?.user as any)?.canViewCommission);

    const { page, limit, skip } = getPaginationParams(url);

    const [roomTypes, total] = await Promise.all([
      prisma.roomType.findMany({
        where,
        select: {
          id: true,
          propertyId: true,
          name: true,
          listingCode: true,
          typeName: true,
          areaSqm: true,
          priceMonthly: true,
          deposit: true,
          depositType: true,
          description: true,
          amenities: true,
          images: true,
          videos: true,
          videoLinks: true,
          totalUnits: true,
          availableUnits: true,
          availableRoomNames: isInternal ? true : false,
          status: true,
          expectedAvailableDate: true,
          isApproved: true,
          commissionJson: canCommission ? true : false,
          shortTermAllowed: true,
          shortTermMonths: true,
          shortTermPrice: true,
          landlordNotes: isCustomerOrPublic ? false : true,
          viewCount: isBrokerOrAdmin ? true : false,
          createdAt: true,
          updatedAt: true,
          // Người THỰC SỰ bấm tạo tin (truy vết) — chỉ admin-family cần thấy
          ...(isAdmin ? {
            createdBy: { select: { id: true, name: true, email: true, role: true } },
          } : {}),
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
              // Lưu ý + companyId: CTV vẫn xem được (không phải liên hệ).
              ...(isBrokerOrAdmin ? { landlordNotes: true, companyId: true } : {}),
              // Liên hệ/địa chỉ: chỉ khi được quyền xem liên hệ (fullAddress/toạ độ/zaloPhone).
              ...(canContact ? {
                fullAddress: true,
                latitude: true,
                longitude: true,
                zaloPhone: true,
              } : {}),
              company: {
                // zaloGroupLink của công ty cũng là liên hệ → chỉ trả khi có quyền.
                // code: mã công ty để ghép vào mã tin hiển thị (MS-066-XXXXXX).
                select: { id: true, name: true, code: true, zaloGroupLink: canContact },
              },
              landlord: {
                select: {
                  id: true,
                  name: true,
                  // SĐT/email chủ nhà chỉ khi có quyền xem liên hệ.
                  ...(canContact ? { phone: true, email: true } : {}),
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
  } catch (error: any) {
    console.error('GET /api/rooms error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Chỉ LANDLORD (tòa của mình), ADMIN, ADMIN_STAFF được tạo tin đăng — chặn BROKER/CUSTOMER
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'ADMIN_STAFF' && role !== 'LANDLORD') {
      return NextResponse.json({ error: 'Không có quyền tạo tin đăng' }, { status: 403 });
    }

    const body = await req.json();
    const validated = validateBody(roomTypeCreateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    // LANDLORD chỉ được tạo tin đăng trong tòa nhà mình sở hữu
    if (role === 'LANDLORD') {
      const prop = await prisma.property.findUnique({ where: { id: body.propertyId }, select: { landlordId: true } });
      if (!prop || prop.landlordId !== session.user.id) {
        return NextResponse.json({ error: 'Tòa nhà không thuộc quyền quản lý của bạn' }, { status: 403 });
      }
    }

    // EDIT_COMMISSION: staff cần permission để set commissionJson
    if (session.user.role === 'ADMIN_STAFF' && body.commissionJson) {
      const denial = requirePermission(session, 'EDIT_COMMISSION');
      if (denial) return denial;
    }

    // Mã tin đăng bất biến, sinh server-side (client KHÔNG gửi được listingCode)
    const listingCode = await generateUniqueListingCode(prisma);

    const roomType = await prisma.roomType.create({
      data: {
        propertyId: body.propertyId,
        listingCode,
        name: body.name,
        typeName: body.typeName || 'don',
        areaSqm: parseFloat(body.areaSqm),
        priceMonthly: parseFloat(body.priceMonthly),
        deposit: body.deposit ? parseFloat(body.deposit) : null,
        depositType: body.depositType || null,
        description: body.description,
        amenities: body.amenities || [],
        images: body.images || [],
        videos: body.videos || [],
        videoLinks: body.videoLinks || [],
        totalUnits: parseInt(body.totalUnits) || 1,
        availableUnits: Number.isFinite(parseInt(body.availableUnits))
          ? parseInt(body.availableUnits)
          : (parseInt(body.totalUnits) || 1),
        availableRoomNames: body.availableRoomNames || null,
        commissionJson: body.commissionJson || null,
        shortTermAllowed: body.shortTermAllowed ?? false,
        shortTermMonths: body.shortTermMonths || null,
        shortTermPrice: body.shortTermPrice ? parseFloat(body.shortTermPrice) : null,
        landlordNotes: body.landlordNotes || null,
        status: body.status || 'AVAILABLE',
        expectedAvailableDate: body.expectedAvailableDate ? new Date(body.expectedAvailableDate) : null,
        isApproved: session.user.role === 'ADMIN' ? (body.isApproved ?? true) : false,
        createdById: session.user.id, // truy vết: tài khoản thực sự bấm tạo (kể cả admin tạo hộ chủ nhà)
      },
    });

    return NextResponse.json(roomType, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/rooms error:', error);
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
    const validated = validateBody(roomTypeUpdateSchema, body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { id, ...data } = body;

    // Chặn BROKER/CUSTOMER sửa tin đăng (chỉ ADMIN/ADMIN_STAFF/LANDLORD-sở-hữu)
    const role = session.user.role;
    if (role === 'BROKER' || role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Không có quyền sửa tin đăng' }, { status: 403 });
    }

    // Load bản hiện tại để (a) kiểm tra sở hữu của LANDLORD, (b) diff isApproved cho staff
    const existing = await prisma.roomType.findUnique({
      where: { id },
      select: { isApproved: true, property: { select: { landlordId: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy tin đăng' }, { status: 404 });
    if (role === 'LANDLORD' && existing.property.landlordId !== session.user.id) {
      return NextResponse.json({ error: 'Tin đăng không thuộc quyền quản lý của bạn' }, { status: 403 });
    }

    // Chỉ ADMIN/ADMIN_STAFF được đổi trạng thái duyệt — landlord không thể tự duyệt
    const canSetApproval = role === 'ADMIN' || role === 'ADMIN_STAFF';

    // Staff permission checks
    if (role === 'ADMIN_STAFF') {
      // EDIT_COMMISSION — chỉ khi đổi commissionJson
      if (data.commissionJson !== undefined) {
        const denial = requirePermission(session, 'EDIT_COMMISSION');
        if (denial) return denial;
      }
      // APPROVE_LISTINGS — chỉ khi THỰC SỰ đổi isApproved (diff thay vì presence,
      // để staff thiếu quyền vẫn sửa được các field khác mà form luôn gửi kèm isApproved)
      if (data.isApproved !== undefined && data.isApproved !== existing.isApproved) {
        const denial = requirePermission(session, 'APPROVE_LISTINGS');
        if (denial) return denial;
      }
    }

    const roomType = await prisma.roomType.update({
      where: { id },
      data: {
        ...(data.propertyId && { propertyId: data.propertyId }),
        ...(data.name && { name: data.name }),
        ...(data.typeName && { typeName: data.typeName }),
        ...(data.areaSqm && { areaSqm: parseFloat(data.areaSqm) }),
        ...(data.priceMonthly && { priceMonthly: parseFloat(data.priceMonthly) }),
        ...(data.deposit !== undefined && { deposit: data.deposit ? parseFloat(data.deposit) : null }),
        ...(data.depositType !== undefined && { depositType: data.depositType || null }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amenities && { amenities: data.amenities }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.videos !== undefined && { videos: data.videos }),
        ...(data.videoLinks !== undefined && { videoLinks: data.videoLinks }),
        ...(data.totalUnits !== undefined && { totalUnits: parseInt(data.totalUnits) }),
        ...(data.availableUnits !== undefined && { availableUnits: parseInt(data.availableUnits) }),
        ...(data.availableRoomNames !== undefined && { availableRoomNames: data.availableRoomNames }),
        ...(data.commissionJson !== undefined && { commissionJson: data.commissionJson }),
        ...(data.shortTermAllowed !== undefined && { shortTermAllowed: data.shortTermAllowed }),
        ...(data.shortTermMonths !== undefined && { shortTermMonths: data.shortTermMonths }),
        ...(data.shortTermPrice !== undefined && { shortTermPrice: data.shortTermPrice ? parseFloat(data.shortTermPrice) : null }),
        ...(data.landlordNotes !== undefined && { landlordNotes: data.landlordNotes }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.expectedAvailableDate !== undefined && {
          expectedAvailableDate: data.expectedAvailableDate ? new Date(data.expectedAvailableDate) : null,
        }),
        ...(canSetApproval && data.isApproved !== undefined && { isApproved: data.isApproved }),
      },
    });

    return NextResponse.json(roomType);
  } catch (error: any) {
    console.error('PUT /api/rooms error:', error);
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

    // Chỉ ADMIN/ADMIN_STAFF, hoặc LANDLORD sở hữu tòa nhà, mới được xóa tin đăng
    const role = session.user.role;
    if (role === 'BROKER' || role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Không có quyền xóa tin đăng' }, { status: 403 });
    }
    if (role === 'LANDLORD') {
      const existing = await prisma.roomType.findUnique({
        where: { id },
        select: { property: { select: { landlordId: true } } },
      });
      if (!existing || existing.property.landlordId !== session.user.id) {
        return NextResponse.json({ error: 'Tin đăng không thuộc quyền quản lý của bạn' }, { status: 403 });
      }
    }

    await prisma.roomType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/rooms error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
