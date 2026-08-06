import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { requirePermission } from '@/lib/permissions-server';
import { SETTING_SUPPORT_PHONE, SETTING_SUPPORT_ZALO } from '@/lib/contact-server';
import { extractVNPhone, checkPhone } from '@/lib/phone';

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
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
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    const denial = requirePermission(session, 'EDIT_COMMISSION');
    if (denial) return denial;

    const { key, value } = await req.json();

    // Chỉ cho ghi các khoá đã biết — trước đây key nhận tự do, gõ nhầm là đẻ ra rác trong bảng
    const ALLOWED = ['commission_broker_percent', SETTING_SUPPORT_PHONE, SETTING_SUPPORT_ZALO];
    if (!ALLOWED.includes(key)) {
      return NextResponse.json({ error: `Khoá cài đặt không hợp lệ: ${key}` }, { status: 400 });
    }

    let clean = String(value ?? '').trim();

    // HOTLINE: bắt buộc là số VN dùng được. Lưu số sai ở đây là cả web hiện số gọi không ra.
    if (key === SETTING_SUPPORT_PHONE) {
      const phone = extractVNPhone(clean);
      if (!phone) {
        const { reason } = checkPhone(clean);
        return NextResponse.json(
          { error: `Số hotline chưa dùng được — ${reason || 'sai định dạng'}. Cần 10 chữ số, bắt đầu bằng 0.` },
          { status: 400 },
        );
      }
      clean = phone; // lưu dạng chuẩn 10 số, bỏ mọi dấu/tên lẫn vào
    }

    // LINK ZALO: để trống = tự dựng từ số hotline. Có nhập thì phải là link thật.
    if (key === SETTING_SUPPORT_ZALO && clean) {
      if (!/^https?:\/\//i.test(clean)) clean = `https://${clean.replace(/^\/+/, '')}`;
      if (!/^https?:\/\/([\w-]+\.)*zalo\.me\//i.test(clean)) {
        return NextResponse.json({ error: 'Link Zalo phải có dạng https://zalo.me/... (hoặc để trống để tự dùng số hotline).' }, { status: 400 });
      }
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: clean },
      create: { key, value: clean },
    });

    return NextResponse.json(setting);
  } catch { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}
