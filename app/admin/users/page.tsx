'use client';
import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { formatDate, getRoleLabel, getRoleColor } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import { useUsers } from '@/hooks/useData';
import { SkeletonStats, SkeletonCardGrid } from '@/components/ui/Skeleton';

const ROLE_AVATAR_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-500',
  BROKER: 'bg-orange-500',
  LANDLORD: 'bg-amber-500',
  CUSTOMER: 'bg-blue-500',
};

const ROLES = ['ADMIN', 'BROKER', 'LANDLORD', 'CUSTOMER'];

const EMPTY_FORM = {
  name: '', email: '', phone: '', password: '', role: 'BROKER' as string, isActive: true,
};

type User = {
  id: string; name: string; email: string; phone: string | null;
  role: string; isActive: boolean; createdAt: string;
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [page, setPage] = useState(1);

  const { users: rawUsers, pagination, isLoading: loading, mutate } = useUsers({ page: String(page), limit: '20' });
  const users: User[] = rawUsers;

  // Filters & sort
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handlePageChange = (newPage: number) => { setPage(newPage); };

  // Client-side filter + sort
  const filtered = useMemo(() => {
    let list = [...users];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone || '').includes(q)
      );
    }
    if (roleFilter) list = list.filter(u => u.role === roleFilter);
    if (statusFilter === 'active') list = list.filter(u => u.isActive);
    if (statusFilter === 'inactive') list = list.filter(u => !u.isActive);

    if (sortBy === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'createdAt_desc') list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sortBy === 'role') list.sort((a, b) => a.role.localeCompare(b.role));

    return list;
  }, [users, search, roleFilter, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const active = users.filter(u => u.isActive).length;
    const byRole: Record<string, number> = {};
    ROLES.forEach(r => { byRole[r] = users.filter(u => u.role === r).length; });
    return { total: users.length, active, byRole };
  }, [users]);

  const getInitials = (name: string) =>
    name?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || '?';

  // Modal open
  const openAdd = () => {
    setEditUser(null);
    setForm({ ...EMPTY_FORM });
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, phone: u.phone || '', password: '', role: u.role, isActive: u.isActive });
    setShowPassword(false);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditUser(null); };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) { toast.error('Email không hợp lệ'); return; }
    if (!editUser && form.password.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return; }
    if (editUser && form.password && form.password.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return; }

    setSubmitting(true);
    try {
      const method = editUser ? 'PUT' : 'POST';
      const payload: any = { ...form };
      if (editUser) payload.id = editUser.id;
      if (editUser && !payload.password) delete payload.password;

      const res = await fetch('/api/users', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Lỗi'); return; }

      toast.success(editUser ? 'Đã cập nhật người dùng' : 'Đã thêm người dùng mới');
      closeModal();
      mutate();
    } finally {
      setSubmitting(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Lỗi'); return; }
      toast.success(data.message);
      setDeleteTarget(null);
      mutate();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900">Quản lý người dùng</h1>
          <p className="text-sm text-stone-500 mt-0.5">{stats.total} người dùng · {stats.active} đang hoạt động</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm người dùng
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {ROLES.map(r => (
          <div key={r} className="card p-3 text-center">
            <div className="text-xl font-bold text-stone-900">{stats.byRole[r] || 0}</div>
            <div className={`badge text-[10px] mt-1 ${getRoleColor(r)}`}>{getRoleLabel(r)}</div>
          </div>
        ))}
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-emerald-600">{stats.active}</div>
          <div className="text-xs text-stone-500 mt-1">Đang hoạt động</div>
        </div>
      </div>

      {/* Search + Filter + Sort */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" placeholder="Tìm tên, email, SĐT..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>
        {/* Role filter */}
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field min-w-[140px]">
          <option value="">Tất cả vai trò</option>
          {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
        </select>
        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field min-w-[140px]">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Vô hiệu</option>
        </select>
        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-field min-w-[160px]">
          <option value="createdAt_desc">Mới nhất trước</option>
          <option value="name_asc">Tên A → Z</option>
          <option value="role">Theo vai trò</option>
        </select>
      </div>

      {/* Users grid */}
      {loading ? (
        <div><SkeletonStats count={4} /><div className="mt-6"><SkeletonCardGrid count={6} /></div></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(u => (
            <div key={u.id} className="card hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${ROLE_AVATAR_COLORS[u.role] || 'bg-stone-400'} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                    {getInitials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-stone-900 truncate">{u.name}</h3>
                      <span className={`badge text-[10px] ${getRoleColor(u.role)}`}>{getRoleLabel(u.role)}</span>
                    </div>
                    <p className="text-sm text-stone-500 truncate">{u.email}</p>
                    {u.phone && <p className="text-sm text-stone-400 mt-0.5">{u.phone}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {u.isActive ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                    <span className="text-xs text-stone-400">{formatDate(u.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(u)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="Sửa">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {u.id !== currentUserId && (
                      <button onClick={() => setDeleteTarget(u)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Xoá">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full text-center py-16">
              <svg className="w-12 h-12 text-stone-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-stone-400 font-medium">Không tìm thấy người dùng</p>
              {(search || roleFilter || statusFilter) && (
                <button onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); }}
                  className="text-brand-600 text-sm mt-2 hover:underline">
                  Xoá bộ lọc
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {pagination && (
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={handlePageChange} />
      )}

      {/* ===== ADD/EDIT MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="font-display text-lg font-bold text-stone-900">
                {editUser ? 'Sửa người dùng' : 'Thêm người dùng mới'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Họ tên */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field w-full" placeholder="Nguyễn Văn A" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field w-full" placeholder="email@example.com" />
              </div>

              {/* SĐT */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Số điện thoại</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="input-field w-full" placeholder="09xxxxxxxx" />
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Mật khẩu {!editUser && <span className="text-red-500">*</span>}
                  {editUser && <span className="text-stone-400 font-normal ml-1">(để trống nếu không đổi)</span>}
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required={!editUser} minLength={editUser ? undefined : 6}
                    className="input-field w-full pr-10" placeholder="Tối thiểu 6 ký tự" />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Vai trò */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Vai trò <span className="text-red-500">*</span></label>
                <select required value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  disabled={editUser?.id === currentUserId}
                  className="input-field w-full disabled:opacity-50">
                  {ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                </select>
                {editUser?.id === currentUserId && (
                  <p className="text-xs text-stone-400 mt-1">Không thể đổi vai trò của chính mình</p>
                )}
              </div>

              {/* Trạng thái */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-stone-700">Trạng thái hoạt động</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-brand-600' : 'bg-stone-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors">
                  Huỷ
                </button>
                <button type="submit" disabled={submitting} className="flex-1 btn-primary disabled:opacity-60">
                  {submitting ? 'Đang lưu...' : editUser ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM DIALOG ===== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Xoá tài khoản</h3>
                <p className="text-sm text-stone-500">{deleteTarget.name}</p>
              </div>
            </div>
            <p className="text-sm text-stone-600 mb-1">
              Xoá tài khoản <strong>{deleteTarget.name}</strong>? Hành động này không thể hoàn tác.
            </p>
            <p className="text-xs text-stone-400 mb-5">
              Nếu tài khoản có dữ liệu liên quan (property, deal, share link), hệ thống sẽ vô hiệu hoá thay vì xoá cứng.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors">
                Huỷ
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-60">
                {deleting ? 'Đang xử lý...' : 'Xoá / Vô hiệu hoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
