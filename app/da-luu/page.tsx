import type { Metadata } from 'next';
import SavedCompareClient from './SavedClient';
import SupportFabs from '@/components/public/SupportFabs';

// Vỏ SERVER cho trang so sánh tin đã lưu. Phần thân là client component (đọc localStorage
// của khách vãng lai) nên không tự đọc được Cài đặt — tách ra để nút liên hệ vẫn lấy được
// hotline từ /admin/settings giống mọi trang công khai khác.
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Tin đã lưu',
  description: 'So sánh các tin phòng bạn đã lưu: giá, giá mỗi m², diện tích, đặt cọc và tiện ích.',
  // Danh sách lưu nằm trong máy từng khách — không có gì để Google lập chỉ mục.
  robots: { index: false, follow: true },
};

export default function SavedComparePage() {
  return (
    <>
      <SavedCompareClient />
      <SupportFabs />
    </>
  );
}
