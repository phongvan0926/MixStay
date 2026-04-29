/**
 * v8.3 migration: backfill RoomStatus enum + expectedAvailableDate from old isAvailable boolean.
 *
 * Run BEFORE `prisma db push` so data is preserved when isAvailable is dropped.
 *
 * Steps:
 *   npx ts-node prisma/migrate-status.ts
 *   npx prisma db push   # drops isAvailable + adds index changes
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Migrating RoomType.isAvailable → status enum...');

  // 1. Create enum (no-op if exists)
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'UPCOMING');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  // 2. Add new columns (no-op if exist)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE room_types
      ADD COLUMN IF NOT EXISTS "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE';
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE room_types
      ADD COLUMN IF NOT EXISTS "expectedAvailableDate" TIMESTAMP(3);
  `);

  // 3. Backfill from old isAvailable column (only if column still exists)
  const cols: any[] = await prisma.$queryRawUnsafe(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'room_types' AND column_name = 'isAvailable';
  `);
  if (cols.length > 0) {
    const updated = await prisma.$executeRawUnsafe(`
      UPDATE room_types
      SET "status" = CASE WHEN "isAvailable" THEN 'AVAILABLE'::"RoomStatus" ELSE 'UNAVAILABLE'::"RoomStatus" END;
    `);
    console.log(`✅ Backfilled status for ${updated} rows from isAvailable`);
  } else {
    console.log('ℹ️  Column isAvailable already dropped — nothing to backfill');
  }

  console.log('✅ Migration done. Now run `npx prisma db push` to drop isAvailable + sync indexes.');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
