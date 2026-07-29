'use client';
import ProfileForm from '@/components/forms/ProfileForm';

/**
 * Hồ sơ chủ nhà — trước đây chủ nhà KHÔNG có màn hình nào để tự sửa thông tin của mình
 * (phải nhờ admin sửa hộ qua /admin/users). Kèm khối đổi LOGO CÔNG TY khi công ty đó
 * do chính họ tạo, vì logo này hiện trên trang kho phòng công ty mà họ đi chia sẻ.
 */
export default function LandlordProfilePage() {
  return <ProfileForm showCompany />;
}
