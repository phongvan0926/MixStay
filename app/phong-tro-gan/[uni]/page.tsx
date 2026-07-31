import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicNav from '@/components/layout/PublicNav';
import CallFab from '@/components/ui/CallFab';
import ListingCard from '@/components/public/ListingCard';
import SeoLinks from '@/components/public/SeoLinks';
import CompareBar from '@/components/public/CompareBar';
import { getUniPageData } from '@/lib/seo-listings';
import {
  uniBySlug, uniPath, districtPath, SEO_UNIS, SITE_URL, UNI_RADIUS_KM, PRICE_BANDS,
} from '@/lib/seo-locations';

// Trang đích SEO theo TRƯỜNG ĐẠI HỌC — đúng cách sinh viên tìm phòng ("phòng trọ gần Bách Khoa").
// Khoảng cách tính từ toạ độ tòa nhà; toạ độ KHÔNG bao giờ lộ ra HTML, chỉ hiện "cách ~X km".
export const revalidate = 1800;

// 18 trường đều dựng sẵn lúc build rồi làm mới theo ISR.
export function generateStaticParams() {
  return SEO_UNIS.map(u => ({ uni: u.slug }));
}

const getData = cache((slug: string) => getUniPageData(uniBySlug(slug)!));

const trieu = (n?: number | null) => (n == null ? '—' : `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} triệu`);

export async function generateMetadata({ params }: { params: { uni: string } }): Promise<Metadata> {
  const u = uniBySlug(params.uni);
  if (!u) return { title: 'Không tìm thấy trường' };

  const data = await getData(u.slug);
  const url = `${SITE_URL}${uniPath(u.short)}`;
  const title = data.total
    ? `Phòng trọ gần ${u.name} — ${data.total} phòng trống, giá từ ${trieu(data.minPrice)}`
    : `Phòng trọ, chung cư mini gần ${u.name}`;
  const description = data.total
    ? `${data.total} phòng trọ, chung cư mini đang trống trong bán kính ${UNI_RADIUS_KM}km quanh ${u.name}. Giá từ ${trieu(data.minPrice)}/tháng, phổ biến quanh ${trieu(data.avgPrice)}. Xem ảnh, video, khoảng cách tới trường — miễn phí cho sinh viên.`
    : `Tìm phòng trọ, chung cư mini gần ${u.name} trên MixStay. Kho phòng cập nhật hằng ngày từ chủ nhà và công ty quản lý.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', locale: 'vi_VN', siteName: 'MixStay' },
    ...(data.total === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function UniPage({ params }: { params: { uni: string } }) {
  const u = uniBySlug(params.uni);
  if (!u) notFound();

  const { listings, total, minPrice, avgPrice, districts } = await getData(u.slug);
  const searchHref = `/phong?uni=${encodeURIComponent(u.short)}`;
  const others = SEO_UNIS.filter(x => x.slug !== u.slug);

  const faq = [
    {
      q: `Phòng trọ gần ${u.name} giá bao nhiêu?`,
      a: total
        ? `Trong bán kính ${UNI_RADIUS_KM}km quanh ${u.name} hiện có ${total} phòng đang trống, giá từ ${trieu(minPrice)}/tháng, mức phổ biến quanh ${trieu(avgPrice)}/tháng.`
        : `Hiện chưa có tin nào trong bán kính ${UNI_RADIUS_KM}km quanh ${u.name}. Bạn để lại tiêu chí ở trang tìm phòng để được báo khi có phòng mới.`,
    },
    {
      q: `Ở khu nào thì gần ${u.name} nhất?`,
      a: districts.length
        ? `Phòng quanh trường tập trung ở ${districts.slice(0, 3).map(x => `${x.name} (${x.count} tin)`).join(', ')}. Mỗi tin trên MixStay đều ghi rõ khoảng cách ước tính tới trường.`
        : `Bạn có thể mở bản đồ tìm phòng, ghim vị trí trường rồi chọn bán kính để xem các tòa quanh đó.`,
    },
    {
      q: 'Sinh viên thuê phòng qua MixStay có mất phí gì không?',
      a: 'Không. Người thuê dùng MixStay miễn phí hoàn toàn — xem tin, xem video, đặt lịch xem phòng. Chi phí do chủ nhà chi trả khi phòng được thuê.',
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Phòng trọ gần trường đại học', item: `${SITE_URL}/phong-tro-gan` },
          { '@type': 'ListItem', position: 3, name: `Gần ${u.name}`, item: `${SITE_URL}${uniPath(u.short)}` },
        ],
      },
      {
        '@type': 'ItemList',
        name: `Phòng trọ, chung cư mini gần ${u.name}`,
        numberOfItems: listings.length,
        itemListElement: listings.map((rt, i) => ({
          '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/tin/${rt.id}`, name: rt.name,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map(f => ({
          '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <PublicNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="pt-16">
        <section className="bg-white border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <nav className="text-xs text-stone-500 mb-4 flex flex-wrap items-center gap-1.5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-brand-600">Trang chủ</Link>
              <span aria-hidden>›</span>
              <Link href="/phong-tro-gan" className="hover:text-brand-600">Phòng trọ gần trường</Link>
              <span aria-hidden>›</span>
              <span className="text-stone-700 font-medium">{u.name}</span>
            </nav>

            <h1 className="font-display text-2xl sm:text-4xl font-bold text-stone-900">
              Phòng trọ, chung cư mini gần {u.name}
            </h1>

            {total > 0 ? (
              <p className="mt-3 text-stone-600 leading-relaxed max-w-3xl">
                <strong className="text-stone-900">{total} phòng đang trống</strong> trong bán kính{' '}
                {UNI_RADIUS_KM}km quanh {u.name}, giá từ <strong className="text-brand-600">{trieu(minPrice)}</strong>/tháng
                (phổ biến quanh {trieu(avgPrice)}). Danh sách xếp theo khoảng cách — phòng gần trường nhất lên đầu,
                mỗi tin ghi rõ cách trường bao nhiêu km.
              </p>
            ) : (
              <p className="mt-3 text-stone-600 max-w-3xl">
                Chưa có tin nào trong bán kính {UNI_RADIUS_KM}km quanh {u.name}. Xem các trường lân cận bên dưới
                hoặc để lại tiêu chí ở trang tìm phòng để được báo khi có phòng mới.
              </p>
            )}

            {total > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Theo giá</span>
                {PRICE_BANDS.map(b => {
                  const qs = new URLSearchParams({ uni: u.short });
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
            )}

            {districts.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Khu vực quanh trường</span>
                {districts.slice(0, 5).map(x => (
                  <Link key={x.name} href={districtPath(x.name)}
                    className="text-sm px-3 py-1.5 rounded-full border border-stone-300 bg-white text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">
                    {x.name} <span className="text-stone-400">({x.count})</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {listings.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mb-1">
              Phòng gần {u.name} nhất
            </h2>
            <p className="text-sm text-stone-500 mb-6">Đang hiển thị {listings.length} / {total} tin, gần nhất trước</p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map(rt => <ListingCard key={rt.id} rt={rt} uniShort={u.short} />)}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={searchHref} className="btn-primary px-6 py-3 text-sm">
                Xem tất cả {total} tin gần {u.short}
              </Link>
              <Link href="/ban-do"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-brand-600 shadow-md hover:shadow-lg transition-all">
                🗺️ Xem quanh trường trên bản đồ
              </Link>
            </div>
          </section>
        )}

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-10">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mb-4">
            Câu hỏi thường gặp khi thuê phòng gần {u.short}
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
          <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mb-4">Trường đại học khác</h2>
          <div className="flex flex-wrap gap-2">
            {others.map(o => (
              <Link key={o.slug} href={uniPath(o.short)}
                className="text-sm px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">
                🎓 Gần {o.name}
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
      <CallFab stacked={false} />
    </div>
  );
}
