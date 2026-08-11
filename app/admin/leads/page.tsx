'use client';
// ⚠️ KHÔNG bọc <DashboardLayout> ở đây — app/{admin,broker,landlord}/layout.tsx đã bọc rồi.
// Bọc hai lần thì mọi thứ nhân đôi: 2 sidebar, `lg:ml-60` cộng dồn (đẩy nội dung lệch phải
// ~240px), `max-w-7xl mx-auto` + padding cộng dồn, và 2 bộ SWR poll thông báo mỗi 30s.
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency, formatDate } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import ViewingRequestTable from '@/components/leads/ViewingRequestTable';
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
  const [tab, setTab] = useState<'xem-phong' | 'san-phong'>(
    searchParams.get('tab') === 'san-phong' ? 'san-phong' : 'xem-phong'
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
          { key: 'san-phong', label: '🔔 Săn phòng' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === t.key
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-stone-600 border-stone-200 hover:border-brand-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'xem-phong' ? <ViewingRequestsTab /> : <SavedSearchesTab />}
    </>
  );
}

function ViewingRequestsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading, mutate } = useSWR(
    `/api/viewing-requests?page=${page}&limit=20`, fetcher, { revalidateOnFocus: false }
  );
  const rows = data?.data || [];
  const pagination = data?.pagination;

  return (
    <>
      <p className="text-sm text-stone-500 mb-3">
        Khách bấm <strong>“Đặt lịch xem phòng”</strong> ngay trên tin đăng. Cột <strong>Nguồn</strong> cho biết
        lead đến từ link của cộng tác viên nào — dùng để chia hoa hồng.
      </p>
      {isLoading
        ? <p className="text-stone-400 text-sm py-10 text-center">Đang tải…</p>
        : <ViewingRequestTable rows={rows} mutate={mutate} showBroker />}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4"><Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} /></div>
      )}
    </>
  );
}

function SavedSearchesTab() {
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, mutate } = useSWR(
    `/api/saved-searches?page=${page}&limit=20${showAll ? '&active=false' : ''}`,
    fetcher, { revalidateOnFocus: false }
  );
  const rows = data?.data || [];
  const pagination = data?.pagination;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <p className="text-sm text-stone-500">
          Khách để lại tiêu chí + SĐT từ trang tìm phòng. Tin mới duyệt khớp tiêu chí → bạn nhận thông báo, gọi chào phòng ngay.
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-stone-600 cursor-pointer shrink-0">
          <input type="checkbox" checked={showAll} onChange={e => { setShowAll(e.target.checked); setPage(1); }} className="rounded" />
          Hiện cả yêu cầu đã tắt
        </label>
      </div>

      {isLoading ? (
        <p className="text-stone-400 text-sm py-10 text-center">Đang tải…</p>
      ) : rows.length === 0 ? (
        <div className="card text-center py-14 text-stone-400">
          <p className="text-4xl mb-3">📭</p>
          <p>Chưa có khách săn phòng nào.</p>
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
                <th className="table-header min-w-[120px]">Khớp gần nhất</th>
                <th className="table-header text-right min-w-[150px]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any) => (
                <tr key={s.id} className={`border-b border-stone-50 ${s.isActive ? '' : 'opacity-50'}`}>
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
                  <td className="table-cell align-top text-xs whitespace-nowrap">
                    {s.lastMatchedAt ? <span className="text-emerald-600 font-medium">🎯 {formatDate(s.lastMatchedAt)}</span> : <span className="text-stone-400">Chưa có</span>}
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
