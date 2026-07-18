import { NextRequest, NextResponse } from 'next/server';

// Server-side Geocoding proxy qua Nominatim OpenStreetMap API.
// Giúp tránh lỗi CORS / rate-limit khi gọi trực tiếp từ trình duyệt client.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || !q.trim()) {
    return NextResponse.json({ error: 'Thiếu từ khóa tìm kiếm' }, { status: 400 });
  }

  try {
    const rawQuery = q.trim();
    const queryTerm = rawQuery.toLowerCase().includes('hà nội') ? rawQuery : `${rawQuery}, Hà Nội`;
    
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryTerm)}&limit=3&countrycodes=vn`,
      {
        headers: {
          'User-Agent': 'MixStayApp/1.0 (contact@mixstay.vn)',
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        },
        next: { revalidate: 86400 }, // Cache 24h cho các câu truy vấn địa điểm trùng lặp
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Lỗi từ dịch vụ định vị' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ data: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error('Geocode API error:', error);
    return NextResponse.json({ error: 'Lỗi kết nối định vị server' }, { status: 500 });
  }
}
