/**
 * Backfill SỐ NHÀ: tách số nhà từ fullAddress (đã có) vào field houseNumber mới.
 * KHÔNG đụng fullAddress/name — chỉ điền thêm houseNumber (an toàn, đảo ngược được bằng cách set null).
 * Việc ẨN số nhà cho khách KHÔNG phụ thuộc backfill này (đã redact phía API theo fullAddress).
 *
 * Chạy:  npx tsx prisma/backfill-house-numbers.ts
 *        npx tsx prisma/backfill-house-numbers.ts --dry   (chỉ in, không ghi)
 */
import { PrismaClient } from '@prisma/client';
import { extractHouseNumber } from '../lib/address';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry');

async function main() {
  const props = await prisma.property.findMany({
    select: { id: true, name: true, fullAddress: true, houseNumber: true },
    orderBy: { createdAt: 'asc' },
  });

  let set = 0, skipExisting = 0, skipNoMatch = 0;
  for (const p of props) {
    if (p.houseNumber && p.houseNumber.trim()) { skipExisting++; continue; }
    const hn = extractHouseNumber(p.fullAddress);
    if (!hn) { skipNoMatch++; continue; }
    if (DRY) {
      console.log(`[dry] ${p.fullAddress}  ->  houseNumber="${hn}"`);
    } else {
      await prisma.property.update({ where: { id: p.id }, data: { houseNumber: hn } });
    }
    set++;
  }

  console.log(`\n${DRY ? '[DRY-RUN] ' : ''}Tổng ${props.length} tòa | điền số nhà: ${set} | đã có sẵn: ${skipExisting} | không tách được: ${skipNoMatch}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
