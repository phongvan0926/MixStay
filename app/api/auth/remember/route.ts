import { NextRequest, NextResponse } from 'next/server';

// Tên cookie phiên của NextAuth: bản __Secure- dùng trên HTTPS (production),
// bản thường ở local/HTTP. Khi token > 4KB, NextAuth tách thành chunk: "<base>.0", "<base>.1"...
// nên phải khớp cả tên gốc lẫn các chunk.
const SESSION_COOKIE_BASES = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
];

function isSessionCookie(name: string): boolean {
  return SESSION_COOKIE_BASES.some(base => name === base || name.startsWith(base + '.'));
}

/**
 * "Ghi nhớ đăng nhập".
 * - remember = true  → không làm gì, giữ cookie 30 ngày mặc định của NextAuth.
 * - remember = false → ghi lại CHÍNH các cookie phiên (giữ nguyên giá trị token, kể cả chunk)
 *   nhưng BỎ maxAge/expires → "session cookie" (trình duyệt xoá khi đóng). Giữ nguyên giá trị
 *   token nên phiên không bị mất; chỉ đổi thời hạn cookie. Lỗi → giữ nguyên 30 ngày (an toàn).
 *
 * Lưu ý: route dùng thuộc tính cookie mặc định của NextAuth (httpOnly, sameSite=lax, path=/).
 * App hiện KHÔNG cấu hình authOptions.cookies tuỳ chỉnh; nếu sau này có thì cần đồng bộ lại đây.
 */
export async function POST(req: NextRequest) {
  let remember = true;
  try {
    const body = await req.json();
    remember = body?.remember !== false;
  } catch {
    // body lỗi → coi như remember = true (giữ mặc định)
  }

  const res = NextResponse.json({ ok: true });
  if (remember) return res;

  for (const cookie of req.cookies.getAll()) {
    if (!isSessionCookie(cookie.name)) continue;
    res.cookies.set({
      name: cookie.name,
      value: cookie.value,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: cookie.name.startsWith('__Secure-'),
      // KHÔNG đặt maxAge/expires → session cookie (mất khi đóng trình duyệt)
    });
  }
  return res;
}
