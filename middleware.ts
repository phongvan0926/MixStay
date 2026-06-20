import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = token.role as string;
    const permissions = (token.permissions as string[] | undefined) || [];

    // Admin routes — cả ADMIN (super) lẫn ADMIN_STAFF
    if (pathname.startsWith('/admin') && role !== 'ADMIN' && role !== 'ADMIN_STAFF') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    // ADMIN_STAFF: chặn trang theo permission (ADMIN super bypass). Khớp với gate ở
    // sidebar + API requirePermission để staff thiếu quyền không vào được khung trang.
    if (role === 'ADMIN_STAFF') {
      const staffPageGuards: { prefix: string; perm: string }[] = [
        { prefix: '/admin/settings', perm: 'EDIT_COMMISSION' },
        { prefix: '/admin/companies', perm: 'MANAGE_COMPANIES' },
        { prefix: '/admin/users', perm: 'MANAGE_USERS' },
      ];
      const blocked = staffPageGuards.find(g => pathname.startsWith(g.prefix) && !permissions.includes(g.perm));
      if (blocked) {
        return NextResponse.redirect(new URL('/admin/properties', req.url));
      }
    }

    // Broker routes
    if (pathname.startsWith('/broker') && role !== 'BROKER') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Landlord routes
    if (pathname.startsWith('/landlord') && role !== 'LANDLORD') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/broker/:path*', '/landlord/:path*'],
};
