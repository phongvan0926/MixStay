'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useDeals, useRoomTypes } from '@/hooks/useData';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';

export default function BrokerDealsPage() {
  const [page, setPage] = useState(1);

  const { deals, pagination, isLoading: loading, mutate } = useDeals({ page: String(page), limit: '20' });
  const { roomTypes: rooms } = useRoomTypes({ available: 'true', limit: '200' });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    roomTypeId: '', dealPrice: '', commissionTotal: '', customerName: '', customerPhone: '', notes: '',
  });

  const handlePageChange = (newPage: number) => { setPage(newPage); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success('Đã gửi deal! Chờ Admin xác nhận.');
      setShowForm(false);
      setForm({ roomTypeId: '', dealPrice: '', commissionTotal: '', customerName: '', customerPhone: '', notes: '' });
      mutate();
    }
  };

  if (loading) return <div className="p-8"><SkeletonStats count={3} /><div className="mt-6"><SkeletonList count={4} /></div></div>;

  const myCommission = deals
    .filter(d => d.status === 'CONFIRMED' || d.status === 'PAID')
    .reduce((s, d) => s + d.commissionBroker, 0);

  const pendingDeals = deals.filter(d => d.status === 'PENDING').length;
  const confirmedDeals = deals.filter(d => d.status === 'CONFIRMED' || d.status === 'PAID').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Giao dịch của tôi</h1>
          <p className="text-sm text-stone-500 mt-1">
            {deals.length} deal • Hoa hồng: <span className="font-bold text-brand-600">{formatCurrency(myCommission)}</span>
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary w-full sm:w-auto">
          {showForm ? 'Đóng' : '+ Báo deal mới'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <p className="text-xs font-medium text-stone-500 uppercase">Tổng deal</p>
          </div>
          <p className="text-xl font-bold mt-1">{deals.length}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <p className="text-xs font-medium text-stone-500 uppercase">Chờ duyệt</p>
          </div>
          <p className="text-xl font-bold mt-1 text-amber-600">{pendingDeals}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <p className="text-xs font-medium text-stone-500 uppercase">Hoa hồng</p>
          </div>
          <p className="text-xl font-bold mt-1 text-brand-600">{formatCurrency(myCommission)}</p>
        </div>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-display font-semibold text-lg mb-4">Báo deal thành công</h2>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Phòng *</label>
              <select className="input-field" required value={form.roomTypeId} onChange={e => setForm({ ...form, roomTypeId: e.target.value })}>
                <option value="">Chọn phòng</option>
                {rooms.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name} - {r.property?.name} ({formatCurrency(r.priceMonthly)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Giá deal (VNĐ) *</label>
              <input type="number" className="input-field" required value={form.dealPrice}
                onChange={e => setForm({ ...form, dealPrice: e.target.value })} placeholder="3500000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Hoa hồng tổng (VNĐ)</label>
              <input type="number" className="input-field" value={form.commissionTotal}
                onChange={e => setForm({ ...form, commissionTotal: e.target.value })} placeholder="Để trống = 50% giá deal" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Tên khách</label>
              <input className="input-field" value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Nguyễn Văn B" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">SĐT khách</label>
              <input className="input-field" value={form.customerPhone}
                onChange={e => setForm({ ...form, customerPhone: e.target.value })} placeholder="0912345678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Ghi chú</label>
              <input className="input-field" value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú thêm..." />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">Gửi deal</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Huỷ</button>
            </div>
          </form>
        </div>
      )}

      {/* Deal cards */}
      <div className="space-y-3">
        {deals.map((d: any) => {
          const roomImages: string[] = d.roomType?.images || [];
          const propImages: string[] = d.roomType?.property?.images || [];
          const coverImage = roomImages[0] || propImages[0];

          return (
            <div key={d.id} className="card-hover">
              <div className="flex gap-4">
                {/* Room image thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-brand-100 to-brand-50">
                  {coverImage ? (
                    <OptimizedImage src={coverImage} alt="" fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🏢</div>
                  )}
                </div>

                {/* Deal info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-stone-900">
                        {d.roomType?.name} — {d.roomType?.property?.name}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {d.roomType?.property?.district} • {formatDate(d.dealDate)}
                      </p>
                    </div>
                    <span className={`badge ${getStatusColor(d.status)} flex-shrink-0`}>
                      {getStatusLabel(d.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase font-medium">Giá deal</p>
                      <p className="text-sm font-semibold text-stone-700">{formatCurrency(d.dealPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase font-medium">HH của tôi</p>
                      <p className="text-sm font-bold text-brand-600">{formatCurrency(d.commissionBroker)}</p>
                    </div>
                    {d.customerName && (
                      <div>
                        <p className="text-[10px] text-stone-400 uppercase font-medium">Khách</p>
                        <p className="text-sm text-stone-700">{d.customerName} {d.customerPhone && <span className="text-stone-400">• {d.customerPhone}</span>}</p>
                      </div>
                    )}
                  </div>

                  {d.notes && (
                    <p className="text-xs text-stone-500 mt-1.5 bg-stone-50 px-2 py-1 rounded-lg">📝 {d.notes}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {deals.length === 0 && (
          <div className="text-center py-16 text-stone-400 card">
            <p className="text-4xl mb-3">📋</p>
            <p>Chưa có giao dịch nào</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">+ Báo deal mới</button>
          </div>
        )}
      </div>

      {pagination && (
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={handlePageChange} />
      )}
    </div>
  );
}
