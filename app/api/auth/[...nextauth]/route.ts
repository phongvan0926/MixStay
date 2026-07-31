// Endpoint NextAuth (đăng nhập/đăng xuất/callback OAuth Google, phiên JWT 30 ngày).
// Toàn bộ cấu hình — provider, callback gắn role/permissions vào token — nằm ở lib/auth.ts;
// file này chỉ nối handler vào route.
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
