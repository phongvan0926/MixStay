import Link from 'next/link';
import { SEO_DISTRICTS, SEO_UNIS, districtPath, uniPath } from '@/lib/seo-locations';

/**
 * Khối liên kết nội bộ đặt ở chân mọi trang công khai.
 *
 * Hai việc cùng lúc: (1) khách lười gõ bộ lọc thì bấm thẳng khu vực/trường của mình,
 * (2) cho Google đường đi tới toàn bộ trang đích — không có link nội bộ thì trang đích
 * dù có tồn tại cũng gần như không được thu thập.
 */
export default function SeoLinks({ dark = false }: { dark?: boolean }) {
  const linkCls = dark
    ? 'text-stone-300 hover:text-white transition-colors'
    : 'text-stone-600 hover:text-brand-600 transition-colors';
  const headCls = dark ? 'text-white' : 'text-stone-900';
  const sepCls = dark ? 'text-white/25' : 'text-stone-300';

  const inner = SEO_DISTRICTS.filter(d => d.inner);

  return (
    <div className="grid sm:grid-cols-2 gap-8">
      <div>
        <h3 className={`font-display font-semibold mb-3 ${headCls}`}>Thuê phòng trọ theo quận</h3>
        <p className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
          {inner.map((d, i) => (
            <span key={d.slug} className="inline-flex items-center gap-3">
              <Link href={districtPath(d.name)} className={linkCls}>Phòng trọ {d.name}</Link>
              {i < inner.length - 1 && <span className={sepCls} aria-hidden>·</span>}
            </span>
          ))}
        </p>
      </div>
      <div>
        <h3 className={`font-display font-semibold mb-3 ${headCls}`}>Phòng trọ gần trường đại học</h3>
        <p className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
          {SEO_UNIS.map((u, i) => (
            <span key={u.slug} className="inline-flex items-center gap-3">
              <Link href={uniPath(u.short)} className={linkCls}>Gần {u.name.replace(/^(ĐH|Học viện)\s*/, '')}</Link>
              {i < SEO_UNIS.length - 1 && <span className={sepCls} aria-hidden>·</span>}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
