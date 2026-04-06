'use client';
import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';
import PropertyForm from '@/components/forms/PropertyForm';

export default function AdminPropertiesPage() {
  const [stats, setStats] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterCompany, setFilterCompany] = useState('');
  const [filterLandlord, setFilterLandlord] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = async () => {
    const [statsRes, propsRes, companiesRes] = await Promise.all([
      fetch('/api/dashboard-stats'),
      fetch('/api/properties'),
      fetch('/api/companies'),
    ]);
    setStats(await statsRes.json());
    const propsData = await propsRes.json();
    setProperties(Array.isArray(propsData) ? propsData : []);
    const compData = await companiesRes.json();
    setCompanies(Array.isArray(compData) ? compData : []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Landlords filtered by selected company (cascade)
  const landlords = useMemo(() => {
    const source = filterCompany
      ? properties.filter(p => filterCompany === '__none__' ? !p.companyId : p.companyId === filterCompany)
      : properties;
    const map = new Map<string, { id: string; name: string }>();
    source.forEach(p => {
      if (p.landlord && !map.has(p.landlord.id)) {
        map.set(p.landlord.id, { id: p.landlord.id, name: p.landlord.name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [properties, filterCompany]);

  const filtered = useMemo(() => {
    return properties.filter(p => {
      if (filterCompany && p.companyId !== filterCompany) return false;
      if (filterCompany === '__none__' && p.companyId) return false;
      if (filterLandlord && p.landlord?.id !== filterLandlord) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  }, [properties, filterCompany, filterLandlord, filterStatus]);

  const handleApprove = async (id: string, status: string) => {
    await fetch('/api/properties', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    toast.success(status === 'APPROVED' ? 'Đã duyệt!' : 'Đã từ chối');
    fetchData();
  };

  const openCreate = () => { setEditingProperty(null); setShowModal(true); };
  const openEdit = (property: any) => { setEditingProperty(property); setShowModal(true); };

  const handleFormSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      if (editingProperty) {
        const res = await fetch('/api/properties', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProperty.id, ...data }),
        });
        if (res.ok) { toast.success('Đã cập nhật tòa nhà!'); setShowModal(false); fetchData(); }
        else toast.error('Lỗi cập nhật');
      } else {
        const res = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) { toast.success('Đã thêm tòa nhà!'); setShowModal(false); fetchData(); }
        else toast.error('Lỗi thêm tòa nhà');
      }
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xác nhận xoá tòa nhà này?')) return;
    await fetch(`/api/properties?id=${id}`, { method: 'DELETE' });
    toast.success('Đã xoá!');
    fetchData();
  };

  if (loading) return <div className="animate-pulse text-stone-400 p-8">Đang tải...</div>;

  const hasFilters = filterCompany || filterLandlord || filterStatus;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Tổng quan</h1>
          <p className="text-sm text-stone-500 mt-1">Quản lý toàn bộ hệ thống</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Thêm tòa nhà</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Tổng tòa nhà', value: stats.totalProperties, color: 'text-brand-600', icon: '🏢' },
            { label: 'Phòng trống', value: `${stats.availableRooms}/${stats.totalRooms}`, color: 'text-emerald-600', icon: '🚪' },
            { label: 'Chờ duyệt', value: stats.pendingProperties, color: 'text-amber-600', icon: '⏳' },
            { label: 'Doanh thu HH', value: formatCurrency(stats.totalRevenue), color: 'text-purple-600', icon: '💰' },
            { label: 'Giao dịch', value: `${stats.confirmedDeals}/${stats.totalDeals}`, color: 'text-blue-600', icon: '📋' },
            { label: 'Môi giới', value: stats.totalBrokers, color: 'text-orange-600', icon: '🤝' },
            { label: 'Chủ nhà', value: stats.totalLandlords, color: 'text-amber-600', icon: '🏠' },
            { label: 'Tổng HH', value: formatCurrency(stats.totalCommission), color: 'text-emerald-600', icon: '💵' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setFilterLandlord(''); }} className="input-field !w-auto min-w-[160px]">
          <option value="">Tất cả công ty</option>
          <option value="__none__">Chưa gán công ty</option>
          {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterLandlord} onChange={e => setFilterLandlord(e.target.value)} className="input-field !w-auto min-w-[160px]">
          <option value="">Tất cả chủ nhà</option>
          {landlords.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field !w-auto min-w-[140px]">
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterCompany(''); setFilterLandlord(''); setFilterStatus(''); }}
            className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700">Xoá bộ lọc</button>
        )}
        <span className="self-center text-sm text-stone-400 ml-auto">
          {filtered.length}/{properties.length} tòa nhà
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="table-header">Ảnh</th>
                <th className="table-header">Tên</th>
                <th className="table-header">Công ty</th>
                <th className="table-header">Khu vực</th>
                <th className="table-header">Chủ nhà</th>
                <th className="table-header">Phòng</th>
                <th className="table-header">Trạng thái</th>
                <th className="table-header">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((p: any) => {
                return (
                  <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="table-cell">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0]} alt={p.name} className="w-14 h-14 rounded-xl object-cover border border-stone-200" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 text-xl">🏢</div>
                      )}
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-stone-900">{p.name}</p>
                      <p className="text-xs text-stone-500 mt-0.5 max-w-[200px] truncate">{p.fullAddress}</p>
                    </td>
                    <td className="table-cell">
                      {(() => {
                        const company = companies.find((c: any) => c.id === p.companyId);
                        return company ? (
                          <div>
                            <span className="badge bg-brand-50 text-brand-700 text-xs">{company.name}</span>
                            {company.zaloGroupLink && (
                              <a href={company.zaloGroupLink} target="_blank" rel="noopener noreferrer"
                                className="block mt-1 text-[10px] text-blue-600 hover:text-blue-800 truncate max-w-[120px]">
                                Zalo nhóm
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        );
                      })()}
                    </td>
                    <td className="table-cell"><span className="text-stone-700">{p.district}</span></td>
                    <td className="table-cell">
                      <p className="text-stone-900 font-medium">{p.landlord.name}</p>
                      <p className="text-xs text-stone-500">{p.landlord.phone}</p>
                    </td>
                    <td className="table-cell">
                      <span className="text-emerald-600 font-bold">{p.roomTypes.filter((r: any) => r.isAvailable).length}</span>
                      <span className="text-stone-400 font-medium">/{p.roomTypes.length}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Sửa
                        </button>
                        {p.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleApprove(p.id, 'APPROVED')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">Duyệt</button>
                            <button onClick={() => handleApprove(p.id, 'REJECTED')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors">Từ chối</button>
                          </>
                        )}
                        <button onClick={() => handleDelete(p.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Xoá</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="table-cell text-center text-stone-400 py-12">
                  {properties.length === 0 ? 'Chưa có tòa nhà nào' : 'Không tìm thấy tòa nhà phù hợp'}
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
                {editingProperty ? 'Sửa tòa nhà' : 'Thêm tòa nhà mới'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <PropertyForm
                initialData={editingProperty || undefined}
                onSubmit={handleFormSubmit}
                isAdmin={true}
                loading={submitting}
                companies={companies}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
