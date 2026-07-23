import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { getGeminiKeys, callGemini } from '@/lib/gemini';
import { HANOI_DISTRICTS, HANOI_UNIVERSITIES } from '@/lib/hanoi-locations';
import { ROOM_TYPE_VALUES } from '@/lib/listing-options';

/**
 * POST /api/ai/search — "Tìm phòng bằng ngôn ngữ tự nhiên".
 * Khách gõ 1 câu ("phòng dưới 4 triệu gần ĐH Thương Mại có gác, nuôi mèo được") →
 * Gemini bóc thành BỘ LỌC đúng schema của /api/rooms/public. KHÔNG tự tìm — client
 * đổ bộ lọc vào form (khách thấy và sửa được) rồi chạy search như thường.
 * Public (khách chưa đăng nhập) nhưng rate-limit chặt kiểu 'auth' để giữ quota.
 */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    districts: { type: 'ARRAY', items: { type: 'STRING', enum: [...HANOI_DISTRICTS] }, description: 'Quận/huyện Hà Nội khách nhắc tới (suy ra từ tên phố/khu nếu cần)' },
    typeName: { type: 'STRING', enum: [...ROOM_TYPE_VALUES], description: 'don=phòng đơn; gac_xep=có gác; 1k1n; 2k1n; studio; duplex' },
    minPrice: { type: 'NUMBER', description: 'Giá tối thiểu VNĐ ("từ 3 triệu" → 3000000)' },
    maxPrice: { type: 'NUMBER', description: 'Giá tối đa VNĐ ("dưới 4tr5" → 4500000)' },
    uni: { type: 'STRING', enum: HANOI_UNIVERSITIES.map(u => u.short), description: 'Trường ĐH khách muốn ở gần (nếu nhắc tới)' },
    parkingCar: { type: 'BOOLEAN', description: 'Cần chỗ đỗ ô tô' },
    petAllowed: { type: 'BOOLEAN', description: 'Cần nuôi thú cưng' },
    foreignerOk: { type: 'BOOLEAN', description: 'Người nước ngoài thuê' },
    evCharging: { type: 'BOOLEAN', description: 'Cần sạc xe điện' },
    keyword: { type: 'STRING', description: 'Từ khóa còn lại đáng tìm (tên phố/khu không map được vào quận), ngắn gọn' },
  },
};

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'auth'); // 10 req/phút/IP — giữ quota Gemini
  if (rateLimited) return rateLimited;

  try {
    if (!getGeminiKeys().length) {
      return NextResponse.json({ error: 'Tính năng AI chưa được bật' }, { status: 503 });
    }
    const body = await req.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (text.length < 5 || text.length > 500) {
      return NextResponse.json({ error: 'Hãy mô tả nhu cầu trong 5–500 ký tự' }, { status: 400 });
    }

    const prompt = `Bạn là trợ lý tìm phòng trọ/chung cư mini Hà Nội. Bóc nhu cầu của khách thành bộ lọc JSON đúng schema.
QUY TẮC:
- CHỈ dùng thông tin CÓ trong câu. Không có thông tin → BỎ QUA trường đó (không đoán).
- Giá quy về SỐ VNĐ: "4tr"/"4 triệu" → 4000000; "3tr5" → 3500000.
- Khách nhắc tên phố/khu → suy ra quận (VD "Hồ Tùng Mậu" → Bắc Từ Liêm/Cầu Giấy chọn 1 quận đúng nhất); tên không chắc → cho vào keyword.
- Nhắc trường đại học → chọn đúng trường trong danh sách uni.
- "phòng có gác/gác xép" → typeName=gac_xep; "khép kín/phòng trọ" → don; "studio" → studio.

CÂU CỦA KHÁCH: "${text}"`;

    const result = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    if (!result.ok) {
      if (result.quotaHit) return NextResponse.json({ error: 'AI đã hết lượt hôm nay, dùng bộ lọc thường nhé.' }, { status: 429 });
      return NextResponse.json({ error: 'AI đang bận, thử lại sau nhé.' }, { status: 502 });
    }

    let parsed: any = {};
    try { parsed = JSON.parse(result.text); } catch { /* trả rỗng */ }

    // Vá giá lẻ kiểu "4.5" (triệu) → VNĐ
    for (const k of ['minPrice', 'maxPrice'] as const) {
      const v = Number(parsed[k]);
      if (Number.isFinite(v) && v > 0 && v < 1000) parsed[k] = Math.round(v * 1_000_000);
      if (!Number.isFinite(v) || v <= 0) delete parsed[k];
    }
    if (!Array.isArray(parsed.districts)) parsed.districts = [];

    return NextResponse.json({
      districts: parsed.districts,
      typeName: parsed.typeName || '',
      minPrice: parsed.minPrice || null,
      maxPrice: parsed.maxPrice || null,
      uni: parsed.uni || '',
      parkingCar: !!parsed.parkingCar,
      petAllowed: !!parsed.petAllowed,
      foreignerOk: !!parsed.foreignerOk,
      evCharging: !!parsed.evCharging,
      keyword: (parsed.keyword || '').slice(0, 60),
    });
  } catch (error: any) {
    console.error('/api/ai/search error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
