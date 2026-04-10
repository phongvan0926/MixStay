import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const password = await hash('123456', 12);

  // Create users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mixstay.vn' },
    update: {},
    create: { name: 'Admin Công ty', email: 'admin@mixstay.vn', phone: '0901000001', password, role: 'ADMIN' },
  });

  const broker1 = await prisma.user.upsert({
    where: { email: 'broker@mixstay.vn' },
    update: {},
    create: { name: 'Nguyễn Văn Môi Giới', email: 'broker@mixstay.vn', phone: '0901000002', password, role: 'BROKER' },
  });

  const broker2 = await prisma.user.upsert({
    where: { email: 'broker2@mixstay.vn' },
    update: {},
    create: { name: 'Trần Thị Sale', email: 'broker2@mixstay.vn', phone: '0901000005', password, role: 'BROKER' },
  });

  const landlord = await prisma.user.upsert({
    where: { email: 'landlord@mixstay.vn' },
    update: {},
    create: { name: 'Lê Văn Chủ Nhà', email: 'landlord@mixstay.vn', phone: '0901000003', password, role: 'LANDLORD' },
  });

  const landlord2 = await prisma.user.upsert({
    where: { email: 'landlord2@mixstay.vn' },
    update: {},
    create: { name: 'Phạm Thị Chủ Nhà', email: 'landlord2@mixstay.vn', phone: '0901000006', password, role: 'LANDLORD' },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@mixstay.vn' },
    update: {},
    create: { name: 'Hoàng Minh Khách', email: 'customer@mixstay.vn', phone: '0901000004', password, role: 'CUSTOMER' },
  });

  console.log('✅ Users created');

  // Create properties
  const prop1 = await prisma.property.create({
    data: {
      landlordId: landlord.id,
      name: 'Chung cư mini Cầu Giấy Premium',
      description: 'Tòa nhà 6 tầng, thang máy, bảo vệ 24/7, ngay gần Indochina Plaza',
      fullAddress: 'Số 12 ngõ 45 Trần Thái Tông, Dịch Vọng, Cầu Giấy, Hà Nội',
      district: 'Cầu Giấy',
      streetName: 'Trần Thái Tông',
      city: 'Hà Nội',
      totalFloors: 6,
      amenities: ['Thang máy', 'Bảo vệ 24/7', 'Gửi xe miễn phí', 'Camera an ninh', 'Wifi tốc độ cao'],
      status: 'APPROVED',
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      landlordId: landlord.id,
      name: 'Nhà trọ Đống Đa Green',
      description: 'Tòa nhà mới xây, khu vực yên tĩnh, gần ĐH Bách Khoa',
      fullAddress: '88 ngõ 159 Phố Chợ Khâm Thiên, Đống Đa, Hà Nội',
      district: 'Đống Đa',
      streetName: 'Khâm Thiên',
      city: 'Hà Nội',
      totalFloors: 5,
      amenities: ['Gửi xe', 'Giặt là', 'Camera'],
      status: 'APPROVED',
    },
  });

  const prop3 = await prisma.property.create({
    data: {
      landlordId: landlord2.id,
      name: 'Mini Apartment Thanh Xuân',
      description: 'Căn hộ mini full nội thất, gần Royal City',
      fullAddress: 'Số 5 ngõ 20 Nguyễn Quý Đức, Thanh Xuân, Hà Nội',
      district: 'Thanh Xuân',
      streetName: 'Nguyễn Quý Đức',
      city: 'Hà Nội',
      totalFloors: 7,
      amenities: ['Thang máy', 'Bảo vệ', 'Máy giặt chung', 'Sân phơi'],
      status: 'APPROVED',
    },
  });

  const prop4 = await prisma.property.create({
    data: {
      landlordId: landlord2.id,
      name: 'HomeStay Ba Đình Central',
      description: 'Vị trí trung tâm, gần Lotte Center, full nội thất cao cấp',
      fullAddress: '15 ngõ 8 Liễu Giai, Ba Đình, Hà Nội',
      district: 'Ba Đình',
      streetName: 'Liễu Giai',
      city: 'Hà Nội',
      totalFloors: 5,
      amenities: ['Thang máy', 'Bảo vệ 24/7', 'Rooftop', 'Smart lock'],
      status: 'PENDING',
    },
  });

  console.log('✅ Properties created');

  // Create room types
  const roomTypesData = [
    // Prop 1 - Cầu Giấy Premium
    {
      propertyId: prop1.id, name: 'Phòng đơn 25m²', typeName: 'don',
      areaSqm: 25, priceMonthly: 3500000, deposit: 3500000,
      amenities: ['Điều hoà', 'Nóng lạnh', 'WC riêng', 'Ban công'],
      totalUnits: 3, availableUnits: 2, availableRoomNames: '201, 301',
      isAvailable: true, isApproved: true,
    },
    {
      propertyId: prop1.id, name: 'Phòng có bếp 30m²', typeName: 'gac_xep',
      areaSqm: 30, priceMonthly: 4200000, deposit: 4200000,
      amenities: ['Điều hoà', 'Nóng lạnh', 'WC riêng', 'Bếp riêng'],
      totalUnits: 2, availableUnits: 1, availableRoomNames: '202',
      isAvailable: true, isApproved: true,
    },
    {
      propertyId: prop1.id, name: 'Studio 35m² cao cấp', typeName: 'studio',
      areaSqm: 35, priceMonthly: 5000000, deposit: 5000000,
      amenities: ['Điều hoà', 'Nóng lạnh', 'WC riêng', 'Bếp riêng', 'Ban công'],
      totalUnits: 2, availableUnits: 1, availableRoomNames: '401',
      isAvailable: true, isApproved: true,
    },
    {
      propertyId: prop1.id, name: 'Phòng nhỏ 20m²', typeName: 'don',
      areaSqm: 20, priceMonthly: 2800000, deposit: 2800000,
      amenities: ['Điều hoà', 'Nóng lạnh', 'WC chung'],
      totalUnits: 2, availableUnits: 2, availableRoomNames: '501, 502',
      isAvailable: true, isApproved: true,
    },
    // Prop 2 - Đống Đa Green
    {
      propertyId: prop2.id, name: 'Phòng tầng 1 - 22m²', typeName: 'don',
      areaSqm: 22, priceMonthly: 2500000, deposit: 2500000,
      amenities: ['Nóng lạnh', 'WC riêng'],
      totalUnits: 2, availableUnits: 1, availableRoomNames: '101',
      isAvailable: true, isApproved: true,
    },
    {
      propertyId: prop2.id, name: 'Phòng nội thất 28m²', typeName: 'don',
      areaSqm: 28, priceMonthly: 3200000, deposit: 3200000,
      amenities: ['Điều hoà', 'Nóng lạnh', 'WC riêng', 'Giường tủ'],
      totalUnits: 3, availableUnits: 1, availableRoomNames: '201',
      isAvailable: true, isApproved: true,
    },
    // Prop 3 - Thanh Xuân
    {
      propertyId: prop3.id, name: 'Căn hộ full nội thất 32m²', typeName: '1k1n',
      areaSqm: 32, priceMonthly: 4500000, deposit: 4500000,
      amenities: ['Full nội thất', 'Điều hoà', 'Máy giặt riêng', 'Bếp riêng'],
      totalUnits: 2, availableUnits: 2, availableRoomNames: '301, 302',
      isAvailable: true, isApproved: true,
      shortTermAllowed: true, shortTermMonths: '1,3', shortTermPrice: 5500000,
    },
    {
      propertyId: prop3.id, name: 'Studio 40m² duplex', typeName: 'studio',
      areaSqm: 40, priceMonthly: 6000000, deposit: 6000000,
      amenities: ['Studio', 'Full nội thất', 'Điều hoà', 'Bếp riêng', 'Ban công'],
      totalUnits: 2, availableUnits: 1, availableRoomNames: '501',
      isAvailable: true, isApproved: true,
    },
    {
      propertyId: prop3.id, name: 'Phòng đơn 22m²', typeName: 'don',
      areaSqm: 22, priceMonthly: 2800000, deposit: 2800000,
      amenities: ['Điều hoà', 'WC riêng'],
      totalUnits: 3, availableUnits: 0,
      isAvailable: false, isApproved: true,
    },
  ];

  const createdRoomTypes = [];
  for (const rt of roomTypesData) {
    const created = await prisma.roomType.create({ data: rt });
    createdRoomTypes.push(created);
  }

  console.log('✅ Room types created');

  // Create some deals
  // Phòng đơn 25m² Cầu Giấy - 1 phòng đã cho thuê
  const rt1 = createdRoomTypes[0]; // Phòng đơn 25m²
  // Phòng nội thất 28m² Đống Đa - 2 phòng đã cho thuê
  const rt2 = createdRoomTypes[5]; // Phòng nội thất 28m²
  // Phòng đơn 22m² Thanh Xuân - hết phòng
  const rt3 = createdRoomTypes[8]; // Phòng đơn 22m²

  await prisma.deal.create({
    data: {
      roomTypeId: rt1.id, brokerId: broker1.id, customerName: 'Nguyễn Minh Tuấn', customerPhone: '0987654321',
      dealPrice: 3500000, commissionTotal: 1750000, commissionBroker: 1050000, commissionCompany: 700000,
      commissionRate: 60, status: 'CONFIRMED', confirmedAt: new Date(),
    },
  });

  await prisma.deal.create({
    data: {
      roomTypeId: rt2.id, brokerId: broker1.id, customerName: 'Lê Thị Hoa', customerPhone: '0912333444',
      dealPrice: 3200000, commissionTotal: 1600000, commissionBroker: 960000, commissionCompany: 640000,
      commissionRate: 60, status: 'PAID', confirmedAt: new Date(),
    },
  });

  await prisma.deal.create({
    data: {
      roomTypeId: rt3.id, brokerId: broker2.id, customerName: 'Trần Văn Đức', customerPhone: '0977888999',
      dealPrice: 2800000, commissionTotal: 1400000, commissionBroker: 840000, commissionCompany: 560000,
      commissionRate: 60, status: 'PENDING',
    },
  });

  console.log('✅ Deals created');

  // Create share links
  const availableRoomTypes = await prisma.roomType.findMany({ where: { isAvailable: true }, take: 3 });
  for (const rt of availableRoomTypes) {
    await prisma.shareLink.create({
      data: {
        roomTypeId: rt.id,
        brokerId: broker1.id,
        token: `demo${rt.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}${Math.random().toString(36).slice(2, 6)}`,
        viewCount: Math.floor(Math.random() * 50),
      },
    });
  }

  console.log('✅ Share links created');

  // Settings
  await prisma.setting.upsert({
    where: { key: 'commission_broker_percent' },
    update: {},
    create: { key: 'commission_broker_percent', value: '60' },
  });

  console.log('✅ Settings created');
  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Demo accounts (password: 123456):');
  console.log('   Admin:    admin@mixstay.vn');
  console.log('   Broker:   broker@mixstay.vn');
  console.log('   Landlord: landlord@mixstay.vn');
  console.log('   Customer: customer@mixstay.vn');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
