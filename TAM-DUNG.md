# ⏸️ MixStay đang TẠM DỪNG — sổ tay khởi động lại

**Tạm dừng từ:** 23/09/2026, theo quyết định của chủ dự án: chưa có nhân sự phát triển nên
đưa chi phí về 0đ bằng cách tắt Vercel + Supabase. Dữ liệu đã sao lưu và **đã khôi phục thử
thành công** trước khi tắt.

> AI agent đọc file này: dự án đang ngủ, **production KHÔNG còn chạy**. Đừng cố gọi DB,
> đừng chạy `scripts/backup-storage.js` (cloud không còn). Muốn làm tiếp → theo mục 3.

## 1. Dữ liệu đang nằm ở đâu

Mọi thứ trên **ổ SSD Samsung gắn trong máy**, `/srv/data/MixStay/`:

| Thứ | Đường dẫn | Ghi chú |
|---|---|---|
| Database (định dạng pg_dump) | `db/mixstay-2026-09-23.dump` | Dùng file này để khôi phục |
| Database (SQL đọc được) | `db/mixstay-2026-09-23.sql` | Dự phòng, mở bằng mắt được |
| Ảnh + video | `storage/` (properties/, rooms/, videos/) | 5.714 file, 4,6 GB, đủ 100% |
| Danh mục ảnh | `storage/manifest.json` | Đường dẫn gốc của từng file |
| Khoá bí mật (.env) | `secrets/env-2026-09-23` | Quyền 600, KHÔNG commit |
| Mã băm kiểm tra | `db/SHA256SUMS` | `cd /srv/data/MixStay && sha256sum -c db/SHA256SUMS` |

**Bản sao ngoài nhà (có sẵn, không phải tự làm):** backup chung của máy (restic, do phiên
"Phong Prosucker - Remote + Repo ĐM LL" quản lý) đã gồm `/srv/data/MixStay` và `~/Desktop/MixStay`
(kể cả `.env`). Kho restic ở `/srv/data/backup` chạy ~03:08 hằng đêm và được **mã hoá AES-256**.
Nguyên kho được rclone copy lên Google Drive 5 TiB (`gdrive-backup:backup-may`) lúc 05:00.
Muốn lấy lại từ Drive thì cần **mật khẩu kho restic**, anh Phong đã cất riêng ngoài máy.
Kho nội bộ chỉ giữ tối đa ~6 tháng. Bản trên Drive không bị xoá (rclone copy chỉ thêm).
⚠️ ĐỪNG chạy `rclone config` trên remote `gdrive-backup` (scope drive.file, đổi là mất quyền thấy file cũ).

Mã nguồn: GitHub (miễn phí) + thư mục này. Commit cuối trước khi dừng: `485d693`.

Số dòng lúc sao lưu (đã khớp 14/14 bảng khi khôi phục thử):
users 112 · properties 432 · room_types 805 · viewing_requests 53 · saved_searches 20 ·
companies 44 · accounts 50 · share_links 17 · notifications 1231 · audit_logs 228 ·
room_inquiries 4 · settings 3 · saved_listings 1 · deals 0.

⚠️ Bản dump chứa **SĐT và tên khách thật**. Không đưa lên GitHub, không gửi qua chat.

## 2. Những gì KHÔNG nằm trong bản sao lưu

- **Schema `auth`/`storage` của Supabase**: không cần. Đăng nhập do NextAuth tự quản trong
  bảng `users`/`accounts` (đã có). File ảnh khôi phục bằng cách upload lại (mục 3.3).
- **Mật khẩu người dùng** nằm trong bảng `users` dạng đã băm → khôi phục là đăng nhập lại
  được như cũ, không ai phải đặt lại mật khẩu.
- **Khoá Supabase** (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`,
  `DIRECT_URL`) sẽ **chết** khi xoá project → lúc mở lại phải lấy khoá của project MỚI.
  Các khoá còn dùng lại được: `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_*`, `GEMINI_API_KEY*`.

## 3. Khởi động lại (khi có nhân sự)

Ước lượng: 1–2 giờ, phần lâu nhất là upload lại 4,6 GB ảnh.

### 3.1 Kiểm file còn nguyên
```bash
cd /srv/data/MixStay && sha256sum -c db/SHA256SUMS   # phải ra 3 dòng OK
```

### 3.2 Tạo Supabase mới + đổ DB
1. Tạo project mới trên supabase.com (vùng Singapore như cũ). Gói Free đủ cho DB (25 MB),
   nhưng **KHÔNG đủ cho 4,6 GB ảnh** (Free giới hạn 1 GB) → cần gói trả phí hoặc chuyển
   ảnh sang chỗ khác (Cloudflare R2 có 10 GB miễn phí).
2. Lấy connection string **Session/Direct (cổng 5432)** — pooler 6543 không chạy pg_restore.
3. Khôi phục (máy không cài pg_restore thì dùng Docker như lúc sao lưu):
```bash
docker run --rm --network host -e PGURL='<DIRECT_URL mới>?sslmode=require' \
  -v /srv/data/MixStay/db:/in postgres:17 \
  pg_restore -d "$PGURL" --no-owner --no-privileges /in/mixstay-2026-09-23.dump
```
   Lỗi `schema "public" already exists` là bình thường, bỏ qua.
4. Đếm lại số dòng, so với danh sách ở mục 1.

### 3.3 Upload lại ảnh + sửa đường dẫn
URL ảnh trong DB đang trỏ về project CŨ (`https://cepznpxlzrrvqjcojwep.supabase.co/...`).
1. Tạo bucket `images` (public) + `videos` (public) trên project mới.
2. Upload giữ nguyên cấu trúc thư mục `properties/`, `rooms/`, `videos/` từ `storage/`.
3. Đổi host trong DB (thay `<MỚI>` bằng mã project mới):
```sql
UPDATE room_types SET images = array(SELECT replace(u,'cepznpxlzrrvqjcojwep','<MỚI>') FROM unnest(images) u),
                      videos = array(SELECT replace(u,'cepznpxlzrrvqjcojwep','<MỚI>') FROM unnest(videos) u);
UPDATE properties SET images = array(SELECT replace(u,'cepznpxlzrrvqjcojwep','<MỚI>') FROM unnest(images) u);
UPDATE users      SET avatar = replace(avatar,'cepznpxlzrrvqjcojwep','<MỚI>') WHERE avatar LIKE '%cepznpxlzrrvqjcojwep%';
UPDATE companies  SET logo   = replace(logo,  'cepznpxlzrrvqjcojwep','<MỚI>') WHERE logo   LIKE '%cepznpxlzrrvqjcojwep%';
```
   Rồi rà: `grep -c cepznpxlzrrvqjcojwep` trên một bản dump mới phải ra 0.

### 3.4 Vercel
1. `cp /srv/data/MixStay/secrets/env-2026-09-23 .env`, thay các khoá Supabase bằng khoá mới.
2. Import repo GitHub vào Vercel, dán biến môi trường, deploy.
3. Trỏ domain `mixstay.vn` về Vercel.
4. Google OAuth: kiểm redirect URI trong Google Cloud Console vẫn là `https://mixstay.vn/...`.
5. Cài lại cron backup ảnh: `bash scripts/install-backup-cron.sh`.

### 3.5 Kiểm sau khi mở lại
- Trang chủ có tin, `/tin/<id>` mở được, **ảnh hiện** (nếu ảnh vỡ → sót bước 3.3).
- Đăng nhập admin được, `/admin/dashboard` có số liệu.
- Google Search Console còn xác minh (`app/layout.tsx` giữ nguyên thẻ verification).
