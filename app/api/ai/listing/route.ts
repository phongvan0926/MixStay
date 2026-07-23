import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { AI_LISTING_STYLES } from '@/lib/ai-listing-styles';
import { getGeminiKeys, callGemini } from '@/lib/gemini';

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
Nhiệm vụ: CHUẨN HÓA tin đăng — viết lại cả TIÊU ĐỀ lẫn MÔ TẢ cho chuẩn, rõ ràng, đúng chính tả tiếng Việt CÓ DẤU và hấp dẫn hơn, theo ĐÚNG phong cách yêu cầu.

QUY TẮC BẮT BUỘC:
- CHỈ dùng thông tin được cung cấp bên dưới. TUYỆT ĐỐI KHÔNG bịa thêm tiện nghi, diện tích, giá, ưu đãi không có thật.
- Giữ NGUYÊN và chính xác mọi con số (giá thuê, tiền cọc, giá điện/nước/wifi/dịch vụ...). Sửa lỗi chính tả.
- KHÔNG ghi số nhà/địa chỉ chính xác, KHÔNG ghi số điện thoại. Chỉ nói tới khu vực/tên phố (không số nhà) nếu phù hợp.
- TIÊU ĐỀ: tiếng Việt CÓ DẤU, viết hoa chữ cái đầu hợp lý, ngắn gọn ≤ 60 ký tự. QUAN TRỌNG NHẤT: GIỮ NGUYÊN Ý CHÍNH + LOẠI HÌNH trong TIÊU ĐỀ GỐC — tiêu đề gốc nói "mặt bằng" thì phải giữ "mặt bằng" (KHÔNG đổi thành loại phòng lấy từ trường "Loại phòng"), nói "kho"/"văn phòng"/"nhà nguyên căn" thì giữ đúng như vậy. Chỉ SỬA CHÍNH TẢ, THÊM DẤU, làm gọn và có thể bổ sung điểm mạnh/khu vực (VD "cho thuee mat bang kim giang" → "Cho thuê mặt bằng Kim Giang 30m² giá tốt"). Giữ đúng địa danh gốc.
- MÔ TẢ: tiếng Việt tự nhiên, dễ đọc trên điện thoại. Có thể dùng gạch đầu dòng cho tiện nghi và chi phí. KHÔNG markdown (** hay #). Emoji hợp lý, tiết chế.

PHONG CÁCH CẦN VIẾT: ${styleInstruction}

THÔNG TIN PHÒNG:
${lines.join('\n')}`;
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

    const result = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 3000, // model mới có thinking nội bộ ăn vào budget — để rộng
        // Structured output: trả cả TIÊU ĐỀ chuẩn hóa (có dấu) lẫn MÔ TẢ
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Tiêu đề tin chuẩn hóa: tiếng Việt có dấu, ≤60 ký tự, không số nhà/SĐT' },
            description: { type: 'STRING', description: 'Mô tả tin đã chuẩn hóa theo phong cách yêu cầu' },
          },
          required: ['title', 'description'],
        },
      },
    });

    if (!result.ok) {
      if (result.quotaHit && result.status === 429) {
        return NextResponse.json({ error: 'AI đã hết lượt miễn phí hôm nay trên tất cả key, thử lại sau hoặc thêm key mới.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Không gọi được AI. Vui lòng thử lại.' }, { status: 502 });
    }

    let title = '';
    let text = '';
    try {
      const parsed = JSON.parse(result.text);
      title = (parsed?.title || '').trim();
      text = (parsed?.description || '').trim();
    } catch {
      text = result.text; // phòng hờ model trả text trần
    }

    if (!text) {
      return NextResponse.json({ error: 'AI chưa trả về nội dung, thử lại nhé.' }, { status: 502 });
    }

    // Dọn nhẹ: bỏ ký hiệu markdown ** còn sót, khoảng trắng thừa.
    const cleaned = text.replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n').trim();

    // `text` giữ tên field cũ (tương thích); `title` là phần mới cho chuẩn hóa tiêu đề.
    return NextResponse.json({ text: cleaned, title, style: style.key });
  } catch (error: any) {
    console.error('/api/ai/listing error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
