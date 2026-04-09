'use client';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useDeals, useCompanies } from '@/hooks/useData';
import { SkeletonStats, SkeletonTable } from '@/components/ui/Skeleton';

export default function AdminDealsPage() {
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const { deals, pagination, isLoading: loading, mutate } = useDeals({ page: String(page), limit: '20' });
  const { companies } = useCompanies();

  const handlePageChange = (newPage: number) => { setPage(newPage); };

  const filtered = useMemo(() => {
    return deals.filter(d => {
      if (filterCompany) {
        const companyId = d.room?.property?.companyId;
        if (filterCompany === '__none__' && companyId) return false;
        if (filterCompany !== '__none__' && companyId !== filterCompany) return false;
      }
      if (filterStatus && d.status !== filterStatus) return false;
      return true;
    });
  }, [deals, filterCompany, filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/deals', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    toast.success(`Đã ${status === 'CONFIRMED' ? 'xác nhận' : status === 'PAID' ? 'thanh toán' : 'huỷ'} giao dịch`);
    mutate();
  };

  if (loading) return <div className="p-8"><SkeletonStats count={4} /><div className="mt-6"><SkeletonTable rows={5} cols={6} /></div></div>;

  const activeDeals = filtered.filter(d => d.status === 'CONFIRMED' || d.status === 'PAID');
  const totalCommission = activeDeals.reduce((s, d) => s + d.commissionTotal, 0);
  const companyCommission = activeDeals.reduce((s, d) => s + d.commissionCompany, 0);
  const confirmedCount = activeDeals.length;
  const pendingCount = filtered.filter(d => d.status === 'PENDING').length;

  const statCards = [
    { label: 'Tổng giao dịch', value: filtered.length, icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>), gradient: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50', textColor: 'text-blue-700' },
    { label: 'Đã xác nhận', value: confirmedCount, sub: pendingCount > 0 ? `${pendingCount} chờ duyệt` : undefined, icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>), gradient: 'from-emerald-500 to-emerald-600', bgLight: 'bg-emerald-50', textColor: 'text-emerald-700' },
    { label: 'Tổng hoa hồng', value: formatCurrency(totalCommission), icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>), gradient: 'from-brand-500 to-brand-600', bgLight: 'bg-brand-50', textColor: 'text-brand-700' },
    { label: 'HH Công ty', value: formatCurrency(companyCommission), icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>), gradient: 'from-purple-500 to-purple-600', bgLight: 'bg-purple-50', textColor: 'text-purple-700' },
  ];

  const hasFilters = filterCompany || filterStatus;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-2">Giao dịch & Hoa hồng</h1>
      <p className="text-sm text-stone-500 mb-6">{deals.length} giao dịch</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(s => (
          <div key={s.label} className="card relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.gradient}`} />
            <div className="pt-4 pb-3 px-3 sm:px-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-3">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${s.bgLight} ${s.textColor} flex items-center justify-center`}>{s.icon}</div>
                <p className="text-[10px] sm:text-xs font-medium text-stone-500 uppercase tracking-wide">{s.label}</p>
              </div>
              <p className={`text-lg sm:text-xl font-bold ${s.textColor} truncate`}>{s.value}</p>
              {s.sub && <p className="text-xs text-amber-600 mt-1">{s.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="input-field w-full sm:!w-auto sm:min-w-[160px]">
          <option value="">Tất cả công ty</option>
          <option value="__none__">Chưa gán công ty</option>
          {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-full sm:!w-auto sm:min-w-[140px]">
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="CANCELLED">Đã huỷ</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterCompany(''); setFilterStatus(''); }}
            className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700">Xoá bộ lọc</button>
        )}
        <span className="self-center text-sm text-stone-400 ml-auto">{filtered.length}/{deals.length} giao dịch</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="table-header">Phòng</th>
                <th className="table-header">Công ty</th>
                <th className="table-header">Môi giới</th>
                <th className="table-header">Khách</th>
                <th className="table-header">Giá deal</th>
                <th className="table-header">HH Tổng</th>
                <th className="table-header">HH MG / CT</th>
                <th className="table-header">Trạng thái</th>
                <th className="table-header">Ngày</th>
                <th className="table-header">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((d: any) => {
                const companyName = companies.find((c: any) => c.id === d.room?.property?.companyId)?.name;
                return (
                  <tr key={d.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {d.room?.images && d.room.images.length > 0 ? (
                          <OptimizedImage src={d.room.images[0]} alt={d.room.roomNumber} width={40} height={40} className="w-10 h-10 rounded-lg object-cover border border-stone-200 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-sm flex-shrink-0">🚪</div>
                        )}
                        <div>
                          <p className="font-semibold text-stone-900">{d.room?.roomNumber}</p>
                          <p className="text-xs text-stone-500">{d.room?.property?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      {companyName ? <span className="badge bg-brand-50 text-brand-700 text-[10px]">{companyName}</span> : <span className="text-xs text-stone-400">—</span>}
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-stone-900">{d.broker?.name}</p>
                      <p className="text-xs text-stone-400">{d.broker?.phone}</p>
                    </td>
                    <td className="table-cell">
                      <p className="text-stone-900">{d.customerName || d.customer?.name || '—'}</p>
                      <p className="text-xs text-stone-500">{d.customerPhone || d.customer?.phone || ''}</p>
                    </td>
                    <td className="table-cell font-semibold">{formatCurrency(d.dealPrice)}</td>
                    <td className="table-cell font-semibold text-brand-600">{formatCurrency(d.commissionTotal)}</td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-orange-600">MG: {formatCurrency(d.commissionBroker)}</span>
                        <span className="text-xs font-medium text-purple-600">CT: {formatCurrency(d.commissionCompany)}</span>
                      </div>
                    </td>
                    <td className="table-cell"><span className={`badge ${getStatusColor(d.status)}`}>{getStatusLabel(d.status)}</span></td>
                    <td className="table-cell text-xs text-stone-500">{formatDate(d.dealDate)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {d.status === 'PENDING' && (
                          <>
                            <button onClick={() => updateStatus(d.id, 'CONFIRMED')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Xác nhận
                            </button>
                            <button onClick={() => updateStatus(d.id, 'CANCELLED')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Huỷ</button>
                          </>
                        )}
                        {d.status === 'CONFIRMED' && (
                          <button onClick={() => updateStatus(d.id, 'PAID')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            Đã trả HH
                          </button>
                        )}
                        {d.status === 'PAID' && <span className="text-xs text-stone-400">Hoàn tất</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="table-cell text-center text-stone-400 py-12">
                  {deals.length === 0 ? 'Chưa có giao dịch' : 'Không tìm thấy giao dịch phù hợp'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={handlePageChange} />
      )}
    </div>
  );
}
