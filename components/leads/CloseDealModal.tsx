'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

/**
 * Hỏi kết quả ngay khi admin/CTV đánh dấu lead là "🟢 Đã dẫn xem".
 *
 * Vì sao có: đo 19/08/2026 — 44 lead đã vào, 0 giao dịch được ghi. Không phải vì không chốt
 * được khách, mà vì chốt xong KHÔNG CÓ CHỖ GHI: muốn ghi phải mò sang trang Giao dịch rồi
 * nhập tay lại từ đầu (phòng nào, khách nào, SĐT bao nhiêu) — không ai làm thế. Chừng nào
 * chưa có dòng doanh thu thì mọi con số khác (tỉ lệ chốt, hoa hồng CTV, hiệu quả kênh) đều
 * không tính được.
 *
 * Nguyên tắc: KHÔNG ép. "Chưa chốt" là câu trả lời hợp lệ và là nút to ngang nút kia —
 * bắt buộc nhập tiền mới cho đổi trạng thái thì admin sẽ né luôn việc đổi trạng thái.
 */
export default function CloseDealModal({
  lead, onClose, onDone,
}: {
  lead: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const askPrice = lead?.roomType?.priceMonthly || 0;
  const [price, setPrice] = useState<string>(askPrice ? String(askPrice) : '');
  const [commission, setCommission] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const priceNum = Number(price) || 0;
  // Mặc định hoa hồng = nửa tháng tiền thuê (thông lệ thị trường) — sửa được, để trống thì server tự tính
  const commissionNum = commission === '' ? priceNum * 0.5 : Number(commission) || 0;

  const submit = async (withDeal: boolean) => {
    setSaving(true);
    try {
      if (withDeal) {
        if (priceNum <= 0) { toast.error('Nhập giá thuê đã chốt'); setSaving(false); return; }
        const res = await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Chỉ gửi tiền + ghi chú: phòng nào/khách nào/CTV nào do SERVER đọc từ lead
          body: JSON.stringify({
            viewingRequestId: lead.id,
            dealPrice: priceNum,
            commissionTotal: commissionNum,
            notes: notes.trim() || null,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(json.error || 'Không ghi được giao dịch');
          setSaving(false);
          return;
        }
      }
      // Dù chốt hay không, lead vẫn chuyển sang "đã dẫn xem" — đó là việc admin vừa làm
      const r2 = await fetch('/api/viewing-requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, status: 'DONE' }),
      });
      if (!r2.ok) { toast.error('Không cập nhật được trạng thái'); setSaving(false); return; }
      toast.success(withDeal ? `Đã ghi giao dịch ${formatCurrency(priceNum)}` : 'Đã đánh dấu đã dẫn xem');
      onDone();
      onClose();
    } catch {
      toast.error('Lỗi mạng');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold text-stone-900">Khách này có thuê không?</h3>
        <p className="text-sm text-stone-500 mt-1">
          {lead?.name || 'Khách'} · {lead?.phone} — {lead?.roomType?.listingCode || ''} {lead?.roomType?.name}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Giá thuê đã chốt *</label>
            <input type="number" inputMode="numeric" className="input-field" value={price}
              onChange={e => setPrice(e.target.value)} placeholder="VD: 4000000" />
            {askPrice > 0 && (
              <p className="text-[11px] text-stone-400 mt-1">
                Giá rao: {formatCurrency(askPrice)} — sửa lại nếu khách mặc cả được.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Hoa hồng thu được</label>
            <input type="number" inputMode="numeric" className="input-field" value={commission}
              onChange={e => setCommission(e.target.value)}
              placeholder={priceNum ? String(priceNum * 0.5) : 'Để trống = nửa tháng tiền thuê'} />
            <p className="text-[11px] text-stone-400 mt-1">
              Để trống = nửa tháng tiền thuê ({formatCurrency(priceNum * 0.5)}). Phần chia CTV/công ty tính tự động theo Cài đặt.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Ghi chú</label>
            <input type="text" className="input-field" value={notes} maxLength={300}
              onChange={e => setNotes(e.target.value)} placeholder="VD: dọn vào 1/9, cọc 1 tháng" />
          </div>
          {lead?.broker?.name ? (
            <p className="text-xs text-stone-500">Ghi công cộng tác viên: <strong className="text-stone-700">{lead.broker.name}</strong></p>
          ) : (
            <p className="text-xs text-stone-500">Khách tự tìm đến web — giao dịch ghi cho <strong className="text-stone-700">công ty</strong>, không có CTV.</p>
          )}
        </div>

        {/* "Chưa chốt" to ngang "Đã chốt": ép nhập tiền mới cho đổi trạng thái thì admin né luôn */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" disabled={saving} onClick={() => submit(false)}
            className="btn-ghost border border-stone-200 py-2.5 disabled:opacity-50">
            Chưa chốt được
          </button>
          <button type="button" disabled={saving} onClick={() => submit(true)}
            className="btn-primary py-2.5 disabled:opacity-50">
            {saving ? 'Đang lưu…' : '💰 Đã chốt — ghi giao dịch'}
          </button>
        </div>
        <button type="button" onClick={onClose} className="w-full mt-2 text-xs text-stone-400 hover:text-stone-600 py-2">
          Để sau
        </button>
      </div>
    </div>
  );
}
