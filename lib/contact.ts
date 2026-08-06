/**
 * HOTLINE CÔNG TY — GIÁ TRỊ DỰ PHÒNG.
 *
 * 👉 Đổi hotline thì vào trang Cài đặt của admin (mục "Hotline công ty"), KHÔNG sửa file này.
 * Số thật lưu ở bảng `settings` và đọc bằng `getSupportContact()` (lib/contact-server.ts);
 * các hằng số dưới đây chỉ dùng khi admin chưa từng đặt hoặc DB đọc lỗi.
 *
 * Vì sao gom lại: số cũ (0379 838 222) từng được chép cứng ở 5 chỗ rời nhau (footer trang chủ,
 * CallFab, 2 trang share link, nút hỗ trợ CTV). Lần đổi số 06/08/2026 phải đi lùng từng chỗ,
 * sót một chỗ là khách còn gọi vào số đã ngắt.
 *
 * ⚠️ Đây là hotline CHUNG của công ty. KHÁC hoàn toàn với:
 *   - `Company.phone` / `Company.zaloGroupLink` — SĐT riêng của TỪNG công ty đối tác trên nền tảng
 *   - `User.phone` — SĐT cá nhân của CTV / chủ nhà (lib/zalo.ts định tuyến về đúng người giữ link
 *     để không cướp lead của họ)
 * Đừng bao giờ lấy hằng số ở đây ghi đè 2 loại trên.
 */

/** Dạng bấm gọi được: dùng cho href="tel:" và deeplink zalo.me/ */
export const SUPPORT_PHONE = '0352871177';

/** Dạng hiển thị cho người đọc */
export const SUPPORT_PHONE_DISPLAY = '0352 871 177';

/**
 * Link Zalo hỗ trợ chung. Cho phép env ghi đè để trỏ về NHÓM Zalo thay vì chat cá nhân,
 * nhưng mặc định luôn bám theo SUPPORT_PHONE ở trên — không còn số cứng nằm rải rác.
 */
export const SUPPORT_ZALO =
  process.env.NEXT_PUBLIC_SUPPORT_ZALO || `https://zalo.me/${SUPPORT_PHONE}`;
