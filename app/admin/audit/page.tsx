'use client';
// ⚠️ KHÔNG bọc <DashboardLayout> ở đây — app/admin/layout.tsx đã bọc rồi.
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency, formatDate } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import FilterChip from '@/components/leads/FilterChip';

/**
 * NHẬT KÝ THAO TÁC — ai đã làm gì, lúc nào.
 *
 * Vì sao có: ngày 17/08/2026 kho tụt từ 856 → 675 tin và 498 → 358 tòa mà không truy lại được
 * ai xoá, xoá lúc nào, nhầm hay cố ý. Từ nay mọi việc khó hoàn tác đều để lại dấu.
 */

const ACTIONS = [
  { key: '', label: 'Tất cả' },
  { key: 'delete', label: '🗑️ Xoá', tone: 'danger' as const },
  { key: 'approve', label: '✅ Duyệt' },
  { key: 'reject', label: '⛔ Từ chối' },
  { key: 'transfer', label: '🔀 Chuyển sở hữu', tone: 'danger' as const },
  { key: 'permission', label: '🛡️ Vai trò / quyền', tone: 'danger' as const },
  { key: 'update', label: '✏️ Sửa' },
];

const ENTITY_LABEL: Record<string, string> = {
  roomType: 'Tin đăng', property: 'Tòa nhà', company: 'Công ty', user: 'Người dùng', deal: 'Giao dịch',
};

/** Tên field → chữ người đọc hiểu. Field lạ thì in nguyên tên, còn hơn giấu đi. */
const FIELD_LABEL: Record<string, string> = {
  isApproved: 'Duyệt', priceMonthly: 'Giá thuê', deposit: 'Tiền cọc', status: 'Trạng thái',
  propertyId: 'Thuộc tòa', name: 'Tên', landlordId: 'Chủ sở hữu', companyId: 'Công ty',
  fullAddress: 'Địa chỉ', role: 'Vai trò', permissions: 'Quyền', isActive: 'Đang hoạt động',
  soTinXoaTheo: 'Số tin bị xoá theo', toa: 'Tòa nhà', gia: 'Giá thuê',
};

function fmtValue(field: string, v: any) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'có' : 'không';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '(trống)';
  if ((field === 'priceMonthly' || field === 'gia' || field === 'deposit') && typeof v === 'number') {
    return formatCurrency(v);
  }
  return String(v);
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const params = new URLSearchParams({ page: String(page), limit: '30' });
  if (action) params.set('action', action);
  if (entity) params.set('entity', entity);
  if (q) params.set('q', q);

  const { data, isLoading, error } = useSWR(`/api/audit?${params.toString()}`, fetcher,
    { revalidateOnFocus: false, keepPreviousData: true });
  const rows: any[] = data?.data || [];
  const counts = data?.counts || {};
  const pagination = data?.pagination;

  if (error || data?.error) {
    return (
      <div className="card p-6">
        <p className="font-semibold text-stone-800">Không xem được nhật ký</p>
        <p className="text-sm text-stone-500 mt-1">Chỉ tài khoản quản trị cấp cao mới mở được trang này.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">🧾 Nhật ký thao tác</h1>
        <p className="text-sm text-stone-500 mt-1">
          Ghi lại các việc <strong>khó hoàn tác</strong>: duyệt / từ chối / xoá tin và tòa, đổi giá,
          chuyển chủ sở hữu, đổi vai trò và quyền. Không sửa hay xoá được — kể cả từ trang này.
        </p>
      </div>

      <div className="card p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map(a => (
            <FilterChip key={a.key} tone={a.tone} active={action === a.key}
              count={a.key ? counts[a.key] : undefined}
              onClick={() => { setAction(a.key); setPage(1); }}>
              {a.label}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" aria-hidden="true">🔍</span>
            <input value={qInput} onChange={e => setQInput(e.target.value)}
              placeholder="Tìm theo tên tin / mã tin / tên người thao tác…"
              aria-label="Tìm trong nhật ký" className="input-field pl-9" />
          </div>
          <select value={entity} onChange={e => { setEntity(e.target.value); setPage(1); }}
            aria-label="Lọc theo loại bản ghi" className="input-field sm:w-52">
            <option value="">Mọi loại bản ghi</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {isLoading && !data ? (
        <p className="text-stone-400 text-sm py-10 text-center">Đang tải…</p>
      ) : rows.length === 0 ? (
        <div className="card text-center py-14 text-stone-400">
          <p className="text-4xl mb-3">🧾</p>
          <p>{action || entity || q ? 'Không có mục nào khớp bộ lọc.' : 'Chưa ghi được thao tác nào.'}</p>
          <p className="text-xs mt-1">
            Nhật ký bắt đầu ghi từ 17/08/2026 — việc làm trước mốc đó không có ở đây.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-stone-50/80">
              <tr className="border-b border-stone-100">
                <th className="table-header min-w-[130px]">Lúc</th>
                <th className="table-header min-w-[140px]">Ai làm</th>
                <th className="table-header min-w-[120px]">Việc</th>
                <th className="table-header min-w-[220px]">Trên bản ghi</th>
                <th className="table-header min-w-[240px]">Đổi gì</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const destructive = r.action === 'delete' || r.action === 'transfer' || r.action === 'permission';
                return (
                  <tr key={r.id} className={`border-b border-stone-50 ${destructive ? 'bg-red-50/40' : ''}`}>
                    <td className="table-cell align-top text-xs text-stone-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="table-cell align-top text-xs">
                      <p className="font-medium text-stone-800">{r.userName || 'Không rõ'}</p>
                      <p className="text-stone-400">{r.userRole || ''}</p>
                    </td>
                    <td className="table-cell align-top text-xs">
                      <span className={`inline-flex px-2 py-0.5 rounded-full font-medium border ${
                        destructive ? 'bg-red-50 text-red-700 border-red-200' : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}>
                        {ACTIONS.find(a => a.key === r.action)?.label || r.action}
                      </span>
                    </td>
                    <td className="table-cell align-top text-xs">
                      <p className="text-stone-400">{ENTITY_LABEL[r.entity] || r.entity}</p>
                      <p className="text-stone-800 font-medium">{r.entityLabel || r.entityId}</p>
                    </td>
                    <td className="table-cell align-top text-xs">
                      {r.changes && Object.keys(r.changes).length > 0 ? (
                        <div className="space-y-0.5">
                          {Object.entries(r.changes as Record<string, any>).map(([f, v]: any) => (
                            <p key={f} className="text-stone-600">
                              <span className="text-stone-400">{FIELD_LABEL[f] || f}:</span>{' '}
                              <span className="line-through text-stone-400">{fmtValue(f, v.from)}</span>
                              {' → '}
                              <span className="font-medium text-stone-800">{fmtValue(f, v.to)}</span>
                            </p>
                          ))}
                        </div>
                      ) : <span className="text-stone-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} />
        </div>
      )}
    </>
  );
}
