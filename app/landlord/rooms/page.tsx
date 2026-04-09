'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import RoomTypeForm from '@/components/forms/RoomTypeForm';
import Pagination from '@/components/ui/Pagination';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useRoomTypes, useProperties, useInquiries } from '@/hooks/useData';
import { SkeletonCardGrid } from '@/components/ui/Skeleton';

const ROOM_TYPE_LABELS: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1K1N',
  '2k1n': '2K1N', studio: 'Studio', duplex: 'Duplex',
};

export default function LandlordRoomsPage() {
  const [page, setPage] = useState(1);

  const { roomTypes, pagination, isLoading: loading, mutate } = useRoomTypes({ page: String(page), limit: '20' });
  const { properties } = useProperties({ limit: '200' });
  const { inquiries, mutate: mutateInquiries } = useInquiries();

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showInquiries, setShowInquiries] = useState(false);
  const [filterProperty, setFilterProperty] = useState('');

  // Inline edit states
  const [editingAvailable, setEditingAvailable] = useState<string | null>(null);
  const [editAvailableUnits, setEditAvailableUnits] = useState(0);
  const [editAvailableNames, setEditAvailableNames] = useState('');

  const handlePageChange = (newPage: number) => { setPage(newPage); };

  const openCreate = () => {
    setEditingRoomType(null);
    setShowModal(true);
  };

  const openEdit = (rt: any) => {
    setEditingRoomType(rt);
    setShowModal(true);
  };

  const handleFormSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      if (editingRoomType) {
        const res = await fetch('/api/rooms', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingRoomType.id, ...data }),
        });
        if (res.ok) {
          toast.success('Đã cập nhật loại phòng!');
          setShowModal(false);
          mutate();
        } else {
          toast.error('Lỗi cập nhật');
        }
      } else {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          toast.success('Đã thêm loại phòng! Chờ Admin duyệt.');
          setShowModal(false);
          mutate();
        } else {
          toast.error('Lỗi thêm loại phòng');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle entire room type availability
  const toggleAvailability = async (id: string, current: boolean) => {
    await fetch('/api/rooms', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isAvailable: !current }),
    });
    toast.success(!current ? 'Đã mở loại phòng' : 'Đã tắt loại phòng');
    mutate();
  };

  // Inline edit: save available units + names
  const startEditAvailable = (rt: any) => {
    setEditingAvailable(rt.id);
    setEditAvailableUnits(rt.availableUnits || 0);
    setEditAvailableNames(rt.availableRoomNames || '');
  };

  const saveAvailable = async (id: string) => {
    await fetch('/api/rooms', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, availableUnits: editAvailableUnits, availableRoomNames: editAvailableNames }),
    });
    toast.success('Đã cập nhật phòng trống!');
    setEditingAvailable(null);
    mutate();
  };

  // Reply inquiry
  const replyInquiry = async (inqId: string, reply: string) => {
    await fetch('/api/inquiries', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inqId, reply }),
    });
    toast.success('Đã phản hồi!');
    mutate(); mutateInquiries();
  };

  if (loading) return <div className="p-8"><SkeletonCardGrid count={6} /></div>;

  const pendingInquiries = inquiries.filter((i: any) => !i.reply);
  const totalAvailable = roomTypes.reduce((sum, rt) => sum + (rt.isAvailable ? (rt.availableUnits || 0) : 0), 0);
  const totalUnits = roomTypes.reduce((sum, rt) => sum + (rt.totalUnits || 0), 0);

  const filtered = filterProperty
    ? roomTypes.filter(rt => rt.propertyId === filterProperty)
    : roomTypes;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Loại phòng</h1>
          <p className="text-sm text-stone-500 mt-1">
            <span className="text-emerald-600 font-medium">{totalAvailable} trống</span> / {totalUnits} tổng phòng • {roomTypes.length} loại
          </p>
        </div>
        <div className="flex gap-2">
          {pendingInquiries.length > 0 && (
            <button onClick={() => setShowInquiries(!showInquiries)}
              className="btn-secondary relative">
              Hỏi phòng
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {pendingInquiries.length}
              </span>
            </button>
          )}
          <button onClick={openCreate} className="btn-primary flex-1 sm:flex-none">
            + Thêm loại phòng
          </button>
        </div>
      </div>

      {/* Property filter */}
      {properties.length > 1 && (
        <div className="mb-4">
          <select className="input-field max-w-xs" value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
            <option value="">Tất cả tòa nhà</option>
            {properties.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} — {p.district}</option>
            ))}
          </select>
        </div>
      )}

      {/* Inquiry notifications */}
      {showInquiries && pendingInquiries.length > 0 && (
        <div className="card mb-6 border-amber-200 bg-amber-50/50">
          <h2 className="font-display font-semibold text-lg mb-3">Môi giới đang hỏi</h2>
          <div className="space-y-3">
            {pendingInquiries.map((inq: any) => (
              <div key={inq.id} className="bg-white rounded-xl p-4 border border-amber-100">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{inq.broker?.name} hỏi <strong>{inq.roomType?.name || inq.room?.roomNumber}</strong></p>
                    <p className="text-xs text-stone-500">{inq.message} • {formatDateTime(inq.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => replyInquiry(inq.id, 'CÒN')}
                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-all">
                    CÒN PHÒNG
                  </button>
                  <button onClick={() => replyInquiry(inq.id, 'HẾT')}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-all">
                    HẾT PHÒNG
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room Type cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((rt: any) => {
          const commission = rt.commissionJson ? (typeof rt.commissionJson === 'string' ? JSON.parse(rt.commissionJson) : rt.commissionJson) : {};
          const rtInq = inquiries.filter((i: any) => (i.roomTypeId === rt.id) && !i.reply);
          const coverImage = rt.images && rt.images.length > 0 ? rt.images[0] : null;
          const isEditingThis = editingAvailable === rt.id;

          return (
            <div key={rt.id} className="card-hover overflow-hidden relative group">
              {rtInq.length > 0 && (
                <span className="absolute top-2 left-2 z-10 w-6 h-6 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
                  {rtInq.length}
                </span>
              )}

              {/* Cover image */}
              <div className="relative -mx-5 -mt-5 mb-4 h-40 overflow-hidden">
                {coverImage ? (
                  <OptimizedImage src={coverImage} alt={rt.name} fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center">
                    <span className="text-4xl opacity-50">🏠</span>
                  </div>
                )}
                {rt.images && rt.images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                    +{rt.images.length - 1} ảnh
                  </div>
                )}
                {!rt.isApproved && (
                  <div className="absolute top-2 right-2">
                    <span className="badge bg-amber-100 text-amber-700">Chờ duyệt</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-lg truncate">{rt.name}</h3>
                  <p className="text-sm text-stone-500 truncate">{rt.property?.name} • {rt.areaSqm}m²</p>
                </div>
                <span className="badge bg-stone-100 text-stone-600 text-[10px] shrink-0 ml-2">
                  {ROOM_TYPE_LABELS[rt.typeName] || rt.typeName}
                </span>
              </div>

              <p className="text-lg font-bold text-brand-600 mb-2">
                {formatCurrency(rt.priceMonthly)}
                <span className="text-sm font-normal text-stone-400">/tháng</span>
              </p>

              {/* Availability — inline editable */}
              <div className="p-3 bg-stone-50 rounded-xl mb-3">
                {isEditingThis ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-stone-500 whitespace-nowrap">Trống:</label>
                      <input type="number" className="input-field !py-1 !text-sm w-16" min={0} max={rt.totalUnits}
                        value={editAvailableUnits} onChange={e => setEditAvailableUnits(Math.min(parseInt(e.target.value) || 0, rt.totalUnits))} />
                      <span className="text-xs text-stone-400">/ {rt.totalUnits} phòng</span>
                    </div>
                    <div>
                      <input type="text" className="input-field !py-1 !text-sm" placeholder="VD: 101, 201, 301"
                        value={editAvailableNames} onChange={e => setEditAvailableNames(e.target.value)} />
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => saveAvailable(rt.id)}
                        className="px-3 py-1 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700">Lưu</button>
                      <button onClick={() => setEditingAvailable(null)}
                        className="px-3 py-1 text-stone-500 text-xs hover:text-stone-700">Huỷ</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => startEditAvailable(rt)}>
                    <div>
                      <p className="text-sm font-medium text-stone-700">
                        Trống: <span className="text-emerald-600">{rt.availableUnits}/{rt.totalUnits}</span> phòng
                      </p>
                      {rt.availableRoomNames && (
                        <p className="text-xs text-stone-400 mt-0.5">({rt.availableRoomNames})</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Commission display */}
              {Object.keys(commission).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {Object.entries(commission).map(([m, p]) => (
                    <span key={m} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      HH {m}th: {String(p)}%
                    </span>
                  ))}
                </div>
              )}

              {rt.amenities?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {rt.amenities.slice(0, 5).map((a: string) => (
                    <span key={a} className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{a}</span>
                  ))}
                  {rt.amenities.length > 5 && (
                    <span className="text-[10px] text-stone-400">+{rt.amenities.length - 5}</span>
                  )}
                </div>
              )}

              {/* Pending inquiries inline */}
              {rtInq.length > 0 && (
                <div className="p-2 bg-amber-50 rounded-lg mb-2 border border-amber-100">
                  {rtInq.map((inq: any) => (
                    <div key={inq.id} className="flex items-center justify-between gap-2 mb-1 last:mb-0">
                      <p className="text-xs text-amber-800 truncate">{inq.broker?.name}: {inq.message}</p>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => replyInquiry(inq.id, 'CÒN')} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded hover:bg-emerald-200">CÒN</button>
                        <button onClick={() => replyInquiry(inq.id, 'HẾT')} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200">HẾT</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <button onClick={() => openEdit(rt)}
                  className="w-full py-2 rounded-xl text-sm font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-all border border-brand-200 flex items-center justify-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Sửa chi tiết
                </button>
                <button onClick={() => toggleAvailability(rt.id, rt.isAvailable)}
                  className={'w-full py-2 rounded-xl text-sm font-medium transition-all ' +
                    (rt.isAvailable
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200')}>
                  {rt.isAvailable ? 'Đang mở — Bấm tắt' : 'Đã tắt — Bấm mở'}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="md:col-span-3 text-center py-16 text-stone-400 card">
            <p className="text-4xl mb-3">🏠</p>
            <p>
              {filterProperty ? 'Tòa nhà này chưa có loại phòng nào.' : 'Chưa có loại phòng nào.'}
              <br />Nhấn <strong>+ Thêm loại phòng</strong> để bắt đầu.
            </p>
          </div>
        )}
      </div>

      {pagination && (
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={handlePageChange} />
      )}

      {/* Modal — RoomTypeForm */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 z-10">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-20">
              <h2 className="font-display text-lg font-bold text-stone-900">
                {editingRoomType ? 'Sửa loại phòng' : 'Thêm loại phòng mới'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <RoomTypeForm
                initialData={editingRoomType || undefined}
                properties={properties.map((p: any) => ({ id: p.id, name: p.name, district: p.district }))}
                onSubmit={handleFormSubmit}
                isAdmin={false}
                loading={submitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
