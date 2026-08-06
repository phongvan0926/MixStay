import CallFab from '@/components/ui/CallFab';
import ZaloFab from '@/components/ui/ZaloFab';
import { getSupportContact } from '@/lib/contact-server';

/**
 * Cặp nút nổi LIÊN HỆ CÔNG TY cho mọi trang công khai: 💬 Zalo (dưới) + 📞 Gọi (trên).
 *
 * Trước 06/08/2026 các trang công khai chỉ có nút GỌI, thiếu hẳn nút Zalo — trong khi
 * phần lớn khách thuê phòng nhắn Zalo chứ ngại gọi. Gom vào một component để không còn
 * cảnh trang có trang không, và để số hotline lấy từ Cài đặt admin ở đúng MỘT chỗ.
 *
 * Server component (đọc DB): trang dùng nó PHẢI có `export const revalidate = …`,
 * nếu không Next dựng tĩnh lúc build và số hotline sẽ không đổi theo Cài đặt.
 */
export default async function SupportFabs() {
  const contact = await getSupportContact();
  return (
    <>
      <ZaloFab href={contact.zalo} />
      {/* stacked: nâng lên trên ZaloFab cho khỏi chồng nhau */}
      <CallFab phone={contact.phone} display={contact.display} stacked />
    </>
  );
}
