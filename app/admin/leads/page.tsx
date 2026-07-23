'use client';
import { useState } from 'react';
import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency, formatDate } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import toast from 'react-hot-toast';

const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1N1K', '2k1n': '2N1K', studio: 'Studio', duplex: 'Duplex',
};

// Khách "săn phòng" (lead): tiêu chí + SĐT khách để gọi lại. Tin mới duyệt khớp → có notification.
export default function AdminLeadsPage() {
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
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">🔔 Khách săn phòng</h1>
          <p className="text-sm text-stone-500 mt-1">
            Khách để lại tiêu chí + SĐT từ trang tìm phòng. Tin mới được duyệt khớp tiêu chí → bạn nhận thông báo, gọi chào phòng ngay.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
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
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-stone-500 border-b border-stone-100">
                <th className="px-4 py-3">Khách</th>
                <th className="px-4 py-3">Tiêu chí</th>
                <th className="px-4 py-3">Ghi chú</th>
                <th className="px-4 py-3">Đăng ký</th>
                <th className="px-4 py-3">Khớp gần nhất</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any) => (
                <tr key={s.id} className={`border-b border-stone-50 ${s.isActive ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-800">{s.name || 'Khách'}</p>
                    <a href={`tel:${s.phone}`} className="text-brand-600 font-mono text-xs hover:underline">{s.phone}</a>
                    {' · '}
                    <a href={`https://zalo.me/${s.phone}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">Zalo</a>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {[
                      s.district,
                      s.typeName ? TYPE_LABEL[s.typeName] || s.typeName : '',
                      s.minPrice ? `từ ${formatCurrency(s.minPrice)}` : '',
                      s.maxPrice ? `đến ${formatCurrency(s.maxPrice)}` : '',
                    ].filter(Boolean).join(' · ') || <span className="text-stone-400">Mọi phòng</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs max-w-[180px] truncate">{s.note || '—'}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-3 text-xs">
                    {s.lastMatchedAt ? <span className="text-emerald-600 font-medium">🎯 {formatDate(s.lastMatchedAt)}</span> : <span className="text-stone-400">Chưa có</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggle(s.id, !s.isActive)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
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
    </DashboardLayout>
  );
}
