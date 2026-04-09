import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'auth');
  if (rateLimited) return rateLimited;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { role } = await req.json();
  if (!['BROKER', 'LANDLORD', 'CUSTOMER'].includes(role)) {
    return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 });
  }

  const userId = (session.user as any).id;
  await prisma.user.update({ where: { id: userId }, data: { role, setupComplete: true } });

  return NextResponse.json({ ok: true, role });
}
