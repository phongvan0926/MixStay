import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import type { AdminPermission } from './permissions';

/**
 * API guard — trả NextResponse 401/403 nếu thiếu quyền, hoặc null nếu OK.
 * Server-only (import next/server).
 *
 * Pattern:
 *   const denial = requirePermission(session, 'DELETE_PROPERTY');
 *   if (denial) return denial;
 */
export function requirePermission(
  session: Session | null | undefined,
  perm: AdminPermission,
): NextResponse | null {
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as { role?: string; permissions?: string[]; isActive?: boolean };
  // Tài khoản bị KHOÁ không được thao tác quản trị (isActive refresh ~60s/lần qua JWT).
  if (user.isActive === false) {
    return NextResponse.json({ error: 'Tài khoản đã bị khoá' }, { status: 403 });
  }
  if (user.role === 'ADMIN') return null; // super-admin bypass
  if (user.role !== 'ADMIN_STAFF') {
    return NextResponse.json({ error: 'Chỉ admin mới có quyền này' }, { status: 403 });
  }
  if (!Array.isArray(user.permissions) || !user.permissions.includes(perm)) {
    return NextResponse.json({ error: `Cần quyền: ${perm}` }, { status: 403 });
  }
  return null;
}
