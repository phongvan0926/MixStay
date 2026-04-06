/**
 * Migration script: Room → RoomType
 *
 * Chuyển dữ liệu từ bảng rooms (cũ) sang room_types (mới).
 * Mỗi Room cũ → 1 RoomType mới với totalUnits=1, availableUnits=(isAvailable?1:0)
 *
 * Chạy: npx tsx prisma/migrate-rooms.ts
 *
 * LƯU Ý: Chạy TRƯỚC khi chạy `npx prisma db push` với schema mới.
 * Script này dùng raw SQL để hoạt động với cả schema cũ.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Bắt đầu migration Room → RoomType...\n');

  // Check if old "rooms" table exists
  const tablesResult = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rooms'
  `;

  if (tablesResult.length === 0) {
    console.log('⚠️  Bảng "rooms" không tồn tại. Không cần migration.');
    return;
  }

  // Check if new "room_types" table already exists
  const newTableResult = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'room_types'
  `;

  if (newTableResult.length > 0) {
    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM room_types
    `;
    if (Number(countResult[0].count) > 0) {
      console.log('⚠️  Bảng "room_types" đã có dữ liệu. Bỏ qua migration.');
      return;
    }
  }

  // Read all old rooms
  const oldRooms = await prisma.$queryRaw<Array<{
    id: string;
    propertyId: string;
    roomNumber: string;
    floor: number;
    areaSqm: number;
    priceMonthly: number;
    deposit: number;
    description: string | null;
    amenities: string[];
    images: string[];
    isAvailable: boolean;
    isApproved: boolean;
    viewCount: number;
    roomType: string;
    landlordNotes: string | null;
    commissionJson: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>>`
    SELECT * FROM rooms
  `;

  console.log(`📦 Tìm thấy ${oldRooms.length} phòng cũ cần chuyển đổi.\n`);

  if (oldRooms.length === 0) {
    console.log('✅ Không có dữ liệu cần migration.');
    return;
  }

  // Create room_types table if not exists (will be created by prisma db push later,
  // but we need it now for inserting)
  // We'll insert using raw SQL to work regardless of current Prisma schema state

  // Check if room_types table exists, if not we can't insert
  if (newTableResult.length === 0) {
    console.log('⚠️  Bảng "room_types" chưa tồn tại. Hãy chạy `npx prisma db push` trước, rồi chạy lại script này.');
    console.log('   Hoặc script sẽ tạo bảng tạm thời...\n');

    // Create the table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS room_types (
        id TEXT PRIMARY KEY,
        "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        "typeName" TEXT NOT NULL DEFAULT 'don',
        "areaSqm" DOUBLE PRECISION NOT NULL,
        "priceMonthly" DOUBLE PRECISION NOT NULL,
        deposit DOUBLE PRECISION,
        description TEXT,
        amenities TEXT[] DEFAULT '{}',
        images TEXT[] DEFAULT '{}',
        "totalUnits" INTEGER NOT NULL DEFAULT 1,
        "availableUnits" INTEGER NOT NULL DEFAULT 1,
        "availableRoomNames" TEXT,
        "isAvailable" BOOLEAN NOT NULL DEFAULT true,
        "isApproved" BOOLEAN NOT NULL DEFAULT false,
        "commissionJson" TEXT,
        "shortTermAllowed" BOOLEAN NOT NULL DEFAULT false,
        "shortTermMonths" TEXT,
        "shortTermPrice" DOUBLE PRECISION,
        "landlordNotes" TEXT,
        "viewCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Đã tạo bảng room_types.\n');
  }

  // Mapping old room IDs to new room type IDs
  const idMapping: Record<string, string> = {};

  for (const room of oldRooms) {
    // Keep the same ID so foreign keys in deals, share_links, room_inquiries still work
    const newId = room.id;
    const name = `Loại ${room.roomNumber}`;
    const availableUnits = room.isAvailable ? 1 : 0;
    const availableRoomNames = room.isAvailable ? room.roomNumber : null;

    await prisma.$executeRaw`
      INSERT INTO room_types (
        id, "propertyId", name, "typeName", "areaSqm", "priceMonthly", deposit,
        description, amenities, images, "totalUnits", "availableUnits",
        "availableRoomNames", "isAvailable", "isApproved", "commissionJson",
        "shortTermAllowed", "landlordNotes", "viewCount", "createdAt", "updatedAt"
      ) VALUES (
        ${newId}, ${room.propertyId}, ${name}, ${room.roomType || 'don'},
        ${room.areaSqm}, ${room.priceMonthly}, ${room.deposit || room.priceMonthly},
        ${room.description}, ${room.amenities}, ${room.images},
        ${1}, ${availableUnits}, ${availableRoomNames},
        ${room.isAvailable}, ${room.isApproved}, ${room.commissionJson},
        ${false}, ${room.landlordNotes}, ${room.viewCount},
        ${room.createdAt}, ${room.updatedAt}
      )
    `;

    idMapping[room.id] = newId;
    console.log(`  ✅ ${room.roomNumber} → "${name}" (${room.isAvailable ? 'trống' : 'đã thuê'})`);
  }

  // Update foreign keys in deals
  const dealsCount = await prisma.$executeRaw`
    UPDATE deals SET "roomTypeId" = "roomId" WHERE "roomId" IS NOT NULL AND "roomTypeId" IS NULL
  `.catch(() => {
    console.log('  ℹ️  Bảng deals chưa có cột roomTypeId (sẽ được thêm khi chạy prisma db push)');
    return 0;
  });
  if (dealsCount) console.log(`\n✅ Đã cập nhật ${dealsCount} deals.`);

  // Update foreign keys in share_links
  const linksCount = await prisma.$executeRaw`
    UPDATE share_links SET "roomTypeId" = "roomId" WHERE "roomId" IS NOT NULL AND "roomTypeId" IS NULL
  `.catch(() => {
    console.log('  ℹ️  Bảng share_links chưa có cột roomTypeId');
    return 0;
  });
  if (linksCount) console.log(`✅ Đã cập nhật ${linksCount} share links.`);

  // Update foreign keys in room_inquiries
  const inquiriesCount = await prisma.$executeRaw`
    UPDATE room_inquiries SET "roomTypeId" = "roomId" WHERE "roomId" IS NOT NULL AND "roomTypeId" IS NULL
  `.catch(() => {
    console.log('  ℹ️  Bảng room_inquiries chưa có cột roomTypeId');
    return 0;
  });
  if (inquiriesCount) console.log(`✅ Đã cập nhật ${inquiriesCount} inquiries.`);

  console.log(`\n🎉 Migration hoàn tất! Đã chuyển ${oldRooms.length} phòng sang room_types.`);
  console.log('\n📋 Bước tiếp theo:');
  console.log('   1. Chạy `npx prisma db push` để đồng bộ schema mới');
  console.log('   2. Kiểm tra dữ liệu bằng `npx prisma studio`');
  console.log('   3. Sau khi xác nhận OK, có thể xoá bảng rooms cũ:');
  console.log('      DROP TABLE IF EXISTS rooms CASCADE;');
}

main()
  .catch((e) => {
    console.error('❌ Migration lỗi:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
