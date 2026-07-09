import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { AI_LISTING_STYLES } from '@/lib/ai-listing-styles';

// Gọi Gemini SERVER-SIDE (key không bao giờ ra client). Model có thể đổi qua env GEMINI_MODEL.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Nhiều API key (nhiều tài khoản Google) để TỰ XOAY khi 1 key hết quota free.
// Hỗ trợ: GEMINI_API_KEY, GEMINI_API_KEY_2..10, và GEMINI_API_KEYS (danh sách ngăn cách bởi dấu phẩy).
function getGeminiKeys(): string[] {
  const set = new Set<string>();
  const add = (v?: string) => v?.split(',').forEach(k => { const t = k.trim(); if (t) set.add(t); });
  add(process.env.GEMINI_API_KEYS);
  add(process.env.GEMINI_API_KEY);
  for (let i = 2; i <= 10; i++) add(process.env[`GEMINI_API_KEY_${i}`]);
  return Array.from(set);
}

const TYPE_LABELS: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1 ngủ 1 khách',
  '2k1n': '2 ngủ 1 khách', studio: 'Studio', duplex: 'Duplex',
};

function money(n?: number | null): string {
  if (!n || n <= 0) return '';
  return n.toLocaleString('vi-VN') + 'đ';
}

function buildPrompt(styleInstruction: string, ctx: {
  typeName?: string; areaSqm?: number; priceMonthly?: number; deposit?: number;
  district?: string; amenities?: string[]; buildingAmenities?: string[]; flags?: string[];
  raw?: string; name?: string;
}): string {
  const lines: string[] = [];
  if (ctx.name) lines.push(`- Tiêu đề tin: ${ctx.name}`);
  const kind = ctx.typeName ? (TYPE_LABELS[ctx.typeName] || ctx.typeName) : '';
  if (kind || ctx.areaSqm) lines.push(`- Loại phòng: ${kind}${ctx.areaSqm ? `, diện tích ${ctx.areaSqm}m²` : ''}`);
  if (ctx.priceMonthly) lines.push(`- Giá thuê: ${money(ctx.priceMonthly)}/tháng${ctx.deposit ? `, đặt cọc ${money(ctx.deposit)}` : ''}`);
  if (ctx.district) lines.push(`- Khu vực: ${ctx.district}`);
  if (ctx.amenities?.length) lines.push(`- Nội thất trong phòng: ${ctx.amenities.join(', ')}`);
  if (ctx.buildingAmenities?.length) lines.push(`- Tiện ích toà nhà: ${ctx.buildingAmenities.join(', ')}`);
  if (ctx.flags?.length) lines.push(`- Đặc điểm khác: ${ctx.flags.join(', ')}`);
  lines.push(`- Mô tả gốc (thô, có thể có lỗi) của chủ nhà: ${ctx.raw?.trim() ? ctx.raw.trim() : '(chưa có — hãy viết mới từ thông tin trên)'}`);

  return `Bạn là chuyên gia viết tin cho thuê chung cư mini / phòng trọ tại Việt Nam.
Nhiệm vụ: VIẾT LẠI phần MÔ TẢ tin đăng cho chuẩn, rõ ràng, đúng chính tả và hấp dẫn hơn, theo ĐÚNG phong cách yêu cầu.

QUY TẮC BẮT BUỘC:
- CHỈ dùng thông tin được cung cấp bên dưới. TUYỆT ĐỐI KHÔNG bịa thêm tiện nghi, diện tích, giá, ưu đãi không có thật.
- Giữ NGUYÊN và chính xác mọi con số (giá thuê, tiền cọc, giá điện/nước/wifi/dịch vụ...). Sửa lỗi chính tả.
- KHÔNG ghi số nhà/địa chỉ chính xác, KHÔNG ghi số điện thoại. Chỉ nói tới khu vực (quận) nếu phù hợp.
- Viết tiếng Việt tự nhiên, dễ đọc trên điện thoại. Có thể dùng gạch đầu dòng cho tiện nghi và chi phí.
- KHÔNG dùng ký hiệu markdown (dấu ** hay #). Có thể dùng emoji hợp lý, tiết chế.
- CHỈ trả về nội dung mô tả cuối cùng, KHÔNG kèm lời dẫn, không kèm tiêu đề "Mô tả:", không giải thích.

PHONG CÁCH CẦN VIẾT: ${styleInstruction}

THÔNG TIN PHÒNG:
${lines.join('\n')}

Hãy viết lại phần mô tả:`;
}

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    // Chỉ người có quyền đăng tin mới được dùng (tránh lạm dụng quota).
    const session = await getServerSession(authOptions);
    if (!session || !['LANDLORD', 'BROKER', 'ADMIN', 'ADMIN_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKeys = getGeminiKeys();
    if (!apiKeys.length) {
      return NextResponse.json({ error: 'Chưa cấu hình AI (thiếu GEMINI_API_KEY)' }, { status: 503 });
    }

    const body = await req.json();
    const style = AI_LISTING_STYLES.find(s => s.key === body.style) || AI_LISTING_STYLES[0];

    // Lấy bối cảnh toà nhà (khu vực + tiện ích + đặc điểm) từ property đã chọn, nếu có.
    let district: string | undefined;
    let buildingAmenities: string[] | undefined;
    const flags: string[] = [];
    if (body.propertyId) {
      const prop = await prisma.property.findUnique({
        where: { id: body.propertyId },
        select: { district: true, amenities: true, parkingCar: true, parkingBike: true, evCharging: true, petAllowed: true, foreignerOk: true },
      });
      if (prop) {
        district = prop.district;
        buildingAmenities = prop.amenities;
        if (prop.parkingCar) flags.push('Ô tô đỗ cửa');
        if (prop.evCharging) flags.push('Sạc xe điện');
        if (prop.petAllowed) flags.push('Cho nuôi thú cưng');
        if (prop.foreignerOk) flags.push('Cho người nước ngoài thuê');
      }
    }

    const prompt = buildPrompt(style.instruction, {
      name: typeof body.name === 'string' ? body.name : undefined,
      typeName: body.typeName,
      areaSqm: Number(body.areaSqm) || undefined,
      priceMonthly: Number(body.priceMonthly) || undefined,
      deposit: Number(body.deposit) || undefined,
      district,
      amenities: Array.isArray(body.amenities) ? body.amenities.filter(Boolean) : undefined,
      buildingAmenities,
      flags: flags.length ? flags : undefined,
      raw: typeof body.description === 'string' ? body.description : '',
    });

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1200,
        thinkingConfig: { thinkingBudget: 0 }, // tắt "thinking" → không nuốt token, trả đủ nội dung
      },
    });

    // Thử lần lượt từng key; key nào hết quota/bị giới hạn (429) thì XOAY sang key kế tiếp.
    let data: any = null;
    let lastStatus = 0;
    let quotaHit = false;
    for (const key of apiKeys) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }
      );
      if (res.ok) { data = await res.json(); break; }
      lastStatus = res.status;
      if (res.status === 429) { quotaHit = true; continue; } // hết lượt key này → thử key khác
      // Lỗi khác (400/500...) không phải do quota → không xoay tiếp
      console.error('Gemini error', res.status, (await res.text()).slice(0, 300));
      break;
    }

    if (!data) {
      if (quotaHit && lastStatus === 429) {
        return NextResponse.json({ error: 'AI đã hết lượt miễn phí hôm nay trên tất cả key, thử lại sau hoặc thêm key mới.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Không gọi được AI. Vui lòng thử lại.' }, { status: 502 });
    }

    const cand = data?.candidates?.[0];
    const text: string = (cand?.content?.parts || []).map((p: any) => p?.text || '').join('').trim();

    if (!text) {
      return NextResponse.json({ error: 'AI chưa trả về nội dung, thử lại nhé.' }, { status: 502 });
    }

    // Dọn nhẹ: bỏ ký hiệu markdown ** còn sót, khoảng trắng thừa.
    const cleaned = text.replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n').trim();

    return NextResponse.json({ text: cleaned, style: style.key });
  } catch (error: any) {
    console.error('/api/ai/listing error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
