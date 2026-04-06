import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/rooms/import — bulk import room types from parsed Excel data
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu' }, { status: 400 });
    }

    // Get existing properties for matching
    const existingProperties = await prisma.property.findMany({
      select: { id: true, name: true, district: true },
    });

    let createdProperties = 0;
    let createdRoomTypes = 0;
    const propertyCache: Record<string, string> = {}; // key -> propertyId

    for (const row of rows) {
      const propKey = `${(row.propertyName || '').trim().toLowerCase()}|${(row.district || '').trim().toLowerCase()}`;

      let propertyId = propertyCache[propKey];

      if (!propertyId) {
        // Try to match existing property by name + district
        const existing = existingProperties.find(
          p => p.name.toLowerCase() === (row.propertyName || '').trim().toLowerCase()
            && p.district.toLowerCase() === (row.district || '').trim().toLowerCase()
        );

        if (existing) {
          propertyId = existing.id;
        } else {
          // Create new property
          const newProp = await prisma.property.create({
            data: {
              landlordId: session.user.id,
              name: (row.propertyName || '').trim(),
              fullAddress: (row.fullAddress || '').trim() || `${row.streetName || ''}, ${row.district || ''}, ${row.city || 'Hà Nội'}`,
              district: (row.district || '').trim(),
              streetName: (row.streetName || '').trim(),
              city: (row.city || '').trim() || 'Hà Nội',
              totalFloors: parseInt(row.totalFloors) || 1,
              parkingCar: row.parkingCar === true || row.parkingCar === 'TRUE',
              evCharging: row.evCharging === true || row.evCharging === 'TRUE',
              petAllowed: row.petAllowed === true || row.petAllowed === 'TRUE',
              foreignerOk: row.foreignerOk === true || row.foreignerOk === 'TRUE',
              status: 'PENDING',
            },
          });
          propertyId = newProp.id;
          existingProperties.push({ id: newProp.id, name: newProp.name, district: newProp.district });
          createdProperties++;
        }
        propertyCache[propKey] = propertyId;
      }

      // Build commission JSON
      let commissionJson: string | null = null;
      if (row.commission6 || row.commission12) {
        const c: Record<string, number> = {};
        if (row.commission6) c['6'] = parseFloat(row.commission6);
        if (row.commission12) c['12'] = parseFloat(row.commission12);
        commissionJson = JSON.stringify(c);
      }

      // Parse amenities
      const amenities = row.amenities
        ? String(row.amenities).split(',').map((a: string) => a.trim()).filter(Boolean)
        : [];

      const totalUnits = parseInt(row.totalUnits) || 1;

      await prisma.roomType.create({
        data: {
          propertyId,
          name: (row.roomTypeName || '').trim(),
          typeName: (row.typeName || 'don').trim(),
          areaSqm: parseFloat(row.areaSqm) || 0,
          priceMonthly: parseFloat(row.priceMonthly) || 0,
          deposit: row.deposit ? parseFloat(row.deposit) : null,
          totalUnits,
          availableUnits: totalUnits,
          amenities,
          commissionJson,
          shortTermAllowed: row.shortTermAllowed === true || row.shortTermAllowed === 'TRUE',
          shortTermMonths: row.shortTermMonths ? String(row.shortTermMonths) : null,
          shortTermPrice: row.shortTermPrice ? parseFloat(row.shortTermPrice) : null,
          isAvailable: true,
          isApproved: true,
        },
      });
      createdRoomTypes++;
    }

    return NextResponse.json({
      success: true,
      createdProperties,
      createdRoomTypes,
      message: `Đã import ${createdRoomTypes} loại phòng thuộc ${Object.keys(propertyCache).length} tòa nhà (${createdProperties} tòa mới)`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Lỗi server khi import' }, { status: 500 });
  }
}
