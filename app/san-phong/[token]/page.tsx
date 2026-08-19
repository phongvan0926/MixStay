import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/PublicNav';
import SupportFabs from '@/components/public/SupportFabs';
import ListingCard from '@/components/public/ListingCard';
import CompareBar from '@/components/public/CompareBar';
import { getSavedSearchPageData } from '@/lib/seo-listings';
import { TYPE_LABEL } from '@/lib/seo-locations';

/**
 * TRANG THEO DÕI "SĂN PHÒNG" — khách bấm link trong tin nhắn Zalo là thấy danh sách tin
 * khớp tiêu chí của mình, LUÔN TƯƠI, không cần tài khoản.
 *
 * Vì sao có: vòng "săn phòng" trước đây chỉ khép về phía ADMIN (có tin khớp → báo admin →
 * admin copy gửi Zalo). Khách nhận được MỘT tin nhắn tĩnh; ba hôm sau kho có phòng mới
 * khớp thì tin nhắn cũ không tự dài ra. Trang này là nửa còn lại: gửi link một lần,
 * khách tự quay lại bao nhiêu lần cũng thấy kho mới nhất — 18 khách đang săn là nhóm
 * lead chủ động nhất (tự khai nhu cầu), đáng có đường quay lại riêng.
 *
 * Render ĐỘNG mỗi lượt xem (không ISR): "luôn tươi" chính là lời hứa của trang.
 * Không index: link mang tính cá nhân, mỗi khách một token.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Phòng dành cho bạn',
  robots: { index: false, follow: false },
};

const trieu = (n: number) => `${(n / 1e6).toFixed(1).replace(/\.0$/, '')} triệu`;

function criteriaLabel(c: { district: string | null; typeName: string | null; minPrice: number | null; maxPrice: number | null }) {
  const parts: string[] = [];
  if (c.typeName) parts.push(TYPE_LABEL[c.typeName] || c.typeName);
  if (c.district) parts.push(c.district.split(',').map(d => d.trim()).filter(Boolean).join(', '));
  if (c.minPrice && c.maxPrice) parts.push(`${trieu(c.minPrice)} – ${trieu(c.maxPrice)}/tháng`);
  else if (c.maxPrice) parts.push(`đến ${trieu(c.maxPrice)}/tháng`);
  else if (c.minPrice) parts.push(`từ ${trieu(c.minPrice)}/tháng`);
  return parts.join(' · ');
}

export default async function SavedSearchFollowPage({ params }: { params: { token: string } }) {
  const data = await getSavedSearchPageData(params.token);

  return (
    <div className="min-h-screen bg-stone-50">
      <PublicNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {!data ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔗</p>
            <h1 className="font-display text-xl font-bold text-stone-800">Link không còn hiệu lực</h1>
            <p className="text-stone-500 mt-2 text-sm">Bạn có thể tìm phòng trực tiếp — kho luôn có tin mới mỗi ngày.</p>
            <Link href="/phong" className="btn-primary inline-flex mt-5 px-6 py-2.5">Xem tất cả phòng đang trống</Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <p className="inline-flex items-center gap-2 rounded-full bg-gold-50 border border-gold-200 px-3 py-1 text-xs font-medium text-gold-800 mb-3">
                🎯 Trang săn phòng của riêng bạn
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
                {data.listings.length > 0
                  ? `${data.listings.length} phòng khớp tiêu chí của bạn`
                  : 'Chưa có phòng khớp — chúng tôi vẫn đang săn'}
              </h1>
              {criteriaLabel(data.criteria) && (
                <p className="text-stone-500 mt-2 text-sm">
                  Tiêu chí: <strong className="text-stone-700">{criteriaLabel(data.criteria)}</strong>
                </p>
              )}
              {/* Lời hứa của trang — nói rõ để khách LƯU LINK và quay lại, thay vì xem một lần rồi quên */}
              <p className="text-xs text-stone-400 mt-2">
                Danh sách tự cập nhật khi kho có phòng mới khớp — lưu link này lại, mỗi lần mở là thấy bản mới nhất.
              </p>
            </div>

            {data.listings.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.listings.map(rt => <ListingCard key={rt.id} rt={rt} />)}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">🔎</p>
                <p className="text-stone-500 text-sm max-w-md mx-auto">
                  Ngay khi có phòng đúng ý, phòng sẽ tự hiện ở đây. Trong lúc chờ, bạn có thể nới tiêu chí
                  và xem những phòng đang có:
                </p>
                <Link href="/phong" className="btn-primary inline-flex mt-5 px-6 py-2.5">Xem tất cả phòng đang trống</Link>
              </div>
            )}
          </>
        )}
      </main>
      <CompareBar />
      <SupportFabs />
    </div>
  );
}
