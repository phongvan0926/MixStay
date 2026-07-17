import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { applyRateLimit } from '@/lib/rate-limit';
import { getGeminiKeys, callGemini } from '@/lib/gemini';
import { AMENITY_OPTIONS, ROOM_TYPE_VALUES } from '@/lib/listing-options';
import { HANOI_DISTRICTS } from '@/lib/hanoi-locations';

/**
 * POST /api/ai/parse-listing — "Tạo tin nhanh bằng AI".
 * Nhận văn bản tin đăng thô (copy từ Facebook/Zalo) → Gemini structured output bóc tách
 * thành { property, room } đúng schema form; đồng thời match tòa nhà CÓ SẴN theo tên + quận
 * (LANDLORD chỉ match tòa của mình) để gợi ý gắn tin vào tòa cũ thay vì tạo trùng.
 * KHÔNG tự lưu gì — client đổ kết quả vào form để người dùng kiểm tra & bổ sung trường thiếu.
 */

// Schema structured output cho Gemini (REST v1beta — type viết HOA).
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    property: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Tên tòa nhà/chung cư mini nếu có; nếu không có, đặt theo "CCMN <ngõ> <đường>"' },
        district: { type: 'STRING', enum: [...HANOI_DISTRICTS], description: 'Quận/huyện Hà Nội' },
        streetName: { type: 'STRING', description: 'Tên đường/phố, KHÔNG kèm số nhà, ví dụ "Hoa Bằng"' },
        houseNumber: { type: 'STRING', description: 'Số nhà + ngõ/ngách nếu có, ví dụ "Số 18 ngõ 72/7"' },
        fullAddress: { type: 'STRING', description: 'Địa chỉ đầy đủ ghép lại' },
        zaloPhone: { type: 'STRING', description: 'SĐT liên hệ trong tin (10 số, bắt đầu bằng 0)' },
        parkingCar: { type: 'BOOLEAN' },
        parkingBike: { type: 'BOOLEAN' },
        evCharging: { type: 'BOOLEAN' },
        petAllowed: { type: 'BOOLEAN' },
        foreignerOk: { type: 'BOOLEAN' },
      },
    },
    room: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Tiêu đề tin đăng ngắn gọn hấp dẫn, VD "Studio full đồ ngõ 72 Hoa Bằng"' },
        typeName: { type: 'STRING', enum: [...ROOM_TYPE_VALUES], description: 'don=phòng đơn khép kín; gac_xep=có gác xép; 1k1n=1 khách 1 ngủ; 2k1n=2 ngủ 1 khách; studio; duplex' },
        areaSqm: { type: 'NUMBER', description: 'Diện tích m²' },
        priceMonthly: { type: 'NUMBER', description: 'Giá thuê/tháng bằng VNĐ (5tr5 → 5500000)' },
        deposit: { type: 'NUMBER', description: 'Tiền cọc bằng VNĐ nếu ghi rõ' },
        description: { type: 'STRING', description: 'Mô tả đã dọn: giữ nội dung + giá dịch vụ (điện/nước/net), sửa chính tả, BỎ SĐT và địa chỉ chính xác, bỏ hashtag' },
        amenities: { type: 'ARRAY', items: { type: 'STRING', enum: [...AMENITY_OPTIONS] }, description: 'Chỉ chọn tiện ích được nhắc tới trong tin' },
        totalUnits: { type: 'INTEGER', description: 'Số phòng loại này nếu tin ghi, mặc định 1' },
        availableRoomNames: { type: 'STRING', description: 'Tên/mã phòng trống cụ thể nếu có, VD "502, 603"' },
        shortTermAllowed: { type: 'BOOLEAN', description: 'Tin có nói cho thuê ngắn hạn/theo tháng lẻ không' },
        shortTermPrice: { type: 'NUMBER', description: 'Giá thuê ngắn hạn VNĐ nếu có' },
      },
    },
  },
  required: ['property', 'room'],
};

function buildPrompt(raw: string): string {
  return `Bạn là trợ lý nhập liệu cho nền tảng cho thuê chung cư mini tại Hà Nội.
Bóc tách tin đăng thô dưới đây (copy từ Facebook/Zalo, có thể sai chính tả, nhiều emoji) vào JSON đúng schema.

QUY TẮC BẮT BUỘC:
- CHỈ dùng thông tin CÓ trong tin. Trường không có thông tin → BỎ QUA (không đoán, không bịa).
- Mọi giá tiền quy về SỐ VNĐ nguyên: "5tr5"/"5,5 triệu"/"5.5tr" → 5500000; "900k" → 900000.
- district phải là một quận/huyện Hà Nội trong danh sách cho phép; suy ra từ địa chỉ/tên phường nếu tin không ghi thẳng.
- description: viết lại sạch sẽ dễ đọc từ nội dung gốc, giữ chi phí dịch vụ, KHÔNG chứa số điện thoại, KHÔNG chứa số nhà chính xác, không hashtag.
- typeName: "phòng khép kín/phòng trọ" → don; "có gác/gác xép" → gac_xep; "1 khách 1 ngủ/1PN tách bếp" → 1k1n; "2 ngủ" → 2k1n; "studio/full đồ không vách" → studio; "duplex/tầng lửng cao" → duplex.

TIN ĐĂNG THÔ:
"""
${raw}
"""`;
}

// Bỏ dấu tiếng Việt + lowercase để so tên tòa nhà "mờ".
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
}

export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !['LANDLORD', 'ADMIN', 'ADMIN_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!getGeminiKeys().length) {
      return NextResponse.json({ error: 'Chưa cấu hình AI (thiếu GEMINI_API_KEY)' }, { status: 503 });
    }

    const body = await req.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (text.length < 30) {
      return NextResponse.json({ error: 'Nội dung quá ngắn — dán nguyên tin đăng (tối thiểu 30 ký tự).' }, { status: 400 });
    }
    if (text.length > 8000) {
      return NextResponse.json({ error: 'Nội dung quá dài (tối đa 8000 ký tự).' }, { status: 400 });
    }

    const result = await callGemini({
      contents: [{ parts: [{ text: buildPrompt(text) }] }],
      generationConfig: {
        temperature: 0.2, // bóc tách dữ liệu → cần chính xác, không cần sáng tạo
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    if (!result.ok) {
      if (result.quotaHit && result.status === 429) {
        return NextResponse.json({ error: 'AI đã hết lượt miễn phí hôm nay trên tất cả key, thử lại sau.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Không gọi được AI. Vui lòng thử lại.' }, { status: 502 });
    }

    let parsed: any;
    try { parsed = JSON.parse(result.text); }
    catch {
      return NextResponse.json({ error: 'AI trả về dữ liệu không hợp lệ, thử lại nhé.' }, { status: 502 });
    }
    const property = parsed?.property || {};
    const room = parsed?.room || {};

    // Vá số tiền lẻ: AI lỡ trả "5.5" (triệu) thay vì 5500000 → quy về VNĐ.
    for (const k of ['priceMonthly', 'deposit', 'shortTermPrice'] as const) {
      const v = Number(room[k]);
      if (Number.isFinite(v) && v > 0 && v < 1000) room[k] = Math.round(v * 1_000_000);
    }

    // Match tòa nhà có sẵn theo tên + quận (mờ, bỏ dấu). LANDLORD chỉ match tòa của mình.
    const scope: any = session.user.role === 'LANDLORD' ? { landlordId: session.user.id } : {};
    const candidates = await prisma.property.findMany({
      where: { ...scope, ...(property.district ? { district: property.district } : {}) },
      select: { id: true, name: true, district: true, streetName: true, fullAddress: true },
      take: 300,
    });
    const pName = normalize(property.name || '');
    const pStreet = normalize(property.streetName || '');
    const matches = !pName ? [] : candidates
      .map(c => {
        const cName = normalize(c.name);
        let score = 0;
        if (cName === pName) score = 3;
        else if (cName.includes(pName) || pName.includes(cName)) score = 2;
        else if (pStreet && normalize(c.streetName || '').includes(pStreet) && normalize(c.fullAddress || '').includes(pStreet)) score = 1;
        return { ...c, score };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, ...c }) => c);

    return NextResponse.json({ property, room, matches });
  } catch (error: any) {
    console.error('/api/ai/parse-listing error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
