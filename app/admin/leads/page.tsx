'use client';
// ⚠️ KHÔNG bọc <DashboardLayout> ở đây — app/{admin,broker,landlord}/layout.tsx đã bọc rồi.
// Bọc hai lần thì mọi thứ nhân đôi: 2 sidebar, `lg:ml-60` cộng dồn (đẩy nội dung lệch phải
// ~240px), `max-w-7xl mx-auto` + padding cộng dồn, và 2 bộ SWR poll thông báo mỗi 30s.
import { Fragment, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency, formatDate } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import ViewingRequestTable from '@/components/leads/ViewingRequestTable';
import FilterChip from '@/components/leads/FilterChip';
import SavedSearchMatches from '@/components/leads/SavedSearchMatches';
import ViewingSchedule from '@/components/leads/ViewingSchedule';
import CustomerProfiles from '@/components/leads/CustomerProfiles';
import { HANOI_DISTRICTS } from '@/lib/hanoi-locations';
import toast from 'react-hot-toast';
import { telHref, zaloHref } from '@/lib/phone';

const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1N1K', '2k1n': '2N1K', studio: 'Studio', duplex: 'Duplex',
};

// Hai loại lead khách để lại, gộp về một trang:
//  - "Xin xem phòng" (ViewingRequest): khách đã xem ĐÚNG một tin và muốn đi xem → lead nóng nhất.
//  - "Săn phòng" (SavedSearch): khách mới nêu tiêu chí, chưa ưng tin nào.
function AdminLeadsInner() {
  // Thông báo trỏ tới ?tab=xem-phong → đọc bằng useSearchParams (KHÔNG dùng window.location.search:
  // điều hướng nội bộ chưa cập nhật window.location khi component khởi tạo state).
  const searchParams = useSearchParams();
  const initial = searchParams.get('tab');
  const [tab, setTab] = useState<'xem-phong' | 'lich' | 'san-phong' | 'khach'>(
    initial === 'san-phong' ? 'san-phong' : initial === 'lich' ? 'lich'
      : initial === 'khach' ? 'khach' : 'xem-phong'
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">📥 Khách để lại thông tin</h1>
        <p className="text-sm text-stone-500 mt-1">
          Toàn bộ số điện thoại khách để lại trên web — gọi càng sớm càng dễ chốt.
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        {([
          { key: 'xem-phong', label: '📅 Xin xem phòng' },
          { key: 'lich', label: '🗓️ Lịch khách xem phòng' },
          { key: 'san-phong', label: '🔔 Săn phòng' },
          { key: 'khach', label: '👤 Hồ sơ khách' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center min-h-11 px-4 rounded-xl text-sm font-medium border transition-colors ${
              tab === t.key
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-stone-600 border-stone-200 hover:border-brand-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'xem-phong' ? <ViewingRequestsTab />
        : tab === 'lich' ? <ViewingSchedule />
        : tab === 'khach' ? <CustomerProfiles />
        : <SavedSearchesTab />}
    </>
  );
}

// Chip trạng thái. "Chưa xử lý" = NEW + CONTACTED (khách chưa được dẫn xem, chưa huỷ) —
// đây là mặc định khi mở trang: admin vào là thấy ngay việc còn phải làm, không phải tự lọc.
const STATUS_CHIPS = [
  { key: 'PENDING', label: '🔥 Chưa xử lý' },
  { key: 'NEW', label: '🔴 Mới' },
  { key: 'CONTACTED', label: '🟡 Đã gọi' },
  { key: 'DONE', label: '🟢 Đã dẫn xem' },
  { key: 'CANCELLED', label: '⚪ Huỷ' },
  { key: 'ALL', label: 'Tất cả' },
] as const;

function ViewingRequestsTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('PENDING');
  const [overdue, setOverdue] = useState(false);
  const [appt, setAppt] = useState(false); // chỉ khách CÓ HẸN trong hôm nay/ngày mai
  const [broker, setBroker] = useState('');
  const [days, setDays] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  // Gõ tới đâu tìm tới đó, nhưng chờ 350ms cho hết nhịp gõ — tránh bắn 1 request mỗi ký tự.
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  // "Quá 24h chưa gọi" tự nó đã là NEW + quá hạn → không gửi kèm status để khỏi chọi nhau.
  if (overdue) params.set('overdue', 'true');
  else if (status !== 'ALL') params.set('status', status);
  if (appt) params.set('appt', 'today');
  if (q) params.set('q', q);
  if (broker) params.set('broker', broker);
  if (days) params.set('days', days);

  const { data, isLoading, mutate } = useSWR(
    `/api/viewing-requests?${params.toString()}`, fetcher, { revalidateOnFocus: false, keepPreviousData: true }
  );
  const rows = data?.data || [];
  const pagination = data?.pagination;
  const counts = data?.counts || {};

  const filtering = overdue || appt || status !== 'PENDING' || !!q || !!broker || !!days;
  const reset = () => {
    setStatus('PENDING'); setOverdue(false); setAppt(false); setBroker(''); setDays('');
    setQInput(''); setQ(''); setPage(1);
  };
  const pick = (fn: () => void) => { fn(); setPage(1); };

  return (
    <>
      <p className="text-sm text-stone-500 mb-3">
        Khách bấm <strong>“Đặt lịch xem phòng”</strong> ngay trên tin đăng. Cột <strong>Nguồn</strong> cho biết
        lead đến từ link của cộng tác viên nào — dùng để chia hoa hồng.
      </p>

      {/* Thanh lọc — mọi điều kiện gửi lên server, KHÔNG lọc mảng đang hiển thị (xem chú thích
          trong app/api/viewing-requests/route.ts): danh sách có phân trang nên lọc phía client
          sẽ bỏ sót khách nằm ở trang sau. */}
      <div className="card p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map(c => (
            <FilterChip
              key={c.key}
              active={!overdue && status === c.key}
              count={counts[c.key]}
              onClick={() => pick(() => { setOverdue(false); setStatus(c.key); })}
            >
              {c.label}
            </FilterChip>
          ))}
          <span className="w-px bg-stone-200 mx-1 self-stretch" aria-hidden="true" />
          <FilterChip
            tone="danger"
            active={overdue}
            count={counts.OVERDUE}
            onClick={() => pick(() => setOverdue(v => !v))}
          >
            ⏰ Quá 24h chưa gọi
          </FilterChip>
          {/* Khách đã CHỌN giờ hẹn (từ v9.59) — việc phải chạy trong 48h tới, ưu tiên cao
              nhất vì đã hứa với khách một khung giờ cụ thể. */}
          <FilterChip
            active={appt}
            count={counts.APPT}
            onClick={() => pick(() => setAppt(v => !v))}
          >
            📅 Hẹn hôm nay/mai
          </FilterChip>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" aria-hidden="true">🔍</span>
            <input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              placeholder="Tìm theo SĐT, tên khách, tên tin, mã tin…"
              aria-label="Tìm khách"
              className="input-field pl-9"
            />
          </div>
          <select value={broker} onChange={e => pick(() => setBroker(e.target.value))}
            aria-label="Lọc theo nguồn" className="input-field sm:w-52">
            <option value="">Mọi nguồn</option>
            <option value="yes">Qua cộng tác viên</option>
            <option value="no">Khách tự tìm</option>
          </select>
          <select value={days} onChange={e => pick(() => setDays(e.target.value))}
            aria-label="Lọc theo thời gian" className="input-field sm:w-44">
            <option value="">Mọi thời điểm</option>
            <option value="1">Trong 24h</option>
            <option value="7">7 ngày qua</option>
            <option value="30">30 ngày qua</option>
          </select>
          {filtering && (
            <button onClick={reset} className="btn-secondary sm:w-auto whitespace-nowrap">✕ Xoá lọc</button>
          )}
        </div>

        {pagination && (
          <p className="text-xs text-stone-500">
            Đang xem <strong className="text-stone-700">{pagination.total}</strong> khách
            {filtering ? ' khớp bộ lọc' : ' chưa xử lý'}
            {counts.ALL !== undefined && <> · tổng cộng {counts.ALL} khách đã để lại thông tin</>}
          </p>
        )}
      </div>

      {isLoading && !data
        ? <p className="text-stone-400 text-sm py-10 text-center">Đang tải…</p>
        : (
          <ViewingRequestTable
            rows={rows}
            mutate={mutate}
            showBroker
            emptyState={filtering ? (
              <div className="card text-center py-14 text-stone-400">
                <p className="text-4xl mb-3">🔍</p>
                <p>Không có khách nào khớp bộ lọc.</p>
                <button onClick={reset} className="btn-secondary mt-4">Xoá lọc</button>
              </div>
            ) : (
              <div className="card text-center py-14 text-stone-400">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-stone-600 font-medium">Đã xử lý hết khách xin xem phòng.</p>
                <p className="text-xs mt-1">Bấm “Tất cả” để xem lại toàn bộ lịch sử.</p>
              </div>
            )}
          />
        )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4"><Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} /></div>
      )}
    </>
  );
}

function SavedSearchesTab() {
  const [page, setPage] = useState(1);
  const [state, setState] = useState('active');
  const [district, setDistrict] = useState('');
  const [unmatched, setUnmatched] = useState(false);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null); // khách đang mở xem tin khớp

  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const params = new URLSearchParams({ page: String(page), limit: '20', state });
  if (q) params.set('q', q);
  if (district) params.set('district', district);
  if (unmatched) params.set('matched', 'no');

  const { data, isLoading, mutate } = useSWR(
    `/api/saved-searches?${params.toString()}`, fetcher, { revalidateOnFocus: false, keepPreviousData: true }
  );
  const rows = data?.data || [];
  const pagination = data?.pagination;
  const counts = data?.counts || {};

  const filtering = state !== 'active' || !!q || !!district || unmatched;
  const reset = () => { setState('active'); setDistrict(''); setUnmatched(false); setQInput(''); setQ(''); setPage(1); };
  const pick = (fn: () => void) => { fn(); setPage(1); };

  const toggle = async (id: string, isActive: boolean) => {
    const res = await fetch('/api/saved-searches', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive }),
    });
    if (res.ok) { toast.success(isActive ? 'Đã bật lại săn phòng' : 'Đã tắt (khách xong nhu cầu)'); mutate(); }
    else toast.error('Không cập nhật được');
  };

  return (
    <>
      <p className="text-sm text-stone-500 mb-3">
        Khách để lại tiêu chí + SĐT từ trang tìm phòng. Tin mới duyệt khớp tiêu chí → bạn nhận thông báo, gọi chào phòng ngay.
      </p>

      <div className="card p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'active', label: '🔔 Đang săn', count: counts.active },
            { key: 'off', label: '⚪ Đã tắt', count: counts.off },
            { key: 'all', label: 'Tất cả', count: counts.all },
          ] as const).map(c => (
            <FilterChip key={c.key} active={state === c.key} count={c.count}
              onClick={() => pick(() => setState(c.key))}>
              {c.label}
            </FilterChip>
          ))}
          <span className="w-px bg-stone-200 mx-1 self-stretch" aria-hidden="true" />
          {/* Khách chưa từng khớp tin nào = chưa ai chào được phòng cho họ → cần gọi tay trước tiên */}
          <FilterChip tone="danger" active={unmatched} onClick={() => pick(() => setUnmatched(v => !v))}>
            🚫 Chưa khớp tin nào
          </FilterChip>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" aria-hidden="true">🔍</span>
            <input value={qInput} onChange={e => setQInput(e.target.value)}
              placeholder="Tìm theo SĐT, tên khách, ghi chú…" aria-label="Tìm khách"
              className="input-field pl-9" />
          </div>
          <select value={district} onChange={e => pick(() => setDistrict(e.target.value))}
            aria-label="Lọc theo quận" className="input-field sm:w-56">
            <option value="">Mọi quận</option>
            {HANOI_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {filtering && <button onClick={reset} className="btn-secondary sm:w-auto whitespace-nowrap">✕ Xoá lọc</button>}
        </div>

        {pagination && (
          <p className="text-xs text-stone-500">
            Đang xem <strong className="text-stone-700">{pagination.total}</strong> khách
            {counts.all !== undefined && <> · tổng cộng {counts.all} khách săn phòng</>}
          </p>
        )}
      </div>

      {isLoading && !data ? (
        <p className="text-stone-400 text-sm py-10 text-center">Đang tải…</p>
      ) : rows.length === 0 ? (
        <div className="card text-center py-14 text-stone-400">
          <p className="text-4xl mb-3">{filtering ? '🔍' : '📭'}</p>
          <p>{filtering ? 'Không có khách nào khớp bộ lọc.' : 'Chưa có khách săn phòng nào.'}</p>
          {filtering && <button onClick={reset} className="btn-secondary mt-4">Xoá lọc</button>}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm min-w-[850px]">
            {/* Lớp bảng chuẩn giống mọi module quản trị khác — xem app/globals.css */}
            <thead className="bg-stone-50/80">
              <tr className="border-b border-stone-100">
                <th className="table-header min-w-[150px]">Khách</th>
                <th className="table-header min-w-[200px]">Tiêu chí</th>
                <th className="table-header min-w-[130px]">Ghi chú</th>
                <th className="table-header min-w-[100px]">Đăng ký</th>
                <th className="table-header min-w-[140px]">Kho có hàng?</th>
                <th className="table-header text-right min-w-[150px]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any) => (
                <Fragment key={s.id}>
                <tr className={`border-b border-stone-50 ${s.isActive ? '' : 'opacity-50'}`}>
                  <td className="table-cell align-top">
                    <p className="font-medium text-stone-800 whitespace-nowrap">{s.name || 'Khách'}</p>
                    <a href={telHref(s.phone) || undefined} className="text-brand-600 font-mono text-xs hover:underline">{s.phone}</a>
                    {' · '}
                    {zaloHref(s.phone) && <a href={zaloHref(s.phone)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">Zalo</a>}
                  </td>
                  <td className="table-cell align-top text-stone-600">
                    {[
                      s.district,
                      s.typeName ? TYPE_LABEL[s.typeName] || s.typeName : '',
                      s.minPrice ? `từ ${formatCurrency(s.minPrice)}` : '',
                      s.maxPrice ? `đến ${formatCurrency(s.maxPrice)}` : '',
                    ].filter(Boolean).join(' · ') || <span className="text-stone-400">Mọi phòng</span>}
                  </td>
                  <td className="table-cell align-top text-stone-500 text-xs max-w-[180px] truncate">{s.note || '—'}</td>
                  <td className="table-cell align-top text-stone-500 text-xs whitespace-nowrap">{formatDate(s.createdAt)}</td>
                  {/* "Kho có hàng?" — trả lời đúng câu hỏi admin cần: gọi khách này thì có gì
                      để chào. Trước đây cột này chỉ ghi ngày khớp gần nhất, không cho biết
                      HIỆN GIỜ còn tin nào. */}
                  <td className="table-cell align-top text-xs whitespace-nowrap">
                    {s.matchCount > 0 ? (
                      <button type="button" onClick={() => setOpenId(openId === s.id ? null : s.id)}
                        className="inline-flex items-center gap-1 min-h-8 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold hover:border-emerald-400">
                        🎯 {s.matchCount} tin khớp <span className="text-[10px]">{openId === s.id ? '▲' : '▼'}</span>
                      </button>
                    ) : (s.district || s.typeName || s.minPrice || s.maxPrice) ? (
                      <span className="text-stone-400">Kho chưa có</span>
                    ) : (
                      // Khách bỏ trống hết tiêu chí → không khớp tự động được, phải gọi hỏi
                      <span className="text-amber-600">Chưa rõ tiêu chí — gọi hỏi</span>
                    )}
                    {s.lastMatchedAt && <p className="text-stone-400 mt-1">Báo lúc {formatDate(s.lastMatchedAt)}</p>}
                  </td>
                  <td className="table-cell align-top text-right">
                    <button onClick={() => toggle(s.id, !s.isActive)}
                      className={`inline-flex items-center px-3 py-1.5 min-h-8 rounded-lg text-xs font-medium border transition-colors ${
                        s.isActive
                          ? 'border-stone-200 text-stone-600 hover:border-red-300 hover:text-red-600'
                          : 'border-stone-200 text-stone-500 hover:border-emerald-300 hover:text-emerald-600'
                      }`}>
                      {s.isActive ? 'Tắt (xong nhu cầu)' : 'Bật lại'}
                    </button>
                  </td>
                </tr>
                {openId === s.id && (
                  <tr className="border-b border-stone-100 bg-stone-50/60">
                    <td colSpan={6} className="px-4">
                      <SavedSearchMatches searchId={s.id} open />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4"><Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} /></div>
      )}
    </>
  );
}

export default function AdminLeadsPage() {
  return (
    <Suspense fallback={<p className="text-stone-400 text-sm py-10 text-center">Đang tải…</p>}>
      <AdminLeadsInner />
    </Suspense>
  );
}
