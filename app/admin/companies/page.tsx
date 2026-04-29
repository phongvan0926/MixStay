'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { useCompanies } from '@/hooks/useData';
import { SkeletonCardGrid } from '@/components/ui/Skeleton';

const EMPTY_FORM = { name: '', description: '', phone: '', email: '', address: '', zaloGroupLink: '', isActive: true };

export default function AdminCompaniesPage() {
  const { companies, isLoading: loading, mutate } = useCompanies();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const filtered = companies.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  const openAdd = () => { setEditItem(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
  const openEdit = (c: any) => {
    setEditItem(c);
    setForm({ name: c.name, description: c.description || '', phone: c.phone || '', email: c.email || '', address: c.address || '', zaloGroupLink: c.zaloGroupLink || '', isActive: c.isActive });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Tên công ty là bắt buộc'); return; }
    setSubmitting(true);
    try {
      const payload: any = { ...form };
      if (editItem) payload.id = editItem.id;
      const res = await fetch('/api/companies', {
        method: editItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editItem ? 'Đã cập nhật công ty' : 'Đã thêm công ty mới');
      setShowModal(false);
      mutate();
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (c: any) => {
    if (!confirm(`Xoá công ty "${c.name}"? Hành động này không thể hoàn tác.`)) return;
    const res = await fetch(`/api/companies?id=${c.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success('Đã xoá công ty');
    mutate();
  };

  const getRoomTypeCount = (c: any) => {
    return c._count?.roomTypes ?? 0;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900">Hệ thống công ty</h1>
          <p className="text-sm text-stone-500 mt-0.5">{companies.length} công ty</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm công ty
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Tìm công ty..." value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-9 w-full" />
      </div>

      {loading ? (
        <SkeletonCardGrid count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-stone-900 truncate">{c.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {c.isActive ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </div>
                    {c.description && <p className="text-xs text-stone-500 truncate">{c.description}</p>}
                    {c.phone && <p className="text-xs text-stone-400 mt-1">{c.phone}</p>}
                    {c.email && <p className="text-xs text-stone-400">{c.email}</p>}
                    {c.address && <p className="text-xs text-stone-400 truncate">{c.address}</p>}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-stone-100">
                  <span className="badge bg-brand-50 text-brand-700 text-[10px]">{c._count?.properties || 0} tòa nhà</span>
                  <span className="badge bg-purple-50 text-purple-700 text-[10px]">{getRoomTypeCount(c)} tin đăng</span>
                  <span className="text-xs text-stone-400 ml-auto">{formatDate(c.createdAt)}</span>
                </div>

                {/* Zalo link */}
                {c.zaloGroupLink && (
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <a href={c.zaloGroupLink} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.49 10.272v-.45h1.347v6.322h-.77l-.3-.549a2.809 2.809 0 01-1.81.684c-1.617 0-2.865-1.347-2.865-3.013s1.248-3.013 2.864-3.013c.72 0 1.347.27 1.82.684zm-1.533 4.767c1.04 0 1.82-.855 1.82-1.91s-.78-1.91-1.82-1.91-1.82.855-1.82 1.91.78 1.91 1.82 1.91z" />
                      </svg>
                      Nhóm Zalo hệ thống
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end mt-3 pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-stone-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Sửa">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Xoá">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16">
              <p className="text-stone-400">Không tìm thấy công ty nào</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="font-display text-lg font-bold text-stone-900">
                {editItem ? 'Sửa công ty' : 'Thêm công ty mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Tên công ty / hệ thống <span className="text-red-500">*</span></label>
                <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field w-full" placeholder="VD: Công ty ABC" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">SĐT liên hệ</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="input-field w-full" placeholder="09xxxxxxxx" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="input-field w-full" placeholder="email@cty.vn" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Địa chỉ</label>
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="input-field w-full" placeholder="Địa chỉ văn phòng" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Link nhóm Zalo <span className="text-red-500">*</span>
                </label>
                <input type="url" value={form.zaloGroupLink} onChange={e => setForm(f => ({ ...f, zaloGroupLink: e.target.value }))}
                  className="input-field w-full" placeholder="https://zalo.me/g/..." />
                <p className="text-[11px] text-stone-400 mt-1">Link nhóm Zalo dùng chung cho TẤT CẢ tòa nhà trong hệ thống này</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input-field w-full" rows={2} placeholder="Mô tả ngắn về công ty" />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-stone-700">Trạng thái hoạt động</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-brand-600' : 'bg-stone-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors">Huỷ</button>
                <button type="submit" disabled={submitting} className="flex-1 btn-primary disabled:opacity-60">
                  {submitting ? 'Đang lưu...' : editItem ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
