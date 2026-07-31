// Prisma client SINGLETON.
//
// Ở dev, Next hot-reload nạp lại module liên tục — mỗi lần `new PrismaClient()` là thêm một
// pool kết nối mới và sẽ nhanh chóng làm cạn giới hạn connection của Supabase. Vì vậy cache
// instance vào globalThis khi KHÔNG phải production; trên Vercel mỗi lambda chỉ tạo một lần.
//
// Mọi truy vấn DB trong app phải import từ đây, không tự khởi tạo PrismaClient nơi khác.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
