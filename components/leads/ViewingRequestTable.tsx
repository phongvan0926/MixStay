'use client';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { telHref, zaloHref } from '@/lib/phone';

// Bảng "Khách xin xem phòng" dùng chung cho admin (thấy mọi lead) và CTV (chỉ lead từ link
// của mình). Khác nhau đúng một cột: admin cần biết lead thuộc CTV nào để chia hoa hồng.

const STATUS_META: Record<string, { label: string; cls: string }> = {
  NEW: { label: '🔴 Mới', cls: 'bg-red-50 text-red-700 border-red-200' },
  CONTACTED: { label: '🟡 Đã gọi', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  DONE: { label: '🟢 Đã dẫn xem', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: '⚪ Huỷ', cls: 'bg-stone-100 text-stone-500 border-stone-200' },
};

const SOURCE_LABEL: Record<string, string> = {
  share: 'Link tin của CTV',
  system: 'Kho phòng CTV',
  company: 'Kho công ty',
  tin: 'Trang công khai',
};

/**
 * Lead còn 🔴 Mới mà đã để quá 24h → nói thẳng đã chờ bao lâu.
 * Trả null khi chưa quá hạn (hoặc đã gọi rồi) để không làm rối bảng.
 */
function waitingLabel(status: string, createdAt: string | Date) {
  if (status !== 'NEW') return null;
  const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000);
  if (hours < 24) return null;
  return `⏰ Chờ ${Math.floor(hours / 24)} ngày`;
}

export default function ViewingRequestTable({
  rows,
  mutate,
  showBroker = false,
  emptyState,
}: {
  rows: any[];
  mutate: () => void;
  showBroker?: boolean;
  /** Thay lời nhắn "chưa có khách nào" khi danh sách rỗng VÌ ĐANG LỌC, không phải vì hết dữ liệu */
  emptyState?: React.ReactNode;
}) {
  const setStatus = async (id: string, status: string) => {
    const res = await fetch('/api/viewing-requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) { toast.success('Đã cập nhật'); mutate(); }
    else toast.error('Không cập nhật được');
  };

  if (rows.length === 0) {
    return emptyState ? <>{emptyState}</> : (
      <div className="card text-center py-14 text-stone-400">
        <p className="text-4xl mb-3">📭</p>
        <p>Chưa có khách nào xin xem phòng.</p>
        <p className="text-xs mt-1">Khách để lại SĐT ngay trên trang tin đăng sẽ hiện ở đây.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm min-w-[900px]">
        {/* Dùng .table-header / .table-cell như MỌI bảng quản trị khác (app/globals.css) thay vì
            px-4 py-3 tự chế — trước đây tiêu đề cột không in hoa, không cùng màu, và cột "Khách"
            / "Nguồn" không đặt min-w nên tên người bị bẻ đôi ("Ngô Thái / Dương"). */}
        <thead className="bg-stone-50/80">
          <tr className="border-b border-stone-100">
            <th className="table-header min-w-[150px]">Khách</th>
            <th className="table-header min-w-[220px]">Tin đăng</th>
            <th className="table-header min-w-[130px]">Ghi chú / hẹn giờ</th>
            {showBroker && <th className="table-header min-w-[130px]">Nguồn</th>}
            <th className="table-header min-w-[100px]">Gửi lúc</th>
            <th className="table-header text-right min-w-[130px]">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const waiting = waitingLabel(r.status, r.createdAt);
            return (
            <tr key={r.id} className={`border-b border-stone-50 ${r.status === 'CANCELLED' ? 'opacity-50' : waiting ? 'bg-red-50/50' : ''}`}>
              <td className="table-cell align-top">
                <p className="font-medium text-stone-800 whitespace-nowrap">{r.name || 'Khách'}</p>
                <a href={telHref(r.phone) || undefined} className="text-brand-600 font-mono text-xs hover:underline">{r.phone}</a>
                {' · '}
                {zaloHref(r.phone) && <a href={zaloHref(r.phone)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">Zalo</a>}
              </td>
              <td className="table-cell align-top">
                <a href={`/tin/${r.roomType?.id}`} target="_blank" rel="noopener noreferrer"
                  className="font-medium text-stone-800 hover:text-brand-600 hover:underline line-clamp-1 max-w-[220px] inline-block">
                  {r.roomType?.name || '—'}
                </a>
                <p className="text-xs text-stone-500">
                  {[r.roomType?.property?.district, r.roomType?.priceMonthly ? formatCurrency(r.roomType.priceMonthly) : null]
                    .filter(Boolean).join(' · ')}
                </p>
              </td>
              <td className="table-cell align-top text-stone-500 text-xs max-w-[180px]">{r.note || '—'}</td>
              {showBroker && (
                <td className="table-cell align-top text-xs">
                  <p className="text-stone-700 font-medium whitespace-nowrap">{r.broker?.name || 'Không qua CTV'}</p>
                  <p className="text-stone-400">{SOURCE_LABEL[r.source] || r.source}</p>
                </td>
              )}
              <td className="table-cell align-top text-stone-500 text-xs whitespace-nowrap">
                {formatDate(r.createdAt)}
                {waiting && <p className="text-red-600 font-semibold mt-0.5">{waiting}</p>}
              </td>
              <td className="table-cell align-top">
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_META[r.status]?.cls || ''}`}>
                    {STATUS_META[r.status]?.label || r.status}
                  </span>
                  <select value={r.status} onChange={e => setStatus(r.id, e.target.value)}
                    className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-600">
                    <option value="NEW">Mới</option>
                    <option value="CONTACTED">Đã gọi</option>
                    <option value="DONE">Đã dẫn xem</option>
                    <option value="CANCELLED">Huỷ</option>
                  </select>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
