import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPaginationParams, paginatedResponse } from '@/lib/pagination';
import { applyRateLimit } from '@/lib/rate-limit';
import { redactName, redactHouseNumber, redactTitle } from '@/lib/address';
import { HANOI_UNIVERSITIES, INNER_CITY_DISTRICTS } from '@/lib/hanoi-locations';

// Khoảng cách km giữa 2 tọa độ (haversine) — dùng cho lọc "gần trường ĐH"
function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, dLat = ((bLat - aLat) * Math.PI) / 180, dLng = ((bLng - aLng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/* ─────────────────────────────── ?sort=deal — "GIÁ TỐT" ───────────────────────────────
 * "Giá tốt" KHÔNG phải "rẻ nhất". Xếp theo giá tuyệt đối (sort=price_asc) thì 8/12 tin đầu
 * rơi hết vào Hoài Đức 1,5–2,5tr (đo 17/08/2026) — ngoại thành, cách trung tâm 15km, và 5 tin
 * trong đó là cùng MỘT tòa. Khách vào trang chủ tìm phòng nội thành lướt qua thấy toàn chỗ
 * mình không ở được → khối "Phòng nổi bật" mất tác dụng.
 *
 * Ở đây "tốt" = RẺ HƠN MẶT BẰNG CHÍNH QUẬN ĐÓ. Phòng 3tr ở Cầu Giấy (trung vị 4,8tr) là món
 * hời thật; phòng 2,5tr ở Hoài Đức (trung vị 2,6tr) chỉ là giá thường của vùng đó.
 *
 * Ba luật kèm theo, đều để 6 thẻ trên trang chủ không bị một tòa/một quận chiếm sạch:
 *   - mỗi quận + mỗi TÒA nhiều nhất 1 tin trong danh sách
 *   - LUÂN PHIÊN theo giờ: khách quay lại buổi sau thấy quận khác, phòng khác
 *   - chỉ tin CÓ ẢNH (thẻ trống ảnh nằm ở khối khoe hàng thì phản tác dụng)
 */
const DEAL_MAX_RATIO = 0.9;   // rẻ hơn trung vị quận ≥10% mới được gọi là "giá tốt"
const DEAL_MIN_SAMPLE = 5;    // quận có <5 tin thì trung vị không nói lên điều gì → bỏ qua
const DEAL_ROTATE_MS = 60 * 60 * 1000;  // đổi lứa tin mỗi giờ
const DEAL_SCAN = 600;        // số tin quét để tính trung vị (kho nội thành đang 450 tin)

type DealRow = {
  id: string;
  propertyId: string;
  priceMonthly: number;
  images: string[];
  property: { district: string | null; images: string[] } | null;
};

/** Trung vị giá theo quận, tính trên TOÀN kho của quận (không dính bộ lọc của khách) */
function medianByDistrict(marketRows: { priceMonthly: number; property: { district: string | null } | null }[]) {
  const prices: Record<string, number[]> = {};
  marketRows.forEach(r => {
    const d = r.property?.district?.trim();
    if (!d) return;
    (prices[d] = prices[d] || []).push(r.priceMonthly);
  });
  const median: Record<string, number> = {};
  Object.keys(prices).forEach(d => {
    const v = prices[d];
    if (v.length < DEAL_MIN_SAMPLE) return;   // quận quá ít tin → trung vị không nói lên gì
    v.sort((a, b) => a - b);
    median[d] = v[Math.floor(v.length / 2)];
  });
  return median;
}

function rankDeals<T extends DealRow>(rows: T[], median: Record<string, number>, bucket: number) {
  const byDistrict: Record<string, T[]> = {};
  rows.forEach(r => {
    const d = r.property?.district?.trim();
    if (!d) return;
    (byDistrict[d] = byDistrict[d] || []).push(r);
  });

  const percentById: Record<string, number> = {};
  const pools: Record<string, T[]> = {};
  Object.keys(byDistrict).forEach(d => {
    const g = byDistrict[d];
    const med = median[d];
    if (!med) return;
    const pool = g
      // Thẻ không ảnh nằm ở khối khoe hàng thì phản tác dụng → chỉ lấy tin có ảnh
      .filter(r => (r.images?.length || r.property?.images?.length) && r.priceMonthly / med <= DEAL_MAX_RATIO)
      .sort((a, b) => a.priceMonthly - b.priceMonthly);
    if (!pool.length) return;
    pool.forEach(r => { percentById[r.id] = Math.round((1 - r.priceMonthly / med) * 100); });
    pools[d] = pool;
  });

  // Quận có món hời SÂU NHẤT đứng trước, rồi xoay vòng theo khung giờ để đổi quận mở màn
  const districts = Object.keys(pools)
    .sort((a, b) => percentById[pools[b][0].id] - percentById[pools[a][0].id]);
  const rotated = districts.map((_, i) => districts[(i + bucket) % districts.length]);

  const ordered: T[] = [];
  const usedProperty: Record<string, true> = {};
  const usedId: Record<string, true> = {};
  // Mỗi vòng lấy tối đa 1 tin/quận → 6 thẻ đầu (1 trang) là 6 quận khác nhau
  for (let round = 0; round < 12; round++) {
    const picked: T[] = [];
    for (let i = 0; i < rotated.length; i++) {
      const pool = pools[rotated[i]];
      for (let k = 0; k < pool.length; k++) {
        const cand = pool[(round + bucket + k) % pool.length];
        if (usedId[cand.id] || usedProperty[cand.propertyId]) continue;
        picked.push(cand);
        usedId[cand.id] = true;
        usedProperty[cand.propertyId] = true;
        break;
      }
    }
    if (!picked.length) break;   // hết tin chưa dùng ở mọi quận
    // Trong CÙNG một vòng thì xếp món hời sâu nhất lên trước: thứ tự quận đã xoay theo giờ
    // nên nếu không sắp lại, thẻ đầu trang chủ có hôm rơi đúng vào tin chỉ rẻ hơn 13% trong
    // khi tin rẻ hơn 49% nằm tuốt thẻ thứ ba (đo 17/08/2026).
    picked.sort((a, b) => percentById[b.id] - percentById[a.id]);
    picked.forEach(r => ordered.push(r));
  }
  return { ordered, percentById };
}

export async function GET(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, 'api');
  if (rateLimited) return rateLimited;

  try {
    const url = new URL(req.url);
    const district = url.searchParams.get('district');
    const typeName = url.searchParams.get('typeName');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');

    const featureFlags = {
      parkingCar: url.searchParams.get('parkingCar') === 'true',
      parkingBike: url.searchParams.get('parkingBike') === 'true',
      evCharging: url.searchParams.get('evCharging') === 'true',
      petAllowed: url.searchParams.get('petAllowed') === 'true',
      foreignerOk: url.searchParams.get('foreignerOk') === 'true',
    };

    // Đọc sớm vì chế độ "giá tốt" còn quyết định cả bộ lọc quận bên dưới
    const sort = url.searchParams.get('sort');
    const isDeal = sort === 'deal';

    const propertyWhere: any = { status: 'APPROVED', isActive: true };
    // Cho phép lọc nhiều quận cùng lúc: district=Quận A,Quận B
    const districts = district ? district.split(',').map(d => d.trim()).filter(Boolean) : [];
    if (districts.length === 1) {
      propertyWhere.district = { contains: districts[0], mode: 'insensitive' };
    } else if (districts.length > 1) {
      propertyWhere.OR = districts.map(d => ({ district: { contains: d, mode: 'insensitive' } }));
    } else if (isDeal) {
      // Chỉ giới hạn NỘI THÀNH khi khách chưa tự chọn quận — khách đã chọn Hoài Đức thì
      // "giá tốt ở Hoài Đức" mới là câu trả lời đúng, không phải ép về nội thành.
      propertyWhere.district = { in: INNER_CITY_DISTRICTS };
    }
    // Chụp riêng phần lọc THEO VÙNG (trước khi thêm tiện ích) để chế độ "giá tốt" tính
    // mặt bằng giá trên TOÀN kho của quận. Nếu tính trên tập đã lọc thì con số nói dối:
    // khách kéo mức giá tối đa 3,5tr → trung vị Hoàng Mai tụt từ 4,7tr xuống 3tr → tin 2,4tr
    // đang rẻ hơn 49% bị khai thành "rẻ hơn 20%" (đo 17/08/2026).
    const marketPropertyWhere: any = { ...propertyWhere };

    if (featureFlags.parkingCar) propertyWhere.parkingCar = true;
    if (featureFlags.parkingBike) propertyWhere.parkingBike = true;
    if (featureFlags.evCharging) propertyWhere.evCharging = true;
    if (featureFlags.petAllowed) propertyWhere.petAllowed = true;
    if (featureFlags.foreignerOk) propertyWhere.foreignerOk = true;

    const where: any = {
      isApproved: true,
      // Public search: include AVAILABLE + UPCOMING (khách thấy phòng sắp trống để hỏi sớm), ẩn UNAVAILABLE
      status: { in: ['AVAILABLE', 'UPCOMING'] as ('AVAILABLE' | 'UPCOMING')[] },
      property: propertyWhere,
    };

    if (typeName) where.typeName = typeName;

    if (minPrice) where.priceMonthly = { ...where.priceMonthly, gte: parseFloat(minPrice) };
    if (maxPrice) where.priceMonthly = { ...where.priceMonthly, lte: parseFloat(maxPrice) };

    // Tìm theo TỪ KHÓA (q): khớp tên tin, mã tin (MS-…), mô tả (đều CÔNG KHAI) + quận.
    // CỐ Ý KHÔNG tìm trên property.streetName/name/fullAddress (có thể chứa số nhà — app đang
    // redact số nhà; tìm trên field thô sẽ cho phép dò số nhà qua kết quả). Tên tòa/đường mà chủ
    // nhà muốn công khai thường đã nằm trong tiêu đề tin (name). where.OR được AND với where.property
    // (status=APPROVED, isActive) nên không lộ tin ẩn/chưa duyệt.
    const q = url.searchParams.get('q')?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { listingCode: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { property: { district: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const { page, limit, skip } = getPaginationParams(url);

    // Lọc "gần trường ĐH": ?uni=<short name> — tính khoảng cách SERVER-SIDE từ tọa độ tòa
    // (tọa độ KHÔNG trả về client, chỉ trả distanceKm) rồi sắp gần nhất trước.
    const uniParam = url.searchParams.get('uni');
    const uni = uniParam ? HANOI_UNIVERSITIES.find(u => u.short === uniParam) : null;

    // Sắp xếp: ?sort=price_asc|price_desc|newest|area_desc — mặc định giữ hành vi cũ
    // (còn trống trước, sắp trống theo ngày gần nhất, rồi mới nhất). Khi chọn sort giá/diện tích
    // vẫn đẩy AVAILABLE lên trước UPCOMING để khách không thấy phòng chưa vào ở được đứng đầu.
    const orderBy: any[] =
      // deal: thứ tự thật do rankDeals() quyết định; xếp giá tăng dần chỉ để nếu kho vượt
      // ngưỡng lấy (DEAL_SCAN) thì phần bị cắt là phần đắt — vốn không bao giờ vào "giá tốt".
      isDeal ? [{ priceMonthly: 'asc' }]
      : sort === 'price_asc' ? [{ status: 'asc' }, { priceMonthly: 'asc' }, { createdAt: 'desc' }]
      : sort === 'price_desc' ? [{ status: 'asc' }, { priceMonthly: 'desc' }, { createdAt: 'desc' }]
      : sort === 'area_desc' ? [{ status: 'asc' }, { areaSqm: 'desc' }, { createdAt: 'desc' }]
      : sort === 'views_desc' ? [{ status: 'asc' }, { viewCount: 'desc' }, { createdAt: 'desc' }]
      : sort === 'newest' ? [{ createdAt: 'desc' }]
      : [
          { status: 'asc' },
          { expectedAvailableDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ];

    const [roomTypes, total] = await Promise.all([
      prisma.roomType.findMany({
        where,
        select: {
          id: true,
          // CHỈ dùng server-side để "giá tốt" không lấy 2 tin cùng một tòa — không trả ra client
          propertyId: true,
          name: true,
          listingCode: true,
          typeName: true,
          areaSqm: true,
          priceMonthly: true,
          deposit: true,
          amenities: true,
          images: true,
          videos: true,
          videoLinks: true,
          availableUnits: true,
          viewCount: true, // công khai được — dùng cho tab "nhiều lượt xem" ở trang chủ
          status: true,
          expectedAvailableDate: true,
          shortTermAllowed: true,
          property: {
            select: {
              name: true,
              district: true,
              streetName: true,
              city: true,
              images: true,
              parkingCar: true,
              parkingBike: true,
              evCharging: true,
              petAllowed: true,
              foreignerOk: true,
              // CHỈ dùng server-side tính khoảng cách tới trường — bị xoá trước khi trả response
              latitude: true,
              longitude: true,
            },
          },
        },
        orderBy,
        // Gần trường & giá tốt: đều phải lấy RỘNG rồi tự xếp + tự cắt trang, vì thứ tự
        // (khoảng cách / mức rẻ hơn trung vị quận) không tính được bằng SQL.
        skip: uni || isDeal ? 0 : skip,
        take: uni ? 500 : isDeal ? DEAL_SCAN : limit,
      }),
      prisma.roomType.count({ where }),
    ]);

    // Chế độ gần trường: mặc định sắp theo khoảng cách; nếu khách CHỌN sắp xếp khác
    // (giá/diện tích/mới nhất) thì tôn trọng lựa chọn đó — DB đã orderBy sẵn nên giữ nguyên thứ tự.
    let pageRows = roomTypes;
    // "Giá tốt" lọc bỏ tin không đạt (giá bằng mặt bằng, trùng tòa, thiếu ảnh) nên TỔNG SỐ
    // khác hẳn count() của where → phải trả tổng riêng, không thì phân trang chỉ ra trang trống.
    let dealTotal: number | null = null;
    const dealPercentById = new Map<string, number>();
    const distanceById = new Map<string, number>();
    if (isDeal && !uni) {
      // Mặt bằng giá lấy trên TOÀN kho của quận (bỏ qua bộ lọc giá/loại/tiện ích của khách),
      // nếu không thì càng lọc hẹp, "rẻ hơn X%" càng teo lại và nói dối khách.
      const marketRows = await prisma.roomType.findMany({
        where: {
          isApproved: true,
          status: { in: ['AVAILABLE', 'UPCOMING'] as ('AVAILABLE' | 'UPCOMING')[] },
          property: marketPropertyWhere,
        },
        select: { priceMonthly: true, property: { select: { district: true } } },
      });
      const bucket = Math.floor(Date.now() / DEAL_ROTATE_MS);
      const { ordered, percentById } = rankDeals(roomTypes as any, medianByDistrict(marketRows), bucket);
      Object.keys(percentById).forEach(id => dealPercentById.set(id, percentById[id]));
      dealTotal = ordered.length;
      pageRows = ordered.slice(skip, skip + limit) as typeof roomTypes;
    }
    if (uni) {
      const withDist = roomTypes
        .filter(rt => rt.property?.latitude != null && rt.property?.longitude != null)
        .map(rt => {
          const d = kmBetween(uni.lat, uni.lng, rt.property!.latitude!, rt.property!.longitude!);
          distanceById.set(rt.id, d);
          return { rt, d };
        });
      if (!sort) withDist.sort((a, b) => a.d - b.d);
      pageRows = withDist.slice(skip, skip + limit).map(x => x.rt);
    }

    // Scope the share-link lookup to only the rooms on this page (≤ limit rows),
    // instead of scanning every active broker share link in the system.
    const roomIds = pageRows.map(rt => rt.id);
    const activeShareLinks = roomIds.length > 0
      ? await prisma.shareLink.findMany({
          where: { isActive: true, isSystem: false, roomTypeId: { in: roomIds } },
          select: { roomTypeId: true, token: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const tokenByRoomType = new Map<string, string>();
    for (const link of activeShareLinks) {
      if (link.roomTypeId && !tokenByRoomType.has(link.roomTypeId)) {
        tokenByRoomType.set(link.roomTypeId, link.token);
      }
    }

    const withShareToken = pageRows.map(rt => {
      const images = [...(rt.images || []), ...(rt.property?.images || [])].slice(0, 3);
      const hasVideo = (rt.videos?.length || 0) + (rt.videoLinks?.length || 0) > 0;
      // Tách tọa độ ra khỏi property — TUYỆT ĐỐI không trả lat/lng cho client (chống dò vị trí)
      const { latitude: _lat, longitude: _lng, ...safeProp } = (rt.property || {}) as any;
      const distanceKm = distanceById.has(rt.id) ? Math.round(distanceById.get(rt.id)! * 10) / 10 : undefined;
      return {
        ...(distanceKm !== undefined ? { distanceKm, uniShort: uni?.short } : {}),
        // Rẻ hơn bao nhiêu % so với mặt bằng quận — lý do tin này đứng ở tab "Giá tốt",
        // nói thẳng ra cho khách thay vì bắt tự đoán (giống badge lượt xem ở tab "Xem nhiều")
        ...(dealPercentById.has(rt.id) ? { dealPercent: dealPercentById.get(rt.id) } : {}),
        id: rt.id,
        // Tên tin do chủ nhà tự gõ, rất hay kèm số nhà → phải che trước khi ra công khai (redactTitle)
        name: redactTitle(rt.name),
        listingCode: rt.listingCode,
        typeName: rt.typeName,
        areaSqm: rt.areaSqm,
        priceMonthly: rt.priceMonthly,
        deposit: rt.deposit,
        amenities: rt.amenities,
        images,
        hasVideo,
        videoLinks: rt.videoLinks || [],
        // Trả video upload (URL) để thẻ dùng khung hình làm ảnh đại diện khi tin không có ảnh.
        videos: rt.videos || [],
        availableUnits: rt.availableUnits,
        viewCount: rt.viewCount,
        status: rt.status,
        expectedAvailableDate: rt.expectedAvailableDate,
        shortTermAllowed: rt.shortTermAllowed,
        // Ẩn số nhà: redact tên tòa + tên đường (vài bản ghi nhồi cả số nhà vào streetName).
        property: rt.property
          ? { ...safeProp, name: redactName(rt.property.name), streetName: redactHouseNumber(rt.property.streetName) }
          : rt.property,
        shareToken: tokenByRoomType.get(rt.id) || null,
      };
    });

    // Public, no per-user data → CDN-cacheable. s-maxage keeps listings fresh
    // within a minute; SWR serves stale instantly while revalidating in the
    // background. Per-query-string variants cache separately.
    return NextResponse.json(paginatedResponse(withShareToken, dealTotal ?? total, page, limit), {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('/api/rooms/public error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}
