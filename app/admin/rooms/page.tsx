'use client';
import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import RoomForm from '@/components/forms/RoomForm';

const ROOM_TYPE_LABELS: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1K1N',
  '2k1n': '2K1N', studio: 'Studio', duplex: 'Duplex',
};

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterCompany, setFilterCompany] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterRoomType, setFilterRoomType] = useState('');

  const fetchData = async () => {
    const [roomsRes, propsRes, companiesRes] = await Promise.all([
      fetch('/api/rooms'), fetch('/api/properties?status=APPROVED'), fetch('/api/companies'),
    ]);
    const roomsData = await roomsRes.json();
    setRooms(Array.isArray(roomsData) ? roomsData : []);
    const propsData = await propsRes.json();
    setProperties(Array.isArray(propsData) ? propsData : []);
    const compData = await companiesRes.json();
    setCompanies(Array.isArray(compData) ? compData : []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Properties filtered by selected company
  const filteredProperties = useMemo(() => {
    if (!filterCompany) return properties;
    if (filterCompany === '__none__') return properties.filter(p => !p.companyId);
    return properties.filter(p => p.companyId === filterCompany);
  }, [properties, filterCompany]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      if (filterCompany) {
        const prop = properties.find(p => p.id === r.property?.id);
        if (filterCompany === '__none__' && prop?.companyId) return false;
        if (filterCompany !== '__none__' && prop?.companyId !== filterCompany) return false;
      }
      if (filterProperty && r.property?.id !== filterProperty) return false;
      if (filterRoomType && r.roomType !== filterRoomType) return false;
      return true;
    });
  }, [rooms, properties, filterCompany, filterProperty, filterRoomType]);

  const openCreate = () => { setEditingRoom(null); setShowModal(true); };
  const openEdit = (room: any) => { setEditingRoom(room); setShowModal(true); };

  const handleFormSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      if (editingRoom) {
        const res = await fetch('/api/rooms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingRoom.id, ...data }) });
        if (res.ok) { toast.success('Đã cập nhật phòng!'); setShowModal(false); fetchData(); } else toast.error('Lỗi cập nhật');
      } else {
        const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) { toast.success('Đã thêm phòng!'); setShowModal(false); fetchData(); } else toast.error('Lỗi thêm phòng');
      }
    } finally { setSubmitting(false); }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await fetch('/api/rooms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isAvailable: !current }) });
    toast.success(!current ? 'Đã bật phòng' : 'Đã tắt phòng'); fetchData();
  };

  const toggleApproval = async (id: string, current: boolean) => {
    await fetch('/api/rooms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isApproved: !current }) });
    toast.success(!current ? 'Đã duyệt phòng' : 'Đã huỷ duyệt'); fetchData();
  };

  const getCommissionText = (r: any) => {
    if (!r.commissionJson) return '—';
    try { const c = typeof r.commissionJson === 'string' ? JSON.parse(r.commissionJson) : r.commissionJson; return `${c['6'] ?? '—'}% / ${c['12'] ?? '—'}%`; } catch { return '—'; }
  };

  if (loading) return <div className="animate-pulse text-stone-400 p-8">Đang tải...</div>;

  const hasFilters = filterCompany || filterProperty || filterRoomType;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Quản lý phòng</h1>
          <p className="text-sm text-stone-500 mt-1">{rooms.length} phòng</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Thêm phòng</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select className="input-field !w-auto min-w-[160px]" value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setFilterProperty(''); }}>
          <option value="">Tất cả công ty</option>
          <option value="__none__">Chưa gán công ty</option>
          {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input-field !w-auto min-w-[180px]" value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
          <option value="">Tất cả tòa nhà</option>
          {filteredProperties.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {p.district}</option>)}
        </select>
        <select className="input-field !w-auto min-w-[150px]" value={filterRoomType} onChange={e => setFilterRoomType(e.target.value)}>
          <option value="">Tất cả loại phòng</option>
          {Object.entries(ROOM_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterCompany(''); setFilterProperty(''); setFilterRoomType(''); }}
            className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors">Xoá bộ lọc</button>
        )}
        <span className="self-center text-sm text-stone-400 ml-auto">Hiển thị {filteredRooms.length}/{rooms.length} phòng</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="table-header">Ảnh</th>
                <th className="table-header">Phòng</th>
                <th className="table-header">Tòa nhà</th>
                <th className="table-header">Công ty</th>
                <th className="table-header">Loại</th>
                <th className="table-header">Diện tích</th>
                <th className="table-header">Giá thuê</th>
                <th className="table-header">HH 6T/12T</th>
                <th className="table-header">Trạng thái</th>
                <th className="table-header">Duyệt</th>
                <th className="table-header">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRooms.map((r: any) => {
                const prop = properties.find(p => p.id === r.property?.id);
                const companyName = companies.find((c: any) => c.id === prop?.companyId)?.name;
                return (
                  <tr key={r.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="table-cell">
                      {r.images && r.images.length > 0 ? (
                        <img src={r.images[0]} alt={r.roomNumber} className="w-12 h-12 rounded-lg object-cover border border-stone-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-lg">🚪</div>
                      )}
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-stone-900">{r.roomNumber}</p>
                      <p className="text-xs text-stone-400">Tầng {r.floor}</p>
                    </td>
                    <td className="table-cell">
                      <p className="text-stone-700">{r.property?.name}</p>
                      <p className="text-xs text-stone-400">{r.property?.district}</p>
                    </td>
                    <td className="table-cell">
                      {companyName ? <span className="badge bg-brand-50 text-brand-700 text-[10px]">{companyName}</span> : <span className="text-xs text-stone-400">—</span>}
                    </td>
                    <td className="table-cell">
                      <span className="badge bg-stone-100 text-stone-700">{ROOM_TYPE_LABELS[r.roomType] || r.roomType || '—'}</span>
                    </td>
                    <td className="table-cell">{r.areaSqm}m²</td>
                    <td className="table-cell font-semibold text-brand-600">{formatCurrency(r.priceMonthly)}</td>
                    <td className="table-cell"><span className="text-xs text-orange-600 font-medium">{getCommissionText(r)}</span></td>
                    <td className="table-cell">
                      <button onClick={() => toggleAvailability(r.id, r.isAvailable)}
                        className={`badge cursor-pointer transition-colors ${r.isAvailable ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                        {r.isAvailable ? 'Còn trống' : 'Đã thuê'}
                      </button>
                    </td>
                    <td className="table-cell">
                      <button onClick={() => toggleApproval(r.id, r.isApproved)}
                        className={`badge cursor-pointer transition-colors ${r.isApproved ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                        {r.isApproved ? '✓ Đã duyệt' : 'Chờ duyệt'}
                      </button>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Sửa
                        </button>
                        <button onClick={async () => {
                          if (confirm('Xoá phòng này?')) {
                            await fetch(`/api/rooms?id=${r.id}`, { method: 'DELETE' });
                            toast.success('Đã xoá'); fetchData();
                          }
                        }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Xoá</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRooms.length === 0 && (
                <tr><td colSpan={11} className="table-cell text-center text-stone-400 py-12">
                  {rooms.length === 0 ? 'Chưa có phòng nào' : 'Không tìm thấy phòng phù hợp'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 z-10">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-20">
              <h2 className="font-display text-lg font-bold text-stone-900">
                {editingRoom ? 'Sửa phòng' : 'Thêm phòng mới'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <RoomForm
                initialData={editingRoom || undefined}
                properties={properties.map((p: any) => ({ id: p.id, name: p.name, district: p.district }))}
                onSubmit={handleFormSubmit}
                isAdmin={true}
                loading={submitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
