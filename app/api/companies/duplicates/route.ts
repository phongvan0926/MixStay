import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions-server';

/**
 * Quét công ty NGHI TRÙNG (cùng tên chuẩn hoá) để admin gộp.
 *  GET  → danh sách nhóm ≥2 công ty cùng tên (trừ nhóm admin đã đánh dấu "không trùng").
 *  POST → { key } đánh dấu 1 nhóm là KHÔNG trùng → bỏ cảnh báo HẲN (lưu vào Setting).
 * Cần quyền MANAGE_COMPANIES (ADMIN bypass).
 */

const DISMISS_KEY = 'dismissed_duplicate_companies';

function normName(s: string): string {
  return (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ');
}

async function getDismissed(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: DISMISS_KEY } });
  if (!row?.value) return [];
  try { const a = JSON.parse(row.value); return Array.isArray(a) ? a : []; } catch { return []; }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const denial = requirePermission(session, 'MANAGE_COMPANIES');
  if (denial) return denial;

  const [companies, dismissed] = await Promise.all([
    prisma.company.findMany({
      select: { id: true, name: true, code: true, phone: true, isApproved: true, createdAt: true, _count: { select: { properties: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    getDismissed(),
  ]);
  const dismissSet = new Set(dismissed);

  const groups: Record<string, any[]> = {};
  for (const c of companies) {
    const key = normName(c.name);
    if (!key || dismissSet.has(key)) continue;
    (groups[key] ||= []).push({
      id: c.id, name: c.name, code: c.code, phone: c.phone, isApproved: c.isApproved,
      propertyCount: c._count.properties, createdAt: c.createdAt,
    });
  }

  const dupGroups = Object.entries(groups)
    .filter(([, list]) => list.length >= 2)
    .map(([key, list]) => ({ key, name: list[0].name, companies: list }))
    .sort((a, b) => b.companies.length - a.companies.length);

  return NextResponse.json({ groups: dupGroups });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const denial = requirePermission(session, 'MANAGE_COMPANIES');
  if (denial) return denial;

  const { key } = await req.json();
  const k = normName(key || '');
  if (!k) return NextResponse.json({ error: 'Thiếu key nhóm' }, { status: 400 });

  const list = await getDismissed();
  if (!list.includes(k)) list.push(k);
  await prisma.setting.upsert({
    where: { key: DISMISS_KEY },
    update: { value: JSON.stringify(list) },
    create: { key: DISMISS_KEY, value: JSON.stringify(list) },
  });
  return NextResponse.json({ ok: true, dismissed: k });
}
