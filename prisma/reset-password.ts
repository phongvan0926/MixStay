// Khôi phục / đặt lại mật khẩu cho MỘT tài khoản qua dòng lệnh — KHÔNG cần đăng nhập.
// Dùng khi admin (hoặc bất kỳ user nào) quên mật khẩu và không ai đặt lại hộ được.
//
// Cách dùng:
//   npx tsx prisma/reset-password.ts <email-hoặc-sđt> <mật-khẩu-mới>
//   npm run db:reset-password -- admin@mixstay.vn 'MatKhauMoi123'
//
// Yêu cầu: file .env có DATABASE_URL trỏ đúng DB. Mật khẩu được hash bcrypt (cost 12),
// trùng cách hệ thống xử lý ở seed.ts và API.

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const identifier = (process.argv[2] || process.env.RESET_IDENTIFIER || '').trim();
  const newPassword = process.argv[3] || process.env.RESET_PASSWORD || '';

  if (!identifier || !newPassword) {
    console.error('❌ Thiếu tham số.\n   Cách dùng: npx tsx prisma/reset-password.ts <email-hoặc-sđt> <mật-khẩu-mới>');
    process.exit(1);
  }
  if (newPassword.length < 6) {
    console.error('❌ Mật khẩu mới phải tối thiểu 6 ký tự.');
    process.exit(1);
  }

  // Tìm theo email trước, không có thì thử số điện thoại.
  let user = await prisma.user.findUnique({ where: { email: identifier } });
  if (!user) {
    const byPhone = await prisma.user.findMany({ where: { phone: identifier }, take: 2 });
    if (byPhone.length === 1) user = byPhone[0];
    else if (byPhone.length > 1) {
      console.error(`❌ Có nhiều tài khoản dùng SĐT "${identifier}". Hãy dùng email để xác định duy nhất.`);
      process.exit(1);
    }
  }

  if (!user) {
    console.error(`❌ Không tìm thấy tài khoản với "${identifier}".`);
    process.exit(1);
  }

  const hashed = await hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, isActive: true }, // kích hoạt lại nếu lỡ bị vô hiệu hoá
  });

  console.log(`✅ Đã đặt lại mật khẩu cho: ${user.name} <${user.email ?? user.phone}> (role ${user.role}).`);
  console.log('   Hãy đăng nhập bằng mật khẩu mới rồi đổi lại trong phần tài khoản.');
}

main()
  .catch((e) => { console.error('❌ Lỗi:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
