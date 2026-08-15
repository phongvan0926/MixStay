'use client';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/lib/utils';
import { TYPE_LABEL } from '@/lib/seo-locations';
import toast from 'react-hot-toast';

/**
 * Danh sách tin trong kho KHỚP tiêu chí của một khách đang săn phòng.
 *
 * Mở ngay dưới dòng của khách đó ở /admin/leads để admin vừa nhìn số điện thoại vừa đọc mã
 * tin cho khách qua điện thoại — không phải mở tab khác rồi gõ lại bộ lọc bằng tay.
 * Chỉ fetch khi admin thật sự bấm mở (SWR key = null khi đóng).
 */
export default function SavedSearchMatches({ searchId, open }: { searchId: string; open: boolean }) {
  const { data, isLoading } = useSWR(
    open ? `/api/saved-searches?matchesFor=${searchId}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const rows = data?.data || [];

  if (!open) return null;
  if (isLoading) return <p className="text-xs text-stone-400 py-3">Đang tìm tin khớp…</p>;
  if (!rows.length) return <p className="text-xs text-stone-400 py-3">Kho chưa có tin nào khớp tiêu chí này.</p>;

  const copyCodes = async () => {
    const text = rows.map((r: any) =>
      `${r.listingCode || ''} — ${formatCurrency(r.priceMonthly)} — ${r.property?.district || ''}`).join('\n');
    try { await navigator.clipboard.writeText(text); toast.success('Đã copy danh sách mã tin'); }
    catch { toast.error('Không copy được'); }
  };

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-stone-600">{rows.length} tin khớp — đọc mã cho khách:</p>
        <button type="button" onClick={copyCodes}
          className="inline-flex items-center min-h-8 px-2.5 rounded-lg text-xs border border-stone-200 text-stone-600 hover:border-brand-300 hover:text-brand-700">
          📋 Copy danh sách
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((r: any) => (
          <a key={r.id} href={`/tin/${r.id}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex flex-col gap-0.5 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:border-brand-300 transition-colors max-w-[240px]">
            <span className="font-mono text-[11px] text-brand-700 font-semibold">{r.listingCode || '—'}</span>
            <span className="text-xs text-stone-700 font-medium">{formatCurrency(r.priceMonthly)}
              {r.areaSqm ? <span className="text-stone-400 font-normal"> · {r.areaSqm}m²</span> : null}
            </span>
            <span className="text-[11px] text-stone-500 truncate">
              {[r.property?.district, r.typeName ? TYPE_LABEL[r.typeName] || r.typeName : ''].filter(Boolean).join(' · ')}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
