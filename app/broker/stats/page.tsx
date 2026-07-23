'use client';
import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/lib/utils';

// Thống kê cá nhân CTV: hoa hồng, hạng tháng, chuỗi 6 tháng, hiệu quả link chia sẻ.
export default function BrokerStatsPage() {
  const { data, isLoading } = useSWR('/api/broker/stats', fetcher, { revalidateOnFocus: false });

  const rankBadge = (rank: number | null) => {
    if (!rank) return '—';
    if (rank === 1) return '🥇 #1';
    if (rank === 2) return '🥈 #2';
    if (rank === 3) return '🥉 #3';
    return `#${rank}`;
  };

  const maxCommission = Math.max(1, ...(data?.months || []).map((m: any) => m.commission));

  return (
    <DashboardLayout>
      <h1 className="font-display text-2xl font-bold mb-1">📈 Thống kê của tôi</h1>
      <p className="text-sm text-stone-500 mb-6">Hoa hồng, thứ hạng và hiệu quả chia sẻ — cập nhật theo thời gian thực.</p>

      {isLoading || !data ? (
        <p className="text-stone-400 text-sm py-10 text-center">Đang tải…</p>
      ) : (
        <>
          {/* Thẻ số liệu chính */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <p className="text-xs text-stone-500">Hoa hồng đã chốt (tổng)</p>
              <p className="text-xl font-bold text-brand-600 mt-1">{formatCurrency(data.totalCommissionDone)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-stone-500">Hạng tháng này</p>
              <p className="text-xl font-bold text-stone-800 mt-1">
                {rankBadge(data.thisMonth.rank)}
                {data.thisMonth.totalBrokers > 0 && <span className="text-xs font-normal text-stone-400"> /{data.thisMonth.totalBrokers} CTV có deal</span>}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-stone-500">Deal + hoa hồng tháng này</p>
              <p className="text-xl font-bold text-stone-800 mt-1">
                {data.thisMonth.count} <span className="text-sm font-semibold text-brand-600">· {formatCurrency(data.thisMonth.commission)}</span>
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs text-stone-500">Link chia sẻ · lượt xem</p>
              <p className="text-xl font-bold text-stone-800 mt-1">
                {data.shareLinks.count} <span className="text-sm font-semibold text-violet-600">· {data.shareLinks.views} views</span>
              </p>
            </div>
          </div>

          {/* Biểu đồ cột hoa hồng 6 tháng (thuần CSS, không cần thư viện) */}
          <div className="card mb-6">
            <h2 className="font-display font-semibold text-lg mb-4">Hoa hồng 6 tháng gần nhất</h2>
            <div className="flex items-end gap-3 h-40">
              {data.months.map((m: any) => (
                <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full">
                  <p className="text-[10px] font-semibold text-brand-700 mb-1">
                    {m.commission > 0 ? formatCurrency(m.commission).replace('₫', '') : ''}
                  </p>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
                    style={{ height: `${Math.max(m.commission / maxCommission * 100, m.commission > 0 ? 8 : 2)}%` }}
                  />
                  <p className="text-xs text-stone-500 mt-1.5">{m.label}</p>
                  <p className="text-[10px] text-stone-400">{m.count} deal</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trạng thái deal */}
          <div className="card">
            <h2 className="font-display font-semibold text-lg mb-3">Giao dịch theo trạng thái</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'PENDING', label: '⏳ Chờ xác nhận', cls: 'text-amber-600' },
                { key: 'CONFIRMED', label: '✅ Đã xác nhận', cls: 'text-emerald-600' },
                { key: 'PAID', label: '💰 Đã thanh toán', cls: 'text-brand-600' },
                { key: 'CANCELLED', label: '❌ Đã hủy', cls: 'text-stone-400' },
              ].map(s => (
                <div key={s.key} className="rounded-xl border border-stone-100 p-3 text-center">
                  <p className="text-xs text-stone-500">{s.label}</p>
                  <p className={`text-lg font-bold mt-1 ${s.cls}`}>{data.byStatus[s.key]?.count || 0}</p>
                  {(s.key === 'CONFIRMED' || s.key === 'PAID') && (
                    <p className="text-[11px] text-stone-400">{formatCurrency(data.byStatus[s.key]?.commission || 0)}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-4">
              💡 Hạng tính theo hoa hồng đã chốt (CONFIRMED + PAID) trong tháng — chỉ bạn thấy số liệu của mình.
            </p>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
