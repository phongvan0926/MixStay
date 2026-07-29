'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ProfileForm from '@/components/forms/ProfileForm';

/**
 * Hồ sơ cộng tác viên — nơi DUY NHẤT để CTV tự điền số điện thoại và đặt ảnh đại diện.
 * SĐT bắt buộc vì mọi nút liên hệ trên link chia sẻ (Zalo + gọi) deeplink về số này;
 * thiếu SĐT thì API /api/share-links chặn tạo link (code PHONE_REQUIRED).
 */
function BrokerProfileInner() {
  const searchParams = useSearchParams();
  return <ProfileForm needPhone={searchParams.get('need') === 'phone'} />;
}

export default function BrokerProfilePage() {
  return (
    <Suspense fallback={null}>
      <BrokerProfileInner />
    </Suspense>
  );
}
