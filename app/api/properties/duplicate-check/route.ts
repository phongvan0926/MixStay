import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/properties/duplicate-check — cho ADMIN: với MỖI tòa nhà đang CHỜ DUYỆT (PENDING),
 * tìm các tòa ĐÃ DUYỆT có khả năng TRÙNG để admin biết trước khi duyệt.
 * Tiêu chí (khớp 1 trong 2): tên gần giống trong cùng quận, HOẶC toạ độ cách nhau < ~150m.
 * Cảnh báo tự biến mất khi tòa được duyệt (không còn PENDING → không nằm trong kết quả).
 * Trả: { [pendingId]: [{ id, name, district, reason }] } — chỉ tòa PENDING có ứng viên trùng.
 */

const STOP = new Set(['ccmn', 'chung', 'cu', 'mini', 'toa', 'nha', 'tro', 'so', 'ngo', 'ngach', 'hem', 'can', 'ho', 'phong', 'cho', 'thue', 'studio', 'gac', 'xep', 'duplex']);

function tokens(name: string): Set<string> {
  const norm = (name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  return new Set(norm.split(/\s+/).filter(t => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t)));
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, dLa = (bLat - aLat) * Math.PI / 180, dLo = (bLng - aLng) * Math.PI / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'ADMIN_STAFF') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [pending, approved] = await Promise.all([
    prisma.property.findMany({
      where: { status: 'PENDING' },
      select: { id: true, name: true, district: true, latitude: true, longitude: true },
    }),
    prisma.property.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, name: true, district: true, latitude: true, longitude: true },
    }),
  ]);

  const approvedTok = approved.map(a => ({ ...a, tok: tokens(a.name) }));
  const result: Record<string, { id: string; name: string; district: string; reason: string }[]> = {};

  for (const p of pending) {
    const pTok = tokens(p.name);
    const matches: { id: string; name: string; district: string; reason: string }[] = [];
    for (const a of approvedTok) {
      let reason = '';
      // Gần trên bản đồ (< 150m)
      if (p.latitude != null && p.longitude != null && a.latitude != null && a.longitude != null) {
        const d = distanceKm(p.latitude, p.longitude, a.latitude, a.longitude);
        if (d < 0.15) reason = `cách ~${Math.round(d * 1000)}m`;
      }
      // Tên gần giống trong cùng quận
      if (!reason && p.district === a.district && pTok.size && a.tok.size) {
        let shared = 0;
        Array.from(pTok).forEach(t => { if (a.tok.has(t)) shared++; });
        const ratio = shared / Math.min(pTok.size, a.tok.size);
        if (shared >= 2 || (shared >= 1 && ratio >= 0.6)) reason = 'tên gần giống, cùng quận';
      }
      if (reason) matches.push({ id: a.id, name: a.name, district: a.district, reason });
      if (matches.length >= 5) break;
    }
    if (matches.length) result[p.id] = matches;
  }

  return NextResponse.json({ duplicates: result });
}
