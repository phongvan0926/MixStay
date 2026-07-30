import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/PublicNav';
import CallFab from '@/components/ui/CallFab';
import SeoLinks from '@/components/public/SeoLinks';
import { getDistrictCounts } from '@/lib/seo-listings';
import { SEO_DISTRICTS, districtPath, uniPath, SEO_UNIS, SITE_URL } from '@/lib/seo-locations';

// Trang tổng hợp khu vực — vừa là lối vào cho khách, vừa là "hub" để Google đi tới
// toàn bộ trang đích theo quận (không có trang này thì các trang quận gần như mồ côi).
export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Thuê phòng trọ, chung cư mini Hà Nội theo quận',
  description:
    'Danh sách phòng trọ, chung cư mini cho thuê tại 12 quận nội thành Hà Nội: Cầu Giấy, Đống Đa, Thanh Xuân, Nam Từ Liêm, Bắc Từ Liêm, Hai Bà Trưng… Xem số phòng trống và giá thuê từng khu vực.',
  alternates: { canonical: `${SITE_URL}/thue-phong-tro` },
};

export default async function DistrictHubPage() {
  const counts = await getDistrictCounts();
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  const withCount = (list: typeof SEO_DISTRICTS) =>
    list.map(d => ({ ...d, count: counts.get(d.name) || 0 })).sort((a, b) => b.count - a.count);

  const inner = withCount(SEO_DISTRICTS.filter(d => d.inner));
  const outer = withCount(SEO_DISTRICTS.filter(d => !d.inner)).filter(d => d.count > 0);

  return (
    <div className="min-h-screen bg-stone-50">
      <PublicNav />
      <main className="pt-16">
        <section className="bg-white border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <nav className="text-xs text-stone-500 mb-4 flex items-center gap-1.5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-brand-600">Trang chủ</Link>
              <span aria-hidden>›</span>
              <span className="text-stone-700 font-medium">Thuê phòng trọ Hà Nội</span>
            </nav>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-stone-900">
              Thuê phòng trọ, chung cư mini Hà Nội theo quận
            </h1>
            <p className="mt-3 text-stone-600 max-w-3xl leading-relaxed">
              MixStay đang có <strong className="text-stone-900">{total} phòng trống</strong> trên toàn Hà Nội,
              do chủ nhà và công ty quản lý đăng trực tiếp. Chọn quận bạn muốn ở để xem tin kèm ảnh, video,
              giá và tiện ích — miễn phí cho người thuê.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mb-4">Quận nội thành</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inner.map(d => (
              <Link key={d.slug} href={districtPath(d.name)}
                className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-stone-200 px-4 py-3.5 hover:border-brand-400 hover:shadow-sm transition-all">
                <span className="font-medium text-stone-900">Phòng trọ {d.name}</span>
                <span className={`text-sm font-semibold ${d.count ? 'text-brand-600' : 'text-stone-400'}`}>
                  {d.count ? `${d.count} tin` : 'Sắp có'}
                </span>
              </Link>
            ))}
          </div>

          {outer.length > 0 && (
            <>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mt-10 mb-4">Khu vực ngoại thành</h2>
              <div className="flex flex-wrap gap-2">
                {outer.map(d => (
                  <Link key={d.slug} href={districtPath(d.name)}
                    className="text-sm px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">
                    {d.name} <span className="text-stone-400">({d.count})</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mt-10 mb-4">Tìm theo trường đại học</h2>
          <div className="flex flex-wrap gap-2">
            {SEO_UNIS.map(u => (
              <Link key={u.slug} href={uniPath(u.short)}
                className="text-sm px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">
                🎓 Gần {u.name}
              </Link>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/phong" className="btn-primary px-6 py-3 text-sm">Xem toàn bộ phòng mới nhất</Link>
            <Link href="/ban-do"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-brand-600 shadow-md hover:shadow-lg transition-all">
              🗺️ Tìm trên bản đồ
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-brand-900 text-stone-300 px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <SeoLinks dark />
          <p className="border-t border-white/10 mt-8 pt-6 text-center text-sm">&copy; 2026 MixStay. All Copyright Reserved.</p>
        </div>
      </footer>

      <CallFab stacked={false} />
    </div>
  );
}
