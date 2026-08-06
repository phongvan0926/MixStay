// SERVER-ONLY: file này import prisma nên chỉ được dùng trong Server Component / API route.
import prisma from '@/lib/prisma';
import { redactName, redactHouseNumber, redactTitle } from '@/lib/address';
import { SEO_UNIS, UNI_RADIUS_KM, type SeoUni } from '@/lib/seo-locations';

// Truy vấn dữ liệu cho TRANG ĐÍCH SEO — chạy trên server, render sẵn HTML (ISR) để Google
// đọc được nội dung thật, khác hẳn ô tìm kiếm client-side ở trang chủ.
//
// Mọi dữ liệu ra ngoài đều đi qua redact số nhà, y hệt /api/rooms/public: trang đích công khai
// nên KHÔNG được lộ số nhà, SĐT hay toạ độ.

/** Tin đang bán được cho khách xem: đã duyệt, còn/sắp trống, tòa đã duyệt và đang bật. */
export const PUBLIC_ROOM_WHERE = {
  isApproved: true,
  status: { in: ['AVAILABLE', 'UPCOMING'] as ('AVAILABLE' | 'UPCOMING')[] },
  property: { status: 'APPROVED' as const, isActive: true },
};

const CARD_SELECT = {
  id: true,
  propertyId: true,
  name: true,
  typeName: true,
  areaSqm: true,
  priceMonthly: true,
  images: true,
  videos: true,
  videoLinks: true,
  availableUnits: true,
  status: true,
  expectedAvailableDate: true,
  shortTermAllowed: true,
  property: {
    select: {
      name: true,
      district: true,
      streetName: true,
      images: true,
      parkingCar: true,
      parkingBike: true,
      evCharging: true,
      petAllowed: true,
      foreignerOk: true,
    },
  },
} as const;

export type ListingCardData = {
  id: string;
  name: string;
  typeName: string;
  areaSqm: number;
  priceMonthly: number;
  images: string[];
  videos: string[];
  videoLinks: string[];
  availableUnits: number;
  status: string;
  expectedAvailableDate: Date | null;
  shortTermAllowed: boolean;
  distanceKm?: number;
  property: {
    name: string;
    district: string;
    streetName: string;
    parkingCar: boolean;
    parkingBike: boolean;
    evCharging: boolean;
    petAllowed: boolean;
    foreignerOk: boolean;
  } | null;
};

function toCard(rt: any, distanceKm?: number): ListingCardData {
  return {
    id: rt.id,
    // Tên tin do chủ nhà tự gõ, rất hay kèm số nhà → phải che trước khi ra công khai (redactTitle)
    name: redactTitle(rt.name),
    typeName: rt.typeName,
    areaSqm: rt.areaSqm,
    priceMonthly: rt.priceMonthly,
    // Tòa thường có ảnh ngoại cảnh — dùng bù khi tin chưa có ảnh riêng.
    images: [...(rt.images || []), ...(rt.property?.images || [])].slice(0, 3),
    videos: rt.videos || [],
    videoLinks: rt.videoLinks || [],
    availableUnits: rt.availableUnits,
    status: rt.status,
    expectedAvailableDate: rt.expectedAvailableDate ?? null,
    shortTermAllowed: !!rt.shortTermAllowed,
    ...(distanceKm !== undefined ? { distanceKm } : {}),
    property: rt.property
      ? {
          name: redactName(rt.property.name),
          district: rt.property.district || '',
          streetName: redactHouseNumber(rt.property.streetName),
          parkingCar: !!rt.property.parkingCar,
          parkingBike: !!rt.property.parkingBike,
          evCharging: !!rt.property.evCharging,
          petAllowed: !!rt.property.petAllowed,
          foreignerOk: !!rt.property.foreignerOk,
        }
      : null,
  };
}

/** Sắp xếp mặc định: còn trống trước, rồi tin mới nhất. */
const CARD_ORDER = [
  { status: 'asc' as const },
  { createdAt: 'desc' as const },
];

/**
 * Xen kẽ tin theo TÒA (round-robin) rồi mới cắt lấy `take` tin đầu.
 *
 * Kho được nhập theo lô nên tin cùng một tòa nằm liền nhau — để nguyên thì 9 thẻ đầu của
 * trang quận là cùng một địa chỉ, trông như tin rác và khách không thấy được độ phủ thật.
 */
const normTitle = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Đẩy các tin TRÙNG TIÊU ĐỀ xuống dưới (giữ nguyên thứ tự tương đối).
 *
 * Nhiều chủ nhà đặt cùng một tên cho các tòa liền kề ("Phòng 1 ngủ - bếp riêng ngõ 43 Trung Kính"),
 * nên dù đã xen kẽ theo tòa thì màn hình đầu vẫn hiện 3 thẻ chữ giống hệt — trông như tin rác.
 */
function dedupeTitles<T>(rows: T[], nameOf: (row: T) => string): T[] {
  const seen = new Set<string>();
  const first: T[] = [];
  const rest: T[] = [];
  for (const r of rows) {
    const k = normTitle(nameOf(r));
    if (seen.has(k)) rest.push(r);
    else { seen.add(k); first.push(r); }
  }
  return [...first, ...rest];
}

function spreadByBuilding<T extends { propertyId: string; name: string }>(rows: T[], take: number): T[] {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const g = groups.get(r.propertyId);
    if (g) g.push(r);
    else groups.set(r.propertyId, [r]);
  }
  const queues = Array.from(groups.values());
  const out: T[] = [];
  // Xen kẽ DƯ ra rồi mới lọc tiêu đề trùng — nếu chỉ xen kẽ đúng `take` thì các tin trùng tên
  // vẫn nằm trong trang, chỉ bị đẩy xuống cuối.
  const pool = take * 3;
  for (let round = 0; out.length < pool; round++) {
    let added = false;
    for (const q of queues) {
      if (round < q.length) {
        out.push(q[round]);
        added = true;
        if (out.length >= pool) break;
      }
    }
    if (!added) break; // hết tin
  }
  return dedupeTitles(out, r => r.name).slice(0, take);
}

export type AreaStats = {
  total: number;
  buildings: number;
  minPrice: number | null;
  avgPrice: number | null;
  maxPrice: number | null;
  avgArea: number | null;
  depositMonths: number | null;
  parkingCar: number;
  petAllowed: number;
  foreignerOk: number;
  byType: { typeName: string; count: number }[];
};

/** Khoảng cách km giữa 2 toạ độ (haversine). */
export function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export type DistrictPageData = {
  stats: AreaStats;
  listings: ListingCardData[];
  /** Trường đại học nằm trong bán kính so với các tòa của quận — làm link nội bộ. */
  nearbyUnis: { uni: SeoUni; count: number }[];
};

export async function getDistrictPageData(district: string, take = 24): Promise<DistrictPageData> {
  const where = {
    ...PUBLIC_ROOM_WHERE,
    property: { ...PUBLIC_ROOM_WHERE.property, district: { equals: district, mode: 'insensitive' as const } },
  };

  const [agg, listings, byType, buildings, parkingCar, petAllowed, foreignerOk, coords] =
    await Promise.all([
      prisma.roomType.aggregate({
        where,
        _count: true,
        _min: { priceMonthly: true },
        _max: { priceMonthly: true },
        _avg: { priceMonthly: true, areaSqm: true, deposit: true },
      }),
      // Lấy dư rồi mới xen kẽ theo tòa — nếu chỉ lấy đúng `take` thì phần lớn sẽ rơi vào 1–2 tòa.
      prisma.roomType.findMany({ where, select: CARD_SELECT, orderBy: CARD_ORDER, take: take * 5 }),
      prisma.roomType.groupBy({ by: ['typeName'], where, _count: true }),
      prisma.property.count({
        where: { status: 'APPROVED', isActive: true, district: { equals: district, mode: 'insensitive' } },
      }),
      prisma.roomType.count({ where: { ...where, property: { ...where.property, parkingCar: true } } }),
      prisma.roomType.count({ where: { ...where, property: { ...where.property, petAllowed: true } } }),
      prisma.roomType.count({ where: { ...where, property: { ...where.property, foreignerOk: true } } }),
      // Toạ độ CHỈ dùng server-side để biết quận này gần trường nào — không bao giờ trả ra HTML.
      prisma.property.findMany({
        where: {
          status: 'APPROVED',
          isActive: true,
          district: { equals: district, mode: 'insensitive' },
          latitude: { not: null },
          longitude: { not: null },
        },
        select: { latitude: true, longitude: true },
      }),
    ]);

  const avgPrice = agg._avg.priceMonthly ?? null;
  const avgDeposit = agg._avg.deposit ?? null;

  const nearbyUnis = SEO_UNIS.map(uni => ({
    uni,
    count: coords.filter(c => kmBetween(uni.lat, uni.lng, c.latitude!, c.longitude!) <= UNI_RADIUS_KM).length,
  }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    stats: {
      total: agg._count,
      buildings,
      minPrice: agg._min.priceMonthly ?? null,
      avgPrice,
      maxPrice: agg._max.priceMonthly ?? null,
      avgArea: agg._avg.areaSqm ?? null,
      // Cọc quy ra "mấy tháng tiền phòng" — con số khách thực sự quan tâm.
      depositMonths: avgPrice && avgDeposit ? Math.round((avgDeposit / avgPrice) * 10) / 10 : null,
      parkingCar,
      petAllowed,
      foreignerOk,
      byType: byType
        .map(t => ({ typeName: t.typeName, count: t._count }))
        .sort((a, b) => b.count - a.count),
    },
    listings: spreadByBuilding(listings, take).map(rt => toCard(rt)),
    nearbyUnis,
  };
}

/** Số tin đang trống theo từng quận — cho trang tổng hợp /thue-phong-tro. */
export async function getDistrictCounts(): Promise<Map<string, number>> {
  // Đếm trên chính tin đang hiển thị (không đếm quan hệ ở phía Property vì gồm cả tin ẩn/chưa duyệt).
  const rows = await prisma.roomType.findMany({
    where: PUBLIC_ROOM_WHERE,
    select: { property: { select: { district: true } } },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = (r.property?.district || '').trim();
    if (!d) continue;
    map.set(d, (map.get(d) || 0) + 1);
  }
  return map;
}

export type UniPageData = {
  listings: ListingCardData[];
  total: number;
  minPrice: number | null;
  avgPrice: number | null;
  districts: { name: string; count: number }[];
};

/**
 * Tin quanh một trường trong bán kính UNI_RADIUS_KM.
 *
 * Lọc thô bằng HỘP TOẠ ĐỘ trong SQL rồi mới haversine trong JS: tránh kéo cả 758 tin về
 * chỉ để loại phần lớn, mà vẫn cho khoảng cách chính xác.
 */
export async function getUniPageData(uni: SeoUni, take = 24): Promise<UniPageData> {
  const dLat = UNI_RADIUS_KM / 111; // 1 độ vĩ ≈ 111km
  const dLng = UNI_RADIUS_KM / (111 * Math.cos((uni.lat * Math.PI) / 180));

  const rows = await prisma.roomType.findMany({
    where: {
      ...PUBLIC_ROOM_WHERE,
      property: {
        ...PUBLIC_ROOM_WHERE.property,
        latitude: { gte: uni.lat - dLat, lte: uni.lat + dLat },
        longitude: { gte: uni.lng - dLng, lte: uni.lng + dLng },
      },
    },
    select: { ...CARD_SELECT, property: { select: { ...CARD_SELECT.property.select, latitude: true, longitude: true } } },
    orderBy: CARD_ORDER,
    take: 400,
  });

  const withDist = rows
    .map(rt => ({
      rt,
      d: kmBetween(uni.lat, uni.lng, (rt.property as any).latitude!, (rt.property as any).longitude!),
    }))
    .filter(x => x.d <= UNI_RADIUS_KM)
    .sort((a, b) => a.d - b.d);

  const districts = new Map<string, number>();
  for (const x of withDist) {
    const d = (x.rt.property?.district || '').trim();
    if (d) districts.set(d, (districts.get(d) || 0) + 1);
  }

  const prices = withDist.map(x => x.rt.priceMonthly).filter(p => p > 0);

  // Giữ đúng thứ tự gần → xa, nhưng mỗi tòa tối đa 2 tin ở trang đầu để 24 thẻ không rơi
  // hết vào một toà sát trường; thiếu thì bù nốt các tin còn lại (vẫn theo khoảng cách).
  const perBuilding = new Map<string, number>();
  const primary: typeof withDist = [];
  const spare: typeof withDist = [];
  for (const x of withDist) {
    const n = perBuilding.get(x.rt.propertyId) || 0;
    if (n < 2) {
      perBuilding.set(x.rt.propertyId, n + 1);
      primary.push(x);
    } else {
      spare.push(x);
    }
  }
  // Rồi mới đẩy tin trùng tiêu đề xuống dưới (vẫn giữ thứ tự gần → xa trong từng nhóm).
  const picked = dedupeTitles([...primary, ...spare], x => x.rt.name).slice(0, take);

  return {
    listings: picked.map(x => toCard(x.rt, Math.round(x.d * 10) / 10)),
    total: withDist.length,
    minPrice: prices.length ? Math.min(...prices) : null,
    avgPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
    districts: Array.from(districts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
}

/** Số tin quanh MỌI trường — cho trang tổng hợp /phong-tro-gan (1 truy vấn duy nhất). */
export async function getUniCounts(): Promise<Map<string, number>> {
  const rows = await prisma.roomType.findMany({
    where: {
      ...PUBLIC_ROOM_WHERE,
      property: { ...PUBLIC_ROOM_WHERE.property, latitude: { not: null }, longitude: { not: null } },
    },
    select: { property: { select: { latitude: true, longitude: true } } },
  });

  const map = new Map<string, number>();
  for (const u of SEO_UNIS) {
    let n = 0;
    for (const r of rows) {
      if (kmBetween(u.lat, u.lng, r.property!.latitude!, r.property!.longitude!) <= UNI_RADIUS_KM) n++;
    }
    map.set(u.slug, n);
  }
  return map;
}
