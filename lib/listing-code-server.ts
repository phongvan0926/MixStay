/**
 * Sinh mã tin đăng — SERVER-ONLY (dùng 'crypto'). KHÔNG import file này từ client component.
 * Constants/regex/normalize client-safe nằm ở lib/listing-code.ts.
 */
import { randomInt } from 'crypto';
import { LISTING_CODE_PREFIX } from './listing-code';

// Bảng an toàn: bỏ 0, O, 1, I, L
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;

/** Sinh 1 mã ngẫu nhiên dạng MS-XXXXXX (chưa kiểm tra trùng trong DB). */
export function generateListingCode(): string {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) {
    s += ALPHABET[randomInt(ALPHABET.length)];
  }
  return LISTING_CODE_PREFIX + s;
}

/**
 * Sinh mã DUY NHẤT — retry nếu trùng (rất hiếm). Trả về mã chưa tồn tại trong DB.
 * `db` là PrismaClient. Cột listingCode @unique là chốt chặn cuối cho race condition.
 */
export async function generateUniqueListingCode(
  db: { roomType: { findUnique: (args: any) => Promise<any> } },
  maxRetries = 8,
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateListingCode();
    const existing = await db.roomType.findUnique({ where: { listingCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error('Không sinh được mã tin đăng duy nhất sau nhiều lần thử');
}
