'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

/**
 * Nhắc CTV bổ sung SĐT — hiện ở các trang có nút tạo link chia sẻ.
 * API /api/share-links CHẶN tạo link khi CTV chưa có SĐT (code PHONE_REQUIRED); banner này để
 * họ biết trước thay vì bấm rồi mới báo lỗi. Chỉ hiện với BROKER và chỉ khi thiếu SĐT.
 */
export default function PhoneRequiredNotice() {
  const { data: session, status } = useSession();
  if (status !== 'authenticated') return null;

  const user = session?.user as any;
  if (user?.role !== 'BROKER' || user?.phone?.trim()) return null;

  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-amber-800 text-sm">📞 Bạn chưa có số điện thoại trong hồ sơ</p>
        <p className="text-sm text-amber-700 mt-0.5">
          Chưa có số thì <strong>không tạo được link chia sẻ</strong> — nút Zalo và Gọi ngay trên link phải
          deeplink về đúng số của bạn, nếu không khách sẽ gọi vào hotline công ty và bạn mất khách.
        </p>
      </div>
      <Link href="/broker/profile?need=phone" className="btn-primary shrink-0 text-center whitespace-nowrap">
        Cập nhật ngay
      </Link>
    </div>
  );
}
