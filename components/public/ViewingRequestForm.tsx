'use client';
import { useState } from 'react';

/**
 * "Đặt lịch xem phòng" — ô để lại SĐT ngay trên trang tin.
 *
 * Trước đây link share là brochure cụt: khách xem xong không để lại gì (70 lượt xem link
 * → 1 lượt lưu tin), nên CTV không có lý do gửi link. Nay mỗi lead gửi từ link của CTV nào
 * sẽ được ghi công cho CTV đó (server tự suy từ token — client không gửi brokerId).
 */
/** Ngày local dạng YYYY-MM-DD — KHÔNG dùng toISOString() (nó quy về UTC, lệch ngày ở VN). */
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const todayISO = () => isoLocal(new Date());
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return isoLocal(d); };

/** Nút chọn nhanh — phủ gần hết ca thật đọc được trong dữ liệu ("sáng mai", "cuối tuần"). */
const QUICK_DAYS = [
  { key: 'today', label: 'Hôm nay', value: () => todayISO() },
  { key: 'tomorrow', label: 'Ngày mai', value: () => plusDays(1) },
  { key: 'day3', label: 'Ngày kia', value: () => plusDays(2) },
];
const SLOTS = [
  { value: 'morning', label: '🌅 Sáng' },
  { value: 'afternoon', label: '☀️ Chiều' },
  { value: 'evening', label: '🌙 Tối' },
];

export default function ViewingRequestForm({
  roomTypeId,
  shareToken,
  companyId,
  contactName,
}: {
  roomTypeId: string;
  shareToken?: string | null;
  companyId?: string | null;
  contactName?: string | null;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');   // YYYY-MM-DD, '' = khách không chọn
  const [slot, setSlot] = useState('');   // morning | afternoon | evening
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const submit = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!/^0\d{9}$/.test(digits)) {
      setState('error');
      setErrMsg('Số điện thoại chưa đúng — cần 10 số, bắt đầu bằng 0.');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/viewing-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomTypeId, phone: digits, name, note, shareToken, companyId,
          preferredDate: date || null, preferredSlot: date ? slot || null : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setState('error');
        setErrMsg(j.error || 'Gửi không được, thử lại giúp mình nhé.');
        return;
      }
      setState('done');
    } catch {
      setState('error');
      setErrMsg('Lỗi mạng — thử lại giúp mình nhé.');
    }
  };

  if (state === 'done') {
    return (
      <div className="card border-emerald-200 bg-emerald-50/70 text-center py-6">
        <p className="text-2xl mb-1">✅</p>
        <p className="font-display font-semibold text-emerald-900">Đã nhận yêu cầu xem phòng!</p>
        <p className="text-sm text-emerald-800 mt-1">
          {contactName ? `${contactName} sẽ` : 'Chúng tôi sẽ'} gọi/Zalo lại cho bạn để hẹn giờ xem phòng.
        </p>
      </div>
    );
  }

  return (
    <div className="card border-brand-200 bg-gradient-to-br from-brand-50/70 to-white">
      <h2 className="font-display font-semibold text-lg">📅 Đặt lịch xem phòng</h2>
      <p className="text-sm text-stone-500 mt-0.5 mb-3">
        Để lại số điện thoại — {contactName || 'chúng tôi'} gọi lại hẹn giờ dẫn bạn đi xem. Hoàn toàn miễn phí cho người thuê.
      </p>

      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Tên bạn (tuỳ chọn)</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="input-field text-sm" placeholder="VD: Anh Nam" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">SĐT/Zalo *</label>
          <input type="tel" inputMode="numeric" value={phone}
            onChange={e => { setPhone(e.target.value); if (state === 'error') setState('idle'); }}
            className="input-field text-sm" placeholder="09xxxxxxxx" />
        </div>
      </div>

      {/* LỊCH HẸN CHỌN ĐƯỢC, không gõ tay. Trước đây khách gõ "sáng mai" / "8h sáng Chủ nhật
          16.8" vào ô chữ tự do → admin phải đọc từng dòng để biết ai hẹn giờ nào, mùa cao
          điểm lead dồn dập là lỡ hẹn. Nút nhanh phủ 90% ca thật; ai cần ngày khác thì mở
          lịch. Vẫn giữ ô ghi chú cho yêu cầu riêng. */}
      <div className="mt-3">
        <label className="block text-xs font-medium text-stone-600 mb-1.5">Bạn muốn xem khi nào? (tuỳ chọn)</label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_DAYS.map(d => (
            <button key={d.key} type="button" onClick={() => setDate(date === d.value() ? '' : d.value())}
              className={`inline-flex items-center min-h-11 sm:min-h-9 px-3 rounded-xl text-xs font-medium border transition-colors ${
                date === d.value()
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-brand-300'
              }`}>
              {d.label}
            </button>
          ))}
          <input type="date" value={date} min={todayISO()}
            onChange={e => setDate(e.target.value)}
            aria-label="Chọn ngày khác"
            className="input-field text-xs w-auto min-h-11 sm:min-h-9 py-0 px-2" />
        </div>

        {date && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {SLOTS.map(s => (
              <button key={s.value} type="button" onClick={() => setSlot(slot === s.value ? '' : s.value)}
                className={`inline-flex items-center min-h-11 sm:min-h-9 px-3 rounded-xl text-xs font-medium border transition-colors ${
                  slot === s.value
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-brand-300'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2">
        <label className="block text-xs font-medium text-stone-600 mb-1">Ghi chú thêm (tuỳ chọn)</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          className="input-field text-sm" placeholder="VD: đi cùng bạn, cần chỗ để ô tô…" />
      </div>

      <button type="button" onClick={submit} disabled={state === 'sending'}
        className="btn-primary w-full mt-3 py-3 text-sm disabled:opacity-60">
        {state === 'sending' ? 'Đang gửi…' : 'Gửi yêu cầu xem phòng'}
      </button>

      {state === 'error' && <p className="text-xs text-red-500 mt-1.5">{errMsg}</p>}
    </div>
  );
}
