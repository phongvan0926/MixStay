'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { SkeletonText } from '@/components/ui/Skeleton';

/**
 * Hồ sơ cộng tác viên — nơi DUY NHẤT để CTV tự điền số điện thoại.
 * SĐT bắt buộc vì mọi nút liên hệ trên link chia sẻ (Zalo + gọi) deeplink về số này;
 * thiếu SĐT thì API /api/share-links chặn tạo link (code PHONE_REQUIRED).
 */
export default function BrokerProfilePage() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  // ?need=phone → điều hướng từ chỗ tạo link bị chặn, nhấn mạnh ô SĐT.
  const needPhone = searchParams.get('need') === 'phone';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => res.json())
      .then(u => setForm({ name: u.name || '', phone: u.phone || '', email: u.email || '' }))
      .catch(() => toast.error('Không tải được hồ sơ'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.replace(/\s/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Không lưu được');
        return;
      }
      setForm(f => ({ ...f, name: data.name || '', phone: data.phone || '' }));
      // Đẩy phone mới vào JWT ngay để các trang khác hết cảnh báo (không phải chờ refresh 60s).
      await update();
      toast.success('Đã lưu hồ sơ! Link chia sẻ của bạn sẽ dùng số này để khách liên hệ.');
    } finally {
      setSaving(false);
    }
  };

  const missingPhone = !loading && !form.phone.trim();

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Hồ sơ của tôi</h1>
        <p className="text-sm text-stone-500 mt-1">Khách xem link chia sẻ sẽ liên hệ bạn qua thông tin này</p>
      </div>

      {(needPhone || missingPhone) && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800 text-sm">📞 Cần số điện thoại để tạo link chia sẻ</p>
          <p className="text-sm text-amber-700 mt-1">
            Nút <strong>Zalo</strong> và <strong>Gọi ngay</strong> trên link chia sẻ deeplink thẳng về số của bạn.
            Chưa có số → khách sẽ gọi vào hotline công ty và bạn <strong>mất khách</strong>.
          </p>
        </div>
      )}

      {loading ? (
        <div className="card"><SkeletonText lines={4} /></div>
      ) : (
        <form onSubmit={save} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Họ và tên</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="input-field"
              placeholder="Nguyễn Văn A"
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Số điện thoại (Zalo) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className={`input-field ${missingPhone ? 'border-amber-400 ring-1 ring-amber-200' : ''}`}
              placeholder="0912345678"
              required
              autoFocus={needPhone}
            />
            <p className="text-xs text-stone-400 mt-1">Dùng cho nút Zalo + Gọi ngay trên mọi link bạn chia sẻ.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input type="email" value={form.email} className="input-field bg-stone-50 text-stone-500" disabled />
            <p className="text-xs text-stone-400 mt-1">Liên hệ quản trị viên nếu cần đổi email đăng nhập.</p>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
            {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </form>
      )}

      {session?.user?.role === 'BROKER' && !missingPhone && !loading && (
        <p className="text-xs text-stone-400 mt-4">
          ✅ Link chia sẻ của bạn đang định tuyến liên hệ về số <strong className="text-stone-600">{form.phone}</strong>.
        </p>
      )}
    </div>
  );
}
