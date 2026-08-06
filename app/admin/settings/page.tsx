'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { checkPhone, formatPhone } from '@/lib/phone';

/**
 * Cài đặt hệ thống.
 *
 * "Hotline công ty" (thêm 06/08/2026): trước đây số hotline nằm CHÉP CỨNG trong code ở 5 chỗ,
 * mỗi lần công ty đổi số phải sửa code + deploy lại — và suýt sót chỗ khiến khách gọi vào số
 * đã ngắt. Nay lưu ở bảng `settings`, mọi trang công khai đọc qua getSupportContact().
 */
export default function AdminSettingsPage() {
  const [brokerPercent, setBrokerPercent] = useState('60');
  const [phone, setPhone] = useState('');
  const [zalo, setZalo] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data.commission_broker_percent) setBrokerPercent(data.commission_broker_percent);
      if (data.support_phone) setPhone(data.support_phone);
      if (data.support_zalo) setZalo(data.support_zalo);
    }).catch(() => {});
  }, []);

  const saveKey = async (key: string, value: string) => {
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || 'Lưu không được');
    }
    return res.json();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveKey('commission_broker_percent', brokerPercent);
      toast.success('Đã lưu cài đặt!');
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      const saved = await saveKey('support_phone', phone);
      await saveKey('support_zalo', zalo);
      setPhone(saved.value); // server trả về dạng đã chuẩn hoá 10 số
      toast.success('Đã đổi hotline — toàn bộ trang công khai cập nhật trong ~10 phút');
    } catch (e: any) { toast.error(e.message); }
    setSavingContact(false);
  };

  const companyPercent = 100 - parseFloat(brokerPercent || '0');
  const check = checkPhone(phone);
  const preview = check.phone || '';

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Cài đặt</h1>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* ===== Hotline công ty ===== */}
        <div className="card">
          <h2 className="font-display font-semibold text-lg mb-1">☎️ Hotline công ty</h2>
          <p className="text-sm text-stone-500 mb-5">
            Số này hiện ở nút gọi nổi, nút Zalo và chân trang trên <strong>mọi trang khách xem</strong>.
            Đổi ở đây là đổi toàn bộ, không cần sửa code.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Số hotline</label>
              <input
                type="tel" inputMode="numeric" className="input-field" placeholder="VD: 0352871177"
                value={phone} onChange={e => setPhone(e.target.value)}
              />
              {check.status === 'invalid' && (
                <p className="text-xs text-red-600 mt-1.5">❌ {check.reason} — chưa lưu được.</p>
              )}
              {check.status === 'messy' && (
                <p className="text-xs text-amber-600 mt-1.5">⚠️ Sẽ tự dọn thành {formatPhone(preview)} khi lưu.</p>
              )}
              {check.status === 'ok' && (
                <p className="text-xs text-emerald-600 mt-1.5">✅ Số hợp lệ</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Link Zalo <span className="font-normal text-stone-400">(để trống nếu muốn chat thẳng vào số trên)</span>
              </label>
              <input
                type="url" className="input-field" placeholder="VD: https://zalo.me/g/abcxyz123 (link nhóm)"
                value={zalo} onChange={e => setZalo(e.target.value)}
              />
              <p className="text-xs text-stone-400 mt-1">
                Điền link <strong>nhóm</strong> Zalo nếu muốn khách vào nhóm tư vấn thay vì chat riêng.
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl">
              <p className="text-xs text-stone-500 mb-2">Khách sẽ thấy</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 text-white px-4 py-2 text-sm font-semibold">
                  📞 Hotline {preview ? formatPhone(preview) : '—'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0068FF] text-white px-4 py-2 text-sm font-semibold">
                  💬 Tư vấn Zalo
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-2 break-all">
                Bấm Zalo mở: {zalo || (preview ? `https://zalo.me/${preview}` : '—')}
              </p>
            </div>

            <button onClick={handleSaveContact} className="btn-primary"
              disabled={savingContact || check.status === 'invalid' || !phone}>
              {savingContact ? 'Đang lưu…' : 'Lưu hotline'}
            </button>
          </div>
        </div>

        {/* ===== Hoa hồng ===== */}
        <div className="card">
          <h2 className="font-display font-semibold text-lg mb-1">Tỷ lệ chia hoa hồng</h2>
          <p className="text-sm text-stone-500 mb-5">Cấu hình phần trăm hoa hồng chia cho cộng tác viên và công ty khi deal thành công.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Tỷ lệ Cộng tác viên (%)</label>
              <input type="number" min="0" max="100" className="input-field" value={brokerPercent}
                onChange={e => setBrokerPercent(e.target.value)} />
            </div>
            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
              <div className="flex-1">
                <p className="text-xs text-stone-500">Cộng tác viên nhận</p>
                <p className="text-lg font-bold text-orange-600">{brokerPercent}%</p>
              </div>
              <div className="text-stone-300 text-lg">/</div>
              <div className="flex-1">
                <p className="text-xs text-stone-500">Công ty nhận</p>
                <p className="text-lg font-bold text-purple-600">{Math.round(companyPercent)}%</p>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
              <strong>Ví dụ:</strong> Deal hoa hồng 5,000,000đ → CTV nhận {new Intl.NumberFormat('vi-VN').format(5000000 * parseFloat(brokerPercent || '0') / 100)}đ, CT nhận {new Intl.NumberFormat('vi-VN').format(5000000 * companyPercent / 100)}đ
            </div>
            <button onClick={handleSave} className="btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
