'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/layout/PublicNav';
import CallFab from '@/components/ui/CallFab';
import ListingImageMosaic from '@/components/ui/ListingImageMosaic';
import { formatCurrency } from '@/lib/utils';
import { getSavedIds, removeSaved, onSavedChange } from '@/lib/saved-guest';

const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1 ngủ 1 khách',
  '2k1n': '2 ngủ 1 khách', studio: 'Studio', duplex: 'Duplex',
};

type Row = {
  id: string;
  gone?: boolean; // tin đã gỡ/hết hạn — vẫn hiện dòng để khách biết và tự bỏ lưu
  name?: string;
  typeName?: string;
  areaSqm?: number;
  priceMonthly?: number;
  deposit?: number;
  status?: string;
  availableUnits?: number;
  images?: string[];
  videos?: string[];
  videoLinks?: string[];
  amenities?: string[];
  property?: any;
};

/**
 * Trang SO SÁNH các tin khách đã lưu (❤) — KHÔNG cần đăng nhập.
 * Danh sách id nằm trong localStorage; nội dung luôn fetch mới từ API public
 * (kèm ?noview=1 để không thổi phồng lượt xem).
 */
export default function SavedComparePage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const ids = getSavedIds();
    if (ids.length === 0) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const results = await Promise.all(
      ids.map(async (id): Promise<Row> => {
        try {
          const res = await fetch(`/api/rooms/public/${id}?noview=1`);
          if (!res.ok) return { id, gone: true };
          const json = await res.json();
          return { id, ...json.roomType };
        } catch {
          return { id, gone: true };
        }
      })
    );
    setRows(results);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Bỏ lưu ngay trên trang này → chỉ lọc dòng khỏi state, không refetch tất cả
    return onSavedChange(() => {
      const ids = new Set(getSavedIds());
      setRows(prev => (prev ? prev.filter(r => ids.has(r.id)) : prev));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alive = (rows || []).filter(r => !r.gone);
  const perM2 = (r: Row) =>
    r.priceMonthly && r.areaSqm ? Math.round(r.priceMonthly / r.areaSqm / 1000) : null;
  const cheapest = alive.length > 1 ? Math.min(...alive.map(r => r.priceMonthly || Infinity)) : null;

  return (
    <div className="min-h-screen bg-stone-50">
      <PublicNav />
      <main className="pt-16 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">❤ Tin đã lưu</h1>
        <p className="text-sm text-stone-500 mt-1 mb-6">
          Lưu ngay trên máy bạn, không cần tài khoản. Bấm ❤ trên tin bất kỳ để thêm vào đây.
        </p>

        {loading ? (
          <p className="text-stone-400 text-sm py-16 text-center">Đang tải các tin đã lưu…</p>
        ) : !rows || rows.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <p className="text-4xl mb-3">🤍</p>
            <p className="mb-4">Bạn chưa lưu tin nào. Gặp phòng ưng ý, bấm ❤ để lưu lại so sánh.</p>
            <Link href="/phong" className="btn-primary px-6 py-3 text-sm">Xem phòng mới nhất</Link>
          </div>
        ) : (
          <>
            {/* Thẻ tin đã lưu */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {rows.map(r =>
                r.gone ? (
                  <div key={r.id} className="rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-center text-sm text-stone-400">
                    <p className="mb-2">Tin này đã được gỡ hoặc hết hạn.</p>
                    <button onClick={() => removeSaved(r.id)} className="text-red-500 font-medium hover:underline">Bỏ khỏi danh sách</button>
                  </div>
                ) : (
                  <div key={r.id} className="relative group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition-all">
                    <Link href={`/tin/${r.id}`}>
                      <ListingImageMosaic images={[...(r.images || []), ...(r.property?.images || [])].slice(0, 3)} videos={r.videos} videoLinks={r.videoLinks} alt={r.name || ''} className="h-44" />
                    </Link>
                    <button
                      onClick={() => removeSaved(r.id)}
                      title="Bỏ lưu"
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500 text-white text-sm shadow flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                    <Link href={`/tin/${r.id}`} className="block p-4">
                      <h3 className="font-display font-semibold text-stone-900 line-clamp-1">{r.name}</h3>
                      <p className="text-sm text-stone-500 mt-0.5">
                        {[r.property?.district, r.property?.streetName].filter(Boolean).join(' • ')}
                      </p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className={`text-lg font-bold ${cheapest !== null && r.priceMonthly === cheapest ? 'text-emerald-600' : 'text-brand-600'}`}>
                          {formatCurrency(r.priceMonthly)}
                          <span className="text-xs font-normal text-stone-400">/tháng</span>
                        </span>
                        <span className="text-xs text-stone-500">{r.areaSqm}m²</span>
                      </div>
                      {cheapest !== null && r.priceMonthly === cheapest && (
                        <p className="text-[11px] font-semibold text-emerald-600 mt-1">💰 Rẻ nhất trong danh sách</p>
                      )}
                    </Link>
                  </div>
                )
              )}
            </div>

            {/* Bảng so sánh cạnh nhau — chỉ đáng hiện khi có từ 2 tin sống trở lên */}
            {alive.length >= 2 && (
              <>
                <h2 className="font-display text-xl font-bold text-stone-900 mb-4">So sánh chi tiết</h2>
                <div className="card overflow-x-auto p-0">
                  <table className="w-full text-sm" style={{ minWidth: 160 + alive.length * 180 }}>
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="px-4 py-3 text-left text-xs text-stone-500 w-40">Tiêu chí</th>
                        {alive.map(r => (
                          <th key={r.id} className="px-4 py-3 text-left">
                            <Link href={`/tin/${r.id}`} className="font-medium text-stone-800 hover:text-brand-600 line-clamp-2">
                              {r.name}
                            </Link>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="[&_td]:px-4 [&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-stone-50">
                      <tr>
                        <td className="text-stone-500">Giá thuê</td>
                        {alive.map(r => (
                          <td key={r.id} className={`font-semibold ${cheapest !== null && r.priceMonthly === cheapest ? 'text-emerald-600' : 'text-stone-800'}`}>
                            {formatCurrency(r.priceMonthly)}/th
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-stone-500">Giá / m²</td>
                        {alive.map(r => <td key={r.id}>{perM2(r) ? `${perM2(r)}k/m²` : '—'}</td>)}
                      </tr>
                      <tr>
                        <td className="text-stone-500">Diện tích</td>
                        {alive.map(r => <td key={r.id}>{r.areaSqm} m²</td>)}
                      </tr>
                      <tr>
                        <td className="text-stone-500">Đặt cọc</td>
                        {alive.map(r => <td key={r.id}>{r.deposit ? formatCurrency(r.deposit) : '—'}</td>)}
                      </tr>
                      <tr>
                        <td className="text-stone-500">Loại phòng</td>
                        {alive.map(r => <td key={r.id}>{TYPE_LABEL[r.typeName || ''] || r.typeName}</td>)}
                      </tr>
                      <tr>
                        <td className="text-stone-500">Khu vực</td>
                        {alive.map(r => <td key={r.id}>{[r.property?.district, r.property?.streetName].filter(Boolean).join(' • ') || '—'}</td>)}
                      </tr>
                      <tr>
                        <td className="text-stone-500">Còn trống</td>
                        {alive.map(r => (
                          <td key={r.id}>
                            {r.status === 'AVAILABLE' && (r.availableUnits ?? 0) > 0
                              ? `🟢 ${r.availableUnits} phòng`
                              : r.status === 'UPCOMING' ? '🟡 Sắp trống' : '🔴 Hết phòng'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-stone-500">Đỗ ô tô / Thú cưng / Người nước ngoài</td>
                        {alive.map(r => (
                          <td key={r.id}>
                            {[r.property?.parkingCar && '🚗', r.property?.petAllowed && '🐾', r.property?.foreignerOk && '🌍'].filter(Boolean).join(' ') || '—'}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-stone-500">Nội thất</td>
                        {alive.map(r => (
                          <td key={r.id} className="text-xs text-stone-600">{(r.amenities || []).slice(0, 5).join(', ') || '—'}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </main>
      <CallFab stacked={false} />
    </div>
  );
}
