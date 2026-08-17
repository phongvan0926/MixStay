'use client';
import { Fragment, useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency, formatDate } from '@/lib/utils';
import { telHref, zaloHref } from '@/lib/phone';
import { TYPE_LABEL } from '@/lib/seo-locations';
import { appointmentLabel } from '@/lib/appointment';
import FilterChip from '@/components/leads/FilterChip';
import Pagination from '@/components/ui/Pagination';

/**
 * HỒ SƠ KHÁCH — gom mọi dấu vết của một SỐ ĐIỆN THOẠI về một dòng.
 *
 * Đo 16/08/2026: 56 lượt hỏi phòng chỉ đến từ 33 người, có người hỏi tới 5 phòng. Người hỏi
 * 5 phòng là khách nghiêm túc nhất trong kho — nhưng hai tab kia xếp theo TỪNG LƯỢT HỎI lẻ
 * nên admin gọi họ y như gọi người hỏi một lần rồi thôi. Trang này sửa đúng chỗ đó.
 */

const STATUS_META: Record<string, { label: string; cls: string }> = {
  NEW: { label: '🔴 Mới', cls: 'bg-red-50 text-red-700 border-red-200' },
  CONTACTED: { label: '🟡 Đã gọi', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  DONE: { label: '🟢 Đã dẫn xem', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: '⚪ Huỷ', cls: 'bg-stone-100 text-stone-500 border-stone-200' },
};

/** Lịch sử đầy đủ của một khách — chỉ gọi API khi admin thật sự mở ra. */
function CustomerDetail({ phone }: { phone: string }) {
  const { data, isLoading } = useSWR(`/api/customers?phone=${phone}`, fetcher, { revalidateOnFocus: false });
  if (isLoading) return <p className="text-xs text-stone-400 py-3">Đang tải lịch sử…</p>;
  if (!data || data.error) return <p className="text-xs text-stone-400 py-3">Không tải được lịch sử.</p>;

  const s = data.summary;
  return (
    <div className="py-3 space-y-3">
      {/* Tóm tắt để nắm trong 2 giây TRƯỚC khi bấm gọi */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        <span>Khách từ <strong>{formatDate(s.firstAt)}</strong></span>
        {s.districts.length > 0 && <span>Quan tâm: <strong>{s.districts.join(' · ')}</strong></span>}
        {s.minPrice != null && (
          <span>Tầm giá đã hỏi: <strong>
            {formatCurrency(s.minPrice)}{s.maxPrice !== s.minPrice ? ` – ${formatCurrency(s.maxPrice)}` : ''}
          </strong></span>
        )}
      </div>

      {data.requests.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-500 mb-1.5">Đã hỏi {data.requests.length} tin:</p>
          <div className="space-y-1.5">
            {data.requests.map((r: any) => {
              const appt = appointmentLabel(r.preferredDate, r.preferredSlot);
              return (
                <div key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs bg-white rounded-lg border border-stone-200 px-3 py-2">
                  <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_META[r.status]?.cls || ''}`}>
                    {STATUS_META[r.status]?.label || r.status}
                  </span>
                  <a href={`/tin/${r.roomType?.id}`} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-stone-800 hover:text-brand-600 hover:underline">
                    {r.roomType?.listingCode && <span className="font-mono text-brand-700">{r.roomType.listingCode} </span>}
                    {r.roomType?.name || '—'}
                  </a>
                  <span className="text-stone-500">
                    {[r.roomType?.property?.district, r.roomType?.priceMonthly ? formatCurrency(r.roomType.priceMonthly) : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                  {appt && <span className="text-blue-700 font-medium">📅 {appt.text}</span>}
                  <span className="text-stone-400 ml-auto whitespace-nowrap">{formatDate(r.createdAt)}</span>
                  {r.broker?.name && <span className="text-stone-400 w-full">qua CTV {r.broker.name}</span>}
                  {r.note && <span className="text-stone-500 w-full">Ghi chú: {r.note}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.searches.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-500 mb-1.5">Tiêu chí đang săn ({data.searches.length}):</p>
          <div className="space-y-1.5">
            {data.searches.map((s2: any) => (
              <div key={s2.id} className="flex flex-wrap items-baseline gap-x-2 text-xs bg-white rounded-lg border border-stone-200 px-3 py-2">
                <span className={s2.isActive ? 'text-emerald-700 font-medium' : 'text-stone-400'}>
                  {s2.isActive ? '🔔 đang săn' : '⚪ đã tắt'}
                </span>
                <span className="text-stone-700">
                  {[s2.district, s2.typeName ? TYPE_LABEL[s2.typeName] || s2.typeName : '',
                    s2.maxPrice ? `≤ ${formatCurrency(s2.maxPrice)}` : ''].filter(Boolean).join(' · ') || 'Chưa rõ tiêu chí'}
                </span>
                {s2.note && <span className="text-stone-500">— {s2.note}</span>}
                <span className="text-stone-400 ml-auto whitespace-nowrap">{formatDate(s2.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerProfiles() {
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(false);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [openPhone, setOpenPhone] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (pending) params.set('pending', 'true');
  if (q) params.set('q', q);

  const { data, isLoading } = useSWR(`/api/customers?${params.toString()}`, fetcher,
    { revalidateOnFocus: false, keepPreviousData: true });
  const rows: any[] = data?.data || [];
  const counts = data?.counts || {};
  const pagination = data?.pagination;

  return (
    <>
      <p className="text-sm text-stone-500 mb-3">
        Gom theo <strong>số điện thoại</strong>: một khách hỏi 5 phòng là 5 dòng ở hai tab kia,
        nhưng ở đây là <strong>một người</strong> — và là người đáng gọi trước nhất.
      </p>

      <div className="card p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={!pending} count={counts.all} onClick={() => { setPending(false); setPage(1); }}>
            Tất cả khách
          </FilterChip>
          <FilterChip tone="danger" active={pending} count={counts.pending} onClick={() => { setPending(true); setPage(1); }}>
            🔥 Còn việc chưa xử lý
          </FilterChip>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" aria-hidden="true">🔍</span>
          <input value={qInput} onChange={e => setQInput(e.target.value)}
            placeholder="Tìm theo số điện thoại hoặc tên khách…"
            aria-label="Tìm khách" className="input-field pl-9" />
        </div>
      </div>

      {isLoading && !data ? (
        <p className="text-stone-400 text-sm py-10 text-center">Đang tải…</p>
      ) : rows.length === 0 ? (
        <div className="card text-center py-14 text-stone-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>{q || pending ? 'Không có khách nào khớp.' : 'Chưa có khách nào để lại thông tin.'}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-stone-50/80">
              <tr className="border-b border-stone-100">
                <th className="table-header min-w-[180px]">Khách</th>
                <th className="table-header min-w-[130px]">Đã hỏi</th>
                <th className="table-header min-w-[120px]">Còn tồn</th>
                <th className="table-header min-w-[110px]">Lần cuối</th>
                <th className="table-header text-right min-w-[120px]"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <Fragment key={c.phone}>
                  <tr className={`border-b border-stone-50 ${c.pending > 0 ? 'bg-red-50/40' : ''}`}>
                    <td className="table-cell align-top">
                      <p className="font-medium text-stone-800 whitespace-nowrap">{c.name || 'Khách'}</p>
                      <a href={telHref(c.phone) || undefined} className="text-brand-600 font-mono text-xs hover:underline">{c.phone}</a>
                      {zaloHref(c.phone) && (
                        <>{' · '}<a href={zaloHref(c.phone)!} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 text-xs hover:underline">Zalo</a></>
                      )}
                    </td>
                    <td className="table-cell align-top text-xs text-stone-600">
                      {c.requests > 0 && (
                        <p className={c.requests >= 3 ? 'font-semibold text-stone-800' : ''}>
                          {c.requests} tin {c.requests >= 3 && <span className="text-brand-600">· khách sát sao</span>}
                        </p>
                      )}
                      {c.searches > 0 && <p className="text-stone-500">{c.searches} yêu cầu săn phòng</p>}
                    </td>
                    <td className="table-cell align-top text-xs">
                      {c.pending > 0
                        ? <span className="inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">{c.pending} chưa xử lý</span>
                        : <span className="text-stone-400">xong</span>}
                    </td>
                    <td className="table-cell align-top text-xs text-stone-500 whitespace-nowrap">{formatDate(c.lastAt)}</td>
                    <td className="table-cell align-top text-right">
                      <button type="button" onClick={() => setOpenPhone(openPhone === c.phone ? null : c.phone)}
                        className="inline-flex items-center gap-1 min-h-8 px-2.5 rounded-lg text-xs font-medium border border-stone-200 text-stone-600 hover:border-brand-300 hover:text-brand-700 whitespace-nowrap">
                        Xem lịch sử <span className="text-[10px]">{openPhone === c.phone ? '▲' : '▼'}</span>
                      </button>
                    </td>
                  </tr>
                  {openPhone === c.phone && (
                    <tr className="border-b border-stone-100 bg-stone-50/60">
                      <td colSpan={5} className="px-4"><CustomerDetail phone={c.phone} /></td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
        </div>
      )}
    </>
  );
}
