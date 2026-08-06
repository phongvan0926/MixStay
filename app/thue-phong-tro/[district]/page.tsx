import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicNav from '@/components/layout/PublicNav';
import SupportFabs from '@/components/public/SupportFabs';
import ListingCard from '@/components/public/ListingCard';
import SeoLinks from '@/components/public/SeoLinks';
import CompareBar from '@/components/public/CompareBar';
import { getDistrictPageData } from '@/lib/seo-listings';
import { safeJsonLd } from '@/lib/json-ld';
import {
  districtBySlug, districtPath, uniPath, SEO_DISTRICTS, SITE_URL, PRICE_BANDS, TYPE_LABEL,
} from '@/lib/seo-locations';

// Trang đích SEO theo QUẬN. Nội dung render sẵn phía server + cache 30 phút (ISR):
// Google đọc được ngay HTML có tin thật, giá thật — thay vì trang trắng chờ JS gọi API.
export const revalidate = 1800;

// Dựng sẵn 12 quận nội thành lúc build (nơi có gần như toàn bộ kho hàng); quận ngoại thành
// vẫn vào được, chỉ là render lần đầu khi có người mở rồi mới cache.
export function generateStaticParams() {
  return SEO_DISTRICTS.filter(d => d.inner).map(d => ({ district: d.slug }));
}

// generateMetadata và trang cùng cần một bộ số liệu — cache() gộp lại thành 1 lượt truy vấn.
const getData = cache((district: string) => getDistrictPageData(district));

const trieu =(n?: number | null) => (n == null ? '—' : `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} triệu`);

export async function generateMetadata({ params }: { params: { district: string } }): Promise<Metadata> {
  const d = districtBySlug(params.district);
  if (!d) return { title: 'Không tìm thấy khu vực' };

  const { stats } = await getData(d.name);
  const url = `${SITE_URL}${districtPath(d.name)}`;
  const title = stats.total
    ? `Thuê phòng trọ, chung cư mini ${d.name} — ${stats.total} phòng trống, giá từ ${trieu(stats.minPrice)}`
    : `Thuê phòng trọ, chung cư mini ${d.name} Hà Nội`;
  const description = stats.total
    ? `${stats.total} phòng trọ, chung cư mini đang trống tại ${d.name} (Hà Nội) từ ${stats.buildings} tòa nhà. Giá ${trieu(stats.minPrice)} – ${trieu(stats.maxPrice)}/tháng, phổ biến quanh ${trieu(stats.avgPrice)}. Xem ảnh, video, tiện ích và liên hệ trực tiếp — miễn phí cho người thuê.`
    : `Danh sách phòng trọ, chung cư mini cho thuê tại ${d.name}, Hà Nội. Cập nhật liên tục từ chủ nhà và công ty quản lý trên MixStay.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', locale: 'vi_VN', siteName: 'MixStay' },
    // Quận chưa có tin nào thì trang mỏng — đừng để Google index trang rỗng.
    ...(stats.total === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DistrictPage({ params }: { params: { district: string } }) {
  const d = districtBySlug(params.district);
  if (!d) notFound();

  const { stats, listings, nearbyUnis } = await getData(d.name);
  const searchHref = `/phong?district=${encodeURIComponent(d.name)}`;
  const others = SEO_DISTRICTS.filter(x => x.inner && x.slug !== d.slug);

  const faq = [
    {
      q: `Thuê phòng trọ ở ${d.name} giá bao nhiêu một tháng?`,
      a: stats.total
        ? `Trên MixStay hiện có ${stats.total} tin đang trống ở ${d.name} với giá từ ${trieu(stats.minPrice)} đến ${trieu(stats.maxPrice)}/tháng, mức phổ biến quanh ${trieu(stats.avgPrice)}/tháng cho phòng trung bình ${Math.round(stats.avgArea || 0)}m².`
        : `Hiện chưa có tin nào đang trống ở ${d.name}. Bạn để lại tiêu chí và số điện thoại, MixStay sẽ báo ngay khi có phòng mới.`,
    },
    {
      q: `Thuê phòng ở ${d.name} phải đặt cọc mấy tháng?`,
      a: stats.depositMonths
        ? `Mức cọc phổ biến ở ${d.name} khoảng ${stats.depositMonths} tháng tiền phòng (tính trên ${stats.total} tin đang đăng). Mỗi tòa mỗi khác — số cọc chính xác ghi rõ trong từng tin.`
        : `Mức cọc tuỳ từng tòa, thường 1 tháng tiền phòng. Số cọc chính xác được ghi trong từng tin đăng.`,
    },
    {
      q: `Ở ${d.name} có phòng để được ô tô, nuôi thú cưng hoặc cho người nước ngoài thuê không?`,
      a: `Có. Trong số tin đang trống ở ${d.name}: ${stats.parkingCar} tin có chỗ đỗ ô tô, ${stats.petAllowed} tin cho nuôi thú cưng, ${stats.foreignerOk} tin nhận khách nước ngoài. Bạn lọc nhanh các tiêu chí này ở trang tìm phòng.`,
    },
    {
      q: 'Xem phòng qua MixStay có mất phí không?',
      a: 'Không. Người thuê dùng MixStay hoàn toàn miễn phí: xem ảnh, video, tiện ích và đặt lịch xem phòng. MixStay nhận hoa hồng từ chủ nhà khi phòng được thuê.',
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Thuê phòng trọ Hà Nội', item: `${SITE_URL}/thue-phong-tro` },
          { '@type': 'ListItem', position: 3, name: `Phòng trọ ${d.name}`, item: `${SITE_URL}${districtPath(d.name)}` },
        ],
      },
      {
        '@type': 'ItemList',
        name: `Phòng trọ, chung cư mini cho thuê tại ${d.name}`,
        numberOfItems: listings.length,
        itemListElement: listings.map((rt, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/tin/${rt.id}`,
          name: rt.name,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <PublicNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <main className="pt-16">
        <section className="bg-white border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <nav className="text-xs text-stone-500 mb-4 flex flex-wrap items-center gap-1.5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-brand-600">Trang chủ</Link>
              <span aria-hidden>›</span>
              <Link href="/thue-phong-tro" className="hover:text-brand-600">Thuê phòng trọ Hà Nội</Link>
              <span aria-hidden>›</span>
              <span className="text-stone-700 font-medium">{d.name}</span>
            </nav>

            <h1 className="font-display text-2xl sm:text-4xl font-bold text-stone-900">
              Thuê phòng trọ, chung cư mini {d.name}
            </h1>

            {stats.total > 0 ? (
              <p className="mt-3 text-stone-600 leading-relaxed max-w-3xl">
                Hiện có <strong className="text-stone-900">{stats.total} phòng đang trống</strong> tại{' '}
                <strong className="text-stone-900">{stats.buildings} tòa</strong> ở {d.name}, giá từ{' '}
                <strong className="text-brand-600">{trieu(stats.minPrice)}</strong> đến {trieu(stats.maxPrice)}/tháng
                (phổ biến quanh {trieu(stats.avgPrice)}), diện tích trung bình {Math.round(stats.avgArea || 0)}m².
                Tin do chủ nhà và công ty quản lý đăng trực tiếp, có ảnh và video thật, cập nhật hằng ngày.
              </p>
            ) : (
              <p className="mt-3 text-stone-600 max-w-3xl">
                Chưa có tin nào đang trống ở {d.name}. Bạn xem các khu vực lân cận bên dưới, hoặc để lại
                tiêu chí ở trang tìm phòng — có phòng mới khớp, MixStay sẽ chủ động báo bạn.
              </p>
            )}

            {stats.total > 0 && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Phòng đang trống', value: stats.total },
                  { label: 'Tòa nhà', value: stats.buildings },
                  { label: 'Giá phổ biến', value: trieu(stats.avgPrice) },
                  { label: 'Cọc trung bình', value: stats.depositMonths ? `${stats.depositMonths} tháng` : '—' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                    <p className="text-lg sm:text-xl font-bold text-stone-900">{s.value}</p>
                    <p className="text-[11px] sm:text-xs text-stone-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {stats.total > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Theo giá</span>
                  {PRICE_BANDS.map(b => {
                    const qs = new URLSearchParams({ district: d.name });
                    if (b.min) qs.set('minPrice', String(b.min));
                    if (b.max) qs.set('maxPrice', String(b.max));
                    return (
                      <Link key={b.label} href={`/phong?${qs}`}
                        className="text-sm px-3 py-1.5 rounded-full border border-stone-300 bg-white text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">
                        {b.label}
                      </Link>
                    );
                  })}
                </div>
                {stats.byType.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Loại phòng</span>
                    {stats.byType.map(t => (
                      <Link key={t.typeName} href={`/phong?district=${encodeURIComponent(d.name)}&typeName=${t.typeName}`}
                        className="text-sm px-3 py-1.5 rounded-full border border-stone-300 bg-white text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">
                        {TYPE_LABEL[t.typeName] || t.typeName} <span className="text-stone-400">({t.count})</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {listings.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mb-1">
              Phòng trọ, chung cư mini {d.name} mới nhất
            </h2>
            <p className="text-sm text-stone-500 mb-6">
              Đang hiển thị {listings.length} / {stats.total} tin đang trống
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map(rt => <ListingCard key={rt.id} rt={rt} />)}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={searchHref} className="btn-primary px-6 py-3 text-sm">
                Xem tất cả {stats.total} tin ở {d.name}
              </Link>
              <Link href="/ban-do"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-brand-600 shadow-md hover:shadow-lg transition-all">
                🗺️ Xem {d.name} trên bản đồ
              </Link>
            </div>
          </section>
        )}

        {nearbyUnis.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mb-4">
              Phòng trọ gần trường đại học ở {d.name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {nearbyUnis.map(({ uni, count }) => (
                <Link key={uni.slug} href={uniPath(uni.short)}
                  className="text-sm px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">
                  🎓 Gần {uni.name} <span className="text-stone-400">({count} tòa)</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mb-4">
            Câu hỏi thường gặp khi thuê phòng ở {d.name}
          </h2>
          <div className="space-y-3">
            {faq.map(f => (
              <details key={f.q} className="group bg-white rounded-2xl border border-stone-200 p-4 open:shadow-sm">
                <summary className="font-medium text-stone-900 cursor-pointer list-none flex items-start justify-between gap-3">
                  <span>{f.q}</span>
                  <span className="text-stone-400 group-open:rotate-180 transition-transform shrink-0" aria-hidden>⌄</span>
                </summary>
                <p className="mt-2 text-sm text-stone-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mb-4">Khu vực khác ở Hà Nội</h2>
          <div className="flex flex-wrap gap-2">
            {others.map(o => (
              <Link key={o.slug} href={districtPath(o.name)}
                className="text-sm px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">
                Phòng trọ {o.name}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-brand-900 text-stone-300 px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <SeoLinks dark />
          <p className="border-t border-white/10 mt-8 pt-6 text-center text-sm">&copy; 2026 MixStay. All Copyright Reserved.</p>
        </div>
      </footer>

      <CompareBar />
      <SupportFabs />
    </div>
  );
}
