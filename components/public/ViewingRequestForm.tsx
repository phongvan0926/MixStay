'use client';
import { useState } from 'react';

/**
 * "Đặt lịch xem phòng" — ô để lại SĐT ngay trên trang tin.
 *
 * Trước đây link share là brochure cụt: khách xem xong không để lại gì (70 lượt xem link
 * → 1 lượt lưu tin), nên CTV không có lý do gửi link. Nay mỗi lead gửi từ link của CTV nào
 * sẽ được ghi công cho CTV đó (server tự suy từ token — client không gửi brokerId).
 */
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
        body: JSON.stringify({ roomTypeId, phone: digits, name, note, shareToken, companyId }),
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

      <div className="mt-2">
        <label className="block text-xs font-medium text-stone-600 mb-1">Bạn muốn xem lúc nào? (tuỳ chọn)</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          className="input-field text-sm" placeholder="VD: Chiều mai sau 18h, hoặc cuối tuần" />
      </div>

      <button type="button" onClick={submit} disabled={state === 'sending'}
        className="btn-primary w-full mt-3 py-3 text-sm disabled:opacity-60">
        {state === 'sending' ? 'Đang gửi…' : 'Gửi yêu cầu xem phòng'}
      </button>

      {state === 'error' && <p className="text-xs text-red-500 mt-1.5">{errMsg}</p>}
    </div>
  );
}
