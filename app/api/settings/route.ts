import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { requirePermission } from '@/lib/permissions-server';

export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    // Setting duy nhất hiện có là commission_broker_percent (cấu hình chia hoa hồng) →
    // gate bằng EDIT_COMMISSION (ADMIN bypass). Không có "view settings" permission riêng
    // và dữ liệu là cấu hình tài chính nội bộ nên đọc cũng cần quyền sửa hoa hồng.
    const denial = requirePermission(session, 'EDIT_COMMISSION');
    if (denial) return denial;

    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    return NextResponse.json(map);
  } catch { return NextResponse.json({}); }
}

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const denial = requirePermission(session, 'EDIT_COMMISSION');
    if (denial) return denial;

    const { key, value } = await req.json();
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json(setting);
  } catch { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}
