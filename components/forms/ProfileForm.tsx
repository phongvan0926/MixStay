'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import AvatarUpload from '@/components/ui/AvatarUpload';
import { SkeletonText } from '@/components/ui/Skeleton';

/**
 * Hồ sơ CÁ NHÂN dùng chung cho CTV và CHỦ NHÀ (trước đây chỉ CTV có, và không đổi được ảnh).
 *
 * Ảnh đại diện ở đây hiện ở MỌI nơi: topbar dashboard, thanh điều hướng công khai, và trên
 * đầu mọi link chia sẻ do người này tạo — nên khách biết đang xem hàng của ai.
 *
 * `showCompany` = true (chủ nhà): kèm khối sửa LOGO CÔNG TY, chỉ hiện khi công ty do chính
 * họ tạo (API /api/me/company trả canEdit).
 */
type Props = {
  /** ?need=phone → điều hướng từ chỗ tạo link bị chặn, nhấn mạnh ô SĐT */
  needPhone?: boolean;
  showCompany?: boolean;
};

type Company = {
  id: string;
  name: string;
  logo: string | null;
  phone: string | null;
  zaloGroupLink: string | null;
};

export default function ProfileForm({ needPhone = false, showCompany = false }: Props) {
  const { data: session, update } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', avatar: '' });

  const [company, setCompany] = useState<Company | null>(null);
  const [canEditCompany, setCanEditCompany] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => res.json())
      .then(u =>
        setForm({ name: u.name || '', phone: u.phone || '', email: u.email || '', avatar: u.avatar || '' }),
      )
      .catch(() => toast.error('Không tải được hồ sơ'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!showCompany) return;
    fetch('/api/me/company')
      .then(res => res.json())
      .then(d => {
        setCompany(d.company || null);
        setCanEditCompany(!!d.canEdit);
      })
      .catch(() => {});
  }, [showCompany]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.replace(/\s/g, ''),
          avatar: form.avatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Không lưu được');
        return;
      }
      setForm(f => ({ ...f, name: data.name || '', phone: data.phone || '', avatar: data.avatar || '' }));
      // Đẩy thông tin mới vào JWT ngay để topbar/ảnh đại diện đổi liền, khỏi chờ refresh.
      await update();
      toast.success('Đã lưu hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  /** Logo công ty lưu ngay khi chọn ảnh — không bắt bấm thêm nút Lưu cho một thao tác. */
  const saveCompanyLogo = async (url: string) => {
    if (!company) return;
    setCompany({ ...company, logo: url || null });
    setSavingCompany(true);
    try {
      const res = await fetch('/api/me/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: company.id, logo: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Không lưu được logo công ty');
        return;
      }
      toast.success('Đã cập nhật logo công ty');
    } finally {
      setSavingCompany(false);
    }
  };

  const missingPhone = !loading && !form.phone.trim();
  const isBroker = session?.user?.role === 'BROKER';

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Hồ sơ của tôi</h1>
        <p className="text-sm text-stone-500 mt-1">
          Khách xem link chia sẻ sẽ thấy ảnh đại diện và liên hệ bạn qua thông tin này
        </p>
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
        <form onSubmit={save} className="card space-y-5">
          <AvatarUpload
            value={form.avatar}
            onChange={url => setForm(f => ({ ...f, avatar: url }))}
            folder="avatars"
            name={form.name}
            label="Ảnh đại diện / logo"
            hint="Hiện trên đầu mọi link chia sẻ của bạn và ở góc trên màn hình quản lý. Ảnh vuông cho đẹp nhất."
          />

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

      {showCompany && company && (
        <div className="card mt-5">
          <h2 className="font-display font-semibold mb-1">Logo công ty</h2>
          <p className="text-sm text-stone-500 mb-4">
            Hiện trên trang kho phòng <strong>{company.name}</strong> và trên mọi tin đăng thuộc công ty.
          </p>
          {canEditCompany ? (
            <AvatarUpload
              value={company.logo}
              onChange={saveCompanyLogo}
              folder="logos"
              name={company.name}
              shape="rounded"
              label=""
              hint={savingCompany ? 'Đang lưu...' : 'Chọn ảnh là lưu ngay, không cần bấm thêm.'}
            />
          ) : (
            <div className="flex items-center gap-3 text-sm text-stone-500">
              <span>
                Công ty này do quản trị viên tạo nên bạn không sửa được logo. Liên hệ quản trị viên nếu cần đổi.
              </span>
            </div>
          )}
        </div>
      )}

      {isBroker && !missingPhone && !loading && (
        <p className="text-xs text-stone-400 mt-4">
          ✅ Link chia sẻ của bạn đang định tuyến liên hệ về số <strong className="text-stone-600">{form.phone}</strong>.
        </p>
      )}
    </div>
  );
}
