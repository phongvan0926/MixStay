import Link from 'next/link';
import ListingImageMosaic from '@/components/ui/ListingImageMosaic';
import { formatCurrency } from '@/lib/utils';
import { TYPE_LABEL } from '@/lib/seo-locations';
import type { ListingCardData } from '@/lib/seo-listings';
import SaveHeart from '@/components/public/SaveHeart';

/**
 * Thẻ tin đăng render SẴN PHÍA SERVER — dùng cho các trang đích SEO.
 *
 * Khác với thẻ trong PublicSearch (client, chỉ có sau khi fetch xong): thẻ này nằm thẳng
 * trong HTML trả về nên Google đọc được nội dung + link tới /tin/[id] mà không cần chạy JS.
 */
export default function ListingCard({ rt, uniShort }: { rt: ListingCardData; uniShort?: string }) {
  const p = rt.property;
  const hasVideo = (rt.videos?.length || 0) + (rt.videoLinks?.length || 0) > 0;
  const hasFlags = p?.parkingCar || p?.parkingBike || p?.evCharging || p?.petAllowed || p?.foreignerOk || rt.shortTermAllowed;

  return (
    <Link
      href={`/tin/${rt.id}`}
      className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 hover:border-stone-300 transition-all"
    >
      <div className="relative">
        <ListingImageMosaic images={rt.images} videos={rt.videos} videoLinks={rt.videoLinks} alt={rt.name} className="h-48" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-stone-700 border border-white">
            {TYPE_LABEL[rt.typeName] || rt.typeName}
          </span>
          {hasVideo && (
            <span title="Có video" className="inline-flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] w-6 h-6 shadow">
              🎬
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <SaveHeart id={rt.id} />
          {rt.status === 'UPCOMING' ? (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
              🟡 Sắp trống{rt.expectedAvailableDate ? ` ${new Date(rt.expectedAvailableDate).toLocaleDateString('vi-VN')}` : ''}
            </span>
          ) : rt.availableUnits > 0 ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
              Còn {rt.availableUnits} phòng
            </span>
          ) : (
            // Không bao giờ in "Còn 0 phòng" — dữ liệu lệch thì nói thẳng là hết
            <span className="inline-flex items-center rounded-full bg-stone-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
              🔴 Hết phòng
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-display font-semibold text-base text-stone-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
          {rt.name}
        </h3>
        <p className="text-sm text-stone-500 mt-0.5 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {p?.district || '—'}{p?.streetName ? ` • ${p.streetName}` : ''}
        </p>
        {rt.distanceKm != null && (
          <p className="text-xs font-medium text-violet-600 mt-1">🎓 Cách {uniShort || 'trường'} ~{rt.distanceKm}km</p>
        )}

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="text-xl font-bold text-brand-600">
            {formatCurrency(rt.priceMonthly)}
            <span className="text-xs font-normal text-stone-400">/tháng</span>
          </span>
          <span className="text-xs text-stone-500">{rt.areaSqm}m²</span>
        </div>

        {hasFlags && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {p?.parkingCar && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🚗 Ô tô đỗ cửa</span>}
            {p?.parkingBike && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🏍️ Để xe máy</span>}
            {p?.evCharging && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">⚡ Sạc xe điện</span>}
            {p?.petAllowed && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🐾 Thú cưng OK</span>}
            {p?.foreignerOk && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🌍 Người nước ngoài</span>}
            {rt.shortTermAllowed && <span className="text-[11px] bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">📅 Ngắn hạn</span>}
          </div>
        )}

        <div className="mt-3 text-center text-xs font-medium text-brand-600 group-hover:underline">
          Xem chi tiết phòng →
        </div>
      </div>
    </Link>
  );
}
