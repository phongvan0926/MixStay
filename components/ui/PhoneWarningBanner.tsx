'use client';
import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { checkPhone } from '@/lib/phone';

/**
 * Cảnh báo SĐT sai định dạng — hiện trên mọi trang quản trị của CHÍNH chủ tài khoản đó.
 *
 * Vì sao có (rà soát 06/08/2026): công ty BNBHOLDING lưu "09366258556" (11 chữ số) suốt
 * nhiều tháng mà không ai biết — khách bấm gọi không ra, hệ thống chưa từng kiểm định dạng
 * SĐT ở bất kỳ đâu. Với CTV/chủ nhà thì SĐT sai còn nghiêm trọng hơn: link Zalo trên tin
 * đăng của họ dẫn đi đâu không rõ, khách mất là mất luôn.
 *
 * Chỉ cảnh báo khi THỰC SỰ không bóc được số gọi được (checkPhone → 'invalid').
 * Số ghi kèm tên kiểu "Lâm 0394632595" vẫn bấm gọi ngon nên KHÔNG làm phiền.
 *
 * Cho phép tắt: người dùng bấm "Số này đúng" → lưu `phoneConfirmedAt`, không nhắc lại.
 * Đổi số khác thì server tự xoá xác nhận → số mới lại được kiểm từ đầu.
 */
export default function PhoneWarningBanner({
  phone,
  confirmedAt,
  profileHref,
  onConfirmed,
}: {
  phone?: string | null;
  confirmedAt?: string | null;
  /** Trang hồ sơ để bấm "Sửa số" — mỗi vai trò một đường dẫn khác nhau */
  profileHref: string;
  onConfirmed?: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const check = checkPhone(phone);

  if (hidden || confirmedAt || check.status !== 'invalid') return null;

  const confirm = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneConfirmed: true }),
      });
      if (!res.ok) throw new Error();
      setHidden(true);
      onConfirmed?.();
      toast.success('Đã ghi nhận — sẽ không nhắc lại số này nữa');
    } catch {
      toast.error('Không lưu được, thử lại giúp mình nhé');
    }
    setSaving(false);
  };

  return (
    <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="text-xl leading-none" aria-hidden>⚠️</span>
        <div className="flex-1 min-w-[16rem]">
          <p className="font-semibold text-amber-900">Số điện thoại của bạn có thể sai</p>
          <p className="text-sm text-amber-800 mt-0.5">
            Đang lưu <strong className="font-mono">{phone}</strong> — {check.reason}.
            Khách bấm gọi hoặc nhắn Zalo vào số này sẽ không tới được bạn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={profileHref} className="btn-primary px-4 py-2 text-sm whitespace-nowrap">
            Sửa số
          </Link>
          <button
            type="button" onClick={confirm} disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-amber-300 bg-white text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap disabled:opacity-60"
          >
            {saving ? 'Đang lưu…' : 'Số này đúng'}
          </button>
        </div>
      </div>
    </div>
  );
}
