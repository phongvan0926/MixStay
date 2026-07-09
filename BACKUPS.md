# MixStay — Sao lưu & Khôi phục sự cố (Backup & Disaster Recovery)

Mục tiêu: **luôn khôi phục được** dữ liệu và dịch vụ khi có sự cố (xoá nhầm, hỏng dữ liệu,
tấn công, lỗi deploy). Giữ tài liệu này cập nhật khi hạ tầng đổi.

## Mục tiêu khôi phục (đặt SLA của bạn)
- **RPO** (mất tối đa bao nhiêu dữ liệu): mục tiêu ≤ **1 giờ** (cần Supabase PITR) — hoặc ≤ **24 giờ** nếu chỉ có dump hằng ngày.
- **RTO** (bao lâu thì chạy lại): mục tiêu ≤ **2 giờ**.

## Cần backup những gì
| Thành phần | Chứa gì | Cơ chế backup |
|---|---|---|
| **Postgres (Supabase)** | toàn bộ dữ liệu (users, tin đăng, giao dịch…) | Supabase PITR + `pg_dump` hằng ngày (GitHub Actions) |
| **Supabase Storage** (`images`, `videos`) | ảnh/video tin đăng | Sync định kỳ sang S3 (chưa tự động — xem mục 3) |
| **Mã nguồn** | code | GitHub (+ nên mirror sang host phụ) |
| **Secrets/ENV** | DATABASE_URL, NEXTAUTH_SECRET, keys… | Trình quản lý bí mật + `.env.example` liệt kê đủ biến |

---

## 1) Database — 3 lớp backup

**Lớp A — Supabase tự động (BẬT NGAY):**
Supabase Dashboard → **Database → Backups**. Free tier KHÔNG có backup → cần **Pro** (snapshot hằng ngày).
Bật thêm **PITR** (Point-in-Time Recovery, add-on trả phí) để RPO ~phút thay vì 24h. Kiểm tra hằng tuần thấy có bản mới.

**Lớp B — `pg_dump` hằng ngày (repo này đã có sẵn):**
- Script: [`scripts/backup-db.sh`](scripts/backup-db.sh) — dump `-Fc` (nén), tuỳ chọn mã hoá GPG + upload S3, tự xoá bản > 30 ngày.
- Lịch: [`.github/workflows/backup-db.yml`](.github/workflows/backup-db.yml) — chạy 02:00 UTC hằng ngày + chạy tay (`workflow_dispatch`).
- **Cài đặt:** thêm secrets ở GitHub → Settings → Secrets → Actions:
  `DIRECT_URL` (bắt buộc, chuỗi kết nối *Direct connection* của Supabase — KHÔNG dùng pooler),
  `BACKUP_GPG_PASSPHRASE` (khuyến nghị — mã hoá dump), và (tuỳ chọn offsite) `BACKUP_S3_BUCKET` + `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_DEFAULT_REGION`.
- Mỗi lần chạy cũng lưu dump làm **artifact** (giữ 30 ngày) — lớp dự phòng thứ 2.

**Lớp C — dump thủ công trước việc rủi ro** (đổi schema lớn, xoá dữ liệu):
```bash
DIRECT_URL="postgres://…direct…" ./scripts/backup-db.sh
```

**Retention khuyến nghị:** ngày (30) · tuần (12) · tháng (12). Bản offsite phải **mã hoá** (GPG/KMS).

---

## 2) Migration an toàn (QUAN TRỌNG)

Hiện dự án dùng `npx prisma db push` lên **production** — lệnh này **có thể xoá cột/dữ liệu** và **không có lịch sử** để revert.

**Khuyến nghị chuyển sang `prisma migrate`:**
1. `npx prisma migrate dev --name <mô_tả>` (tạo file SQL có timestamp trong `prisma/migrations/`).
2. **Review** file migration trong PR trước khi merge.
3. Deploy production: **backup trước** (Lớp C) → `npx prisma migrate deploy`.
4. Chỉ dùng `db push` cho môi trường dev/nháp, KHÔNG cho production.

---

## 3) Storage (ảnh/video) — cần thiết lập

DB dump **KHÔNG** chứa file trong Supabase Storage. Xoá nhầm bucket = mất hết ảnh/video (DB vẫn còn link → hỏng ảnh).
- Định kỳ **sync** bucket sang S3 riêng (bật versioning), vd bằng `rclone`:
  ```bash
  rclone sync supabase:images  s3:mixstay-backup/images  --s3-storage-class STANDARD_IA
  rclone sync supabase:videos  s3:mixstay-backup/videos
  ```
  Đặt lịch (GitHub Actions/cron) hằng ngày. Bật **Object Versioning** + (nếu có) cross-region replication trên bucket backup.

---

## 4) Secrets & hạ tầng
- **Bật MFA** trên MỌI tài khoản: Supabase, Vercel, GitHub, Google Cloud (OAuth), AWS.
- `.env` chỉ ở máy local + Vercel env. Giữ bản sao secrets trong **trình quản lý bí mật** (1Password/Bitwarden/Vault). Cập nhật [`.env.example`](.env.example) liệt kê ĐỦ biến bắt buộc.
- Không để 1 người duy nhất giữ quyền: mỗi nền tảng cần ≥ 2 owner.

---

## 5) Quy trình KHÔI PHỤC (runbook)

### 5a. Khôi phục Database
1. Xác định mốc thời gian tốt cuối cùng (trước sự cố).
2. **Nếu có PITR:** Supabase Dashboard → Backups → Restore to point-in-time → chọn mốc. (Nhanh nhất.)
3. **Nếu dùng dump:** tạo DB đích (project Supabase mới hoặc DB trống), rồi:
   ```bash
   # Bản .dump (custom format):
   pg_restore --no-owner --no-privileges -d "$DIRECT_URL_DICH" backups/mixstay-YYYYMMDD-…​.dump
   # Nếu đã mã hoá GPG: giải mã trước
   gpg --batch --passphrase "$BACKUP_GPG_PASSPHRASE" -d backups/xxx.dump.gpg > restored.dump
   ```
4. Trỏ `DATABASE_URL`/`DIRECT_URL` (Vercel env) sang DB đã khôi phục → redeploy.
5. **Kiểm chứng:** đếm số bản ghi các bảng chính (`users`, `properties`, `room_types`, `deals`), đăng nhập thử, mở vài tin.

### 5b. Khôi phục Storage
- Restore bucket từ S3 backup (rclone sync ngược) hoặc từ Object Versioning trên bucket gốc.

### 5c. Khôi phục Code/Deploy
- **Rollback deploy:** Vercel Dashboard → Deployments → chọn bản tốt trước đó → **Promote to Production**. Hoặc `git revert <commit> && git push`.
- **Mất Vercel project:** tạo lại từ repo GitHub + nạp lại env (mục 4) → deploy.

---

## 6) Vận hành & kiểm thử
- **Diễn tập khôi phục hằng tháng:** restore bản mới nhất sang DB *staging*, chạy kiểm chứng. Backup chưa test = chưa có backup.
- **Cảnh báo lỗi backup:** GitHub Actions gửi email khi job fail (mặc định). Kiểm tra định kỳ có bản mới < 24h và kích thước hợp lý.
- **Nhật ký:** ghi lại mỗi lần restore thật (thời điểm, mốc phục hồi, kết quả kiểm chứng).
