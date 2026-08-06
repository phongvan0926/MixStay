import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/PublicNav';
import SupportFabs from '@/components/public/SupportFabs';
import SeoLinks from '@/components/public/SeoLinks';
import { getUniCounts } from '@/lib/seo-listings';
import { SEO_UNIS, uniPath, districtPath, SEO_DISTRICTS, SITE_URL, UNI_RADIUS_KM } from '@/lib/seo-locations';

// Hub các trường đại học — lối vào cho sinh viên + đường cho Google tới từng trang trường.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Phòng trọ, chung cư mini gần các trường đại học Hà Nội',
  description:
    'Tìm phòng trọ gần Bách Khoa, Kinh tế Quốc dân, Ngoại thương, ĐH Quốc gia, Sư phạm, Y Hà Nội… Danh sách phòng trống trong bán kính 3km quanh trường, xếp theo khoảng cách.',
  alternates: { canonical: `${SITE_URL}/phong-tro-gan` },
};

export default async function UniHubPage() {
  const counts = await getUniCounts();
  const unis = SEO_UNIS.map(u => ({ ...u, count: counts.get(u.slug) || 0 })).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-stone-50">
      <PublicNav />
      <main className="pt-16">
        <section className="bg-white border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <nav className="text-xs text-stone-500 mb-4 flex items-center gap-1.5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-brand-600">Trang chủ</Link>
              <span aria-hidden>›</span>
              <span className="text-stone-700 font-medium">Phòng trọ gần trường</span>
            </nav>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-stone-900">
              Phòng trọ, chung cư mini gần trường đại học Hà Nội
            </h1>
            <p className="mt-3 text-stone-600 max-w-3xl leading-relaxed">
              Chọn trường bạn học — MixStay lọc các phòng đang trống trong bán kính {UNI_RADIUS_KM}km quanh trường
              và xếp gần nhất lên đầu, mỗi tin ghi rõ cách trường bao nhiêu km.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unis.map(u => (
              <Link key={u.slug} href={uniPath(u.short)}
                className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-stone-200 px-4 py-3.5 hover:border-brand-400 hover:shadow-sm transition-all">
                <span className="font-medium text-stone-900">🎓 {u.name}</span>
                <span className={`text-sm font-semibold shrink-0 ${u.count ? 'text-brand-600' : 'text-stone-400'}`}>
                  {u.count ? `${u.count} tin` : 'Sắp có'}
                </span>
              </Link>
            ))}
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mt-10 mb-4">Hoặc tìm theo quận</h2>
          <div className="flex flex-wrap gap-2">
            {SEO_DISTRICTS.filter(d => d.inner).map(d => (
              <Link key={d.slug} href={districtPath(d.name)}
                className="text-sm px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:border-brand-400 hover:text-brand-700 transition-colors">
                Phòng trọ {d.name}
              </Link>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/phong" className="btn-primary px-6 py-3 text-sm">Xem toàn bộ phòng mới nhất</Link>
            <Link href="/ban-do"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-brand-600 shadow-md hover:shadow-lg transition-all">
              🗺️ Tìm quanh trường trên bản đồ
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

      <SupportFabs />
    </div>
  );
}
