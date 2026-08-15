'use client';
import { useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/lib/utils';
import { telHref, zaloHref } from '@/lib/phone';
import { SLOT_LABEL, clockOf, daysUntil } from '@/lib/appointment';
import FilterChip from '@/components/leads/FilterChip';

/**
 * LỊCH KHÁCH XEM PHÒNG — danh sách các cuộc hẹn sắp tới, gần nhất trước.
 *
 * Khác hai tab kia: "Xin xem phòng" xếp theo lúc khách GỬI form (ai mới để lại SĐT), còn
 * trang này xếp theo GIỜ ĐI XEM — thứ tự mà người dẫn khách thật sự chạy trong ngày.
 * Chỉ hiện khách ĐÃ chọn giờ; khách chưa hẹn thì vẫn nằm ở tab "Xin xem phòng".
 *
 * Việc chính ở đây: copy lịch một ngày → dán Zalo cho người dẫn khách → bấm "Đã giao".
 */

/** "Hôm nay · Thứ 6 15/08" — tiêu đề nhóm ngày. */
function dayHeading(date: string | Date) {
  const d = new Date(date);
  const diff = daysUntil(d);
  const dow = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
  const dm = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rel = diff === 0 ? 'Hôm nay' : diff === 1 ? 'Ngày mai' : diff === 2 ? 'Ngày kia' : '';
  return { label: rel ? `${rel} · ${dow} ${dm}` : `${dow} ${dm}`, urgent: diff <= 1, key: dm };
}

/** Giờ hiển thị: khách chọn buổi thì in "sáng", chọn giờ cụ thể thì in "14:30". */
function timeText(r: any) {
  return r.preferredSlot ? SLOT_LABEL[r.preferredSlot] || r.preferredSlot : clockOf(r.preferredDate);
}

export default function ViewingSchedule() {
  const [guide, setGuide] = useState(''); // '' tất cả | 'no' chưa giao | 'yes' đã giao
  const params = new URLSearchParams({ view: 'schedule', limit: '100' });
  if (guide) params.set('guide', guide);

  const { data, isLoading, mutate } = useSWR(
    `/api/viewing-requests?${params.toString()}`, fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );
  const rows: any[] = data?.data || [];
  const counts = data?.counts || {};
  // API kẹp limit ở 100. Nói thẳng khi bị cắt — im lặng thì admin tưởng đã xem hết lịch.
  const truncated = (data?.pagination?.total || 0) > rows.length;

  const setGuideSent = async (id: string, sent: boolean) => {
    const res = await fetch('/api/viewing-requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, guideSent: sent }),
    });
    if (res.ok) { toast.success(sent ? 'Đã đánh dấu có người dẫn' : 'Đã bỏ đánh dấu'); mutate(); }
    else toast.error('Không cập nhật được');
  };

  /**
   * Soạn lịch để dán Zalo cho người dẫn khách. Địa chỉ dùng bản ĐẦY ĐỦ (fullAddress) —
   * người dẫn phải tới tận nơi, bản che số nhà cho khách thì không đi được.
   */
  const copyForGuide = async (list: any[], title: string) => {
    const lines = list.map((r, i) => {
      const p = r.roomType?.property;
      return [
        `${i + 1}. ${timeText(r)} — ${r.name || 'Khách'} ${r.phone}`,
        `   ${r.roomType?.listingCode || ''} ${r.roomType?.name || ''}`.trimEnd(),
        `   📍 ${p?.fullAddress || [p?.streetName, p?.district].filter(Boolean).join(', ') || 'chưa có địa chỉ'}`,
        p?.zaloPhone ? `   ☎ Chủ nhà: ${p.zaloPhone}` : '',
        r.note ? `   Ghi chú: ${r.note}` : '',
      ].filter(Boolean).join('\n');
    });
    const text = `LỊCH DẪN KHÁCH XEM PHÒNG — ${title}\n\n${lines.join('\n\n')}\n\nTổng ${list.length} lượt. Nhờ anh/chị nhận lịch giúp em nhé!`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Đã copy ${list.length} lịch — dán vào Zalo gửi người dẫn`);
    } catch { toast.error('Không copy được'); }
  };

  if (isLoading && !data) return <p className="text-stone-400 text-sm py-10 text-center">Đang tải lịch…</p>;

  // Gom theo NGÀY để người dẫn khách nhận từng buổi một, không phải cả tuần lẫn lộn.
  const groups: { head: ReturnType<typeof dayHeading>; items: any[] }[] = [];
  for (const r of rows) {
    const head = dayHeading(r.preferredDate);
    const last = groups[groups.length - 1];
    if (last && last.head.key === head.key) last.items.push(r);
    else groups.push({ head, items: [r] });
  }

  return (
    <>
      <p className="text-sm text-stone-500 mb-3">
        Các cuộc hẹn <strong>sắp tới</strong>, xếp theo giờ đi xem. Copy lịch từng ngày gửi Zalo cho
        người dẫn khách, gửi xong bấm <strong>“Đã giao”</strong> để khỏi giao trùng.
      </p>

      <div className="card p-3 sm:p-4 mb-4 flex flex-wrap gap-2">
        <FilterChip active={guide === ''} count={counts.SCHEDULE} onClick={() => setGuide('')}>
          Tất cả lịch
        </FilterChip>
        <FilterChip tone="danger" active={guide === 'no'} count={counts.SCHEDULE_PENDING} onClick={() => setGuide('no')}>
          ⚠️ Chưa có người dẫn
        </FilterChip>
        <FilterChip active={guide === 'yes'} count={counts.SCHEDULE_SENT} onClick={() => setGuide('yes')}>
          ✅ Đã giao
        </FilterChip>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center py-14 text-stone-400">
          <p className="text-4xl mb-3">📅</p>
          <p>{guide ? 'Không có lịch nào ở mục này.' : 'Chưa có khách nào hẹn giờ xem phòng.'}</p>
          <p className="text-xs mt-1">Khách chọn ngày + giờ trong ô “Đặt lịch xem phòng” sẽ hiện ở đây.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {truncated && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Đang hiện {rows.length} lịch gần nhất trong tổng số {data.pagination.total}. Lịch xa hơn
              sẽ hiện dần khi các lịch trước được xử lý xong.
            </p>
          )}
          {groups.map(g => (
            <div key={g.head.key} className="card p-0 overflow-hidden">
              <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b ${
                g.head.urgent ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-100'
              }`}>
                <p className={`font-display font-semibold text-sm ${g.head.urgent ? 'text-amber-900' : 'text-stone-700'}`}>
                  {g.head.label} <span className="font-normal text-stone-500">· {g.items.length} lượt xem phòng</span>
                </p>
                <button type="button" onClick={() => copyForGuide(g.items, g.head.label)}
                  className="inline-flex items-center min-h-9 px-3 rounded-lg text-xs font-medium border border-brand-200 bg-brand-50 text-brand-700 hover:border-brand-400 whitespace-nowrap">
                  📋 Copy gửi người dẫn
                </button>
              </div>

              <div className="divide-y divide-stone-50">
                {g.items.map(r => {
                  const p = r.roomType?.property;
                  return (
                    <div key={r.id} className={`flex flex-wrap items-start gap-3 px-4 py-3 ${r.guideSentAt ? 'bg-emerald-50/40' : ''}`}>
                      {/* Giờ đứng đầu dòng — người dẫn đọc lịch là đọc theo giờ */}
                      <span className={`font-display font-bold text-base w-16 shrink-0 ${g.head.urgent ? 'text-amber-700' : 'text-stone-700'}`}>
                        {timeText(r)}
                      </span>

                      <div className="flex-1 min-w-[200px]">
                        <p className="text-sm font-medium text-stone-800">
                          {r.name || 'Khách'}{' '}
                          <a href={telHref(r.phone) || undefined} className="text-brand-600 font-mono text-xs hover:underline">{r.phone}</a>
                          {zaloHref(r.phone) && (
                            <>{' · '}<a href={zaloHref(r.phone)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">Zalo</a></>
                          )}
                        </p>
                        <a href={`/tin/${r.roomType?.id}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-stone-600 hover:text-brand-600 hover:underline">
                          {r.roomType?.listingCode ? <span className="font-mono text-brand-700">{r.roomType.listingCode} </span> : null}
                          {r.roomType?.name}
                          {r.roomType?.priceMonthly ? <span className="text-stone-400"> · {formatCurrency(r.roomType.priceMonthly)}</span> : null}
                        </a>
                        {/* Địa chỉ ĐẦY ĐỦ — người dẫn khách cần tới tận nơi */}
                        <p className="text-xs text-stone-500 mt-0.5">
                          📍 {p?.fullAddress || [p?.streetName, p?.district].filter(Boolean).join(', ') || '—'}
                        </p>
                        {r.note && <p className="text-xs text-stone-400 mt-0.5">Ghi chú: {r.note}</p>}
                      </div>

                      <button type="button" onClick={() => setGuideSent(r.id, !r.guideSentAt)}
                        className={`inline-flex items-center min-h-9 px-3 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                          r.guideSentAt
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:border-emerald-400'
                            : 'bg-white border-stone-200 text-stone-600 hover:border-brand-300 hover:text-brand-700'
                        }`}>
                        {r.guideSentAt ? '✅ Đã giao' : 'Đánh dấu đã giao'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
