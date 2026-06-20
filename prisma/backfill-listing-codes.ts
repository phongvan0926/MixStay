/**
 * Backfill listingCode cho mọi RoomType chưa có mã.
 *
 * Idempotent: chỉ xử lý bản ghi listingCode = null, chạy lại nhiều lần đều an toàn.
 * Chạy SAU khi đã `npx prisma db push` (đã có cột listingCode trong DB).
 *
 *   npx tsx prisma/backfill-listing-codes.ts
 *   # hoặc: npm run db:backfill-codes
 */
import { PrismaClient } from '@prisma/client';
import { generateUniqueListingCode } from '../lib/listing-code-server';

const prisma = new PrismaClient();

async function main() {
  const missing = await prisma.roomType.findMany({
    where: { listingCode: null },
    select: { id: true, name: true },
  });

  console.log(`🔖 ${missing.length} tin đăng (RoomType) chưa có mã. Đang sinh...`);

  let done = 0;
  for (const rt of missing) {
    const code = await generateUniqueListingCode(prisma);
    await prisma.roomType.update({ where: { id: rt.id }, data: { listingCode: code } });
    done++;
    console.log(`  ${code}  ←  ${rt.name}`);
  }

  // Xác nhận: 100% có mã, không còn null
  const total = await prisma.roomType.count();
  const stillNull = await prisma.roomType.count({ where: { listingCode: null } });
  console.log(`\n✅ Đã gán ${done} mã. Tổng ${total} tin đăng, còn thiếu mã: ${stillNull}.`);

  if (stillNull > 0) {
    console.error('⚠️  Vẫn còn tin đăng thiếu mã — kiểm tra lại!');
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error('❌ Backfill lỗi:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
