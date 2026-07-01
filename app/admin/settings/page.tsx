'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [brokerPercent, setBrokerPercent] = useState('60');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data.commission_broker_percent) setBrokerPercent(data.commission_broker_percent);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'commission_broker_percent', value: brokerPercent }),
    });
    toast.success('Đã lưu cài đặt!');
    setLoading(false);
  };

  const companyPercent = 100 - parseFloat(brokerPercent || '0');

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Cài đặt</h1>

      <div className="card max-w-lg">
        <h2 className="font-display font-semibold text-lg mb-4">Tỷ lệ chia hoa hồng</h2>
        <p className="text-sm text-stone-500 mb-6">Cấu hình phần trăm hoa hồng chia cho cộng tác viên và công ty khi deal thành công.</p>

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
  );
}
