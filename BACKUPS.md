# MixStay — Sao lưu & Khôi phục sự cố (Backup & Disaster Recovery)

Mục tiêu: **luôn khôi phục được** dữ liệu và dịch vụ khi có sự cố (xoá nhầm, hỏng dữ liệu,
tấn công, lỗi deploy). Giữ tài liệu này cập nhật khi hạ tầng đổi.

## Mục tiêu khôi phục (đặt SLA của bạn)
- **RPO** (mất tối đa bao nhiêu dữ liệu): **thực tế hiện nay ≤ 24 giờ** — dự án đang ở gói **Supabase Pro**,
  có snapshot hằng ngày + `pg_dump` hằng ngày, cả hai đều theo chu kỳ ngày.
  Muốn xuống ≤ **1 giờ** thì phải bật thêm add-on **PITR** (xem Lớp A) — hiện **chưa xác minh được là đã bật hay chưa**.
- **RTO** (bao lâu thì chạy lại): mục tiêu ≤ **2 giờ**.

## Cần backup những gì
| Thành phần | Chứa gì | Cơ chế backup |
|---|---|---|
| **Postgres (Supabase)** | toàn bộ dữ liệu (users, tin đăng, giao dịch…) | Snapshot hằng ngày của gói **Pro** + `pg_dump` hằng ngày (GitHub Actions). PITR: **chưa xác minh** |
| **Supabase Storage** (`images`, `videos`) | ảnh/video tin đăng | Cron 03:00 hằng ngày về ổ DATA của máy (`scripts/backup-storage.js`) — xem mục 3 |
| **Mã nguồn** | code | GitHub (+ nên mirror sang host phụ) |
| **Secrets/ENV** | DATABASE_URL, NEXTAUTH_SECRET, keys… | Trình quản lý bí mật + `.env.example` liệt kê đủ biến |

---

## 1) Database — 3 lớp backup

**Lớp A — Supabase tự động (ĐANG CHẠY):**
Dự án đang ở gói **Pro**, nên Supabase tự chụp **snapshot hằng ngày**, giữ **7 ngày** gần nhất.
Xem/tải ở Dashboard → **Database → Backups**.

⚠️ **Hai giới hạn phải nhớ, vì Pro KHÔNG tự khắc phục:**
1. **Giữ 7 ngày, không hơn.** Hỏng dữ liệu mà hơn một tuần sau mới phát hiện thì snapshot đã trôi mất —
   lúc đó chỉ còn cứu được bằng Lớp B (`pg_dump`, giữ 30 ngày).
2. **Storage KHÔNG nằm trong snapshot.** Supabase ghi rõ backup chỉ gồm database; ảnh/video là chuyện của mục 3.

**PITR (Point-in-Time Recovery) — CHƯA XÁC MINH ĐƯỢC, nhiều khả năng là chưa bật.**
Đây là add-on trả phí RIÊNG, **không tự có khi lên Pro** — nên lên Pro không đồng nghĩa với có PITR.

🔎 **Vì sao để ngỏ thay vì khẳng định:** máy này không có token quản lý Supabase (`sbp_…`) —
chỉ có `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, đều là khoá tầng dữ liệu,
không đọc được cấu hình backup. Không có đường nào kiểm bằng lệnh (đã kiểm 19/08/2026).

✅ **Kiểm 30 giây, làm đi rồi sửa dòng này:** Dashboard → **Database → Backups**.
Thấy tab/mục *Point-in-Time Recovery* kèm khoảng thời gian khôi phục (vd "7 days") = ĐÃ bật;
chỉ thấy danh sách bản chụp theo ngày = CHƯA bật.

⚠️ **Ghi sai chỗ này tốn tiền thật khi có sự cố:** tưởng có PITR mà không có → mất tới 24h dữ liệu
ngoài dự tính; tưởng không có mà thật ra có → bỏ qua đường phục hồi nhanh nhất, đi vòng bằng dump.

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

## 3) Storage (ảnh/video) — ĐANG CHẠY

⚠️ **Snapshot của gói Pro và bản `pg_dump` đều KHÔNG chứa file Storage** — Supabase ghi rõ
"Storage objects are not included". Xoá nhầm bucket = mất hết ảnh/video, mà DB vẫn còn link → tin đăng hỏng ảnh hàng loạt.
Vì thế Storage phải có đường backup riêng, và nó đã có:

- **Script:** [`scripts/backup-storage.js`](scripts/backup-storage.js) — tải tăng dần (incremental), **chỉ đọc**
  với Supabase (không xoá/sửa gì trên cloud), và **không xoá file local kể cả khi file đã biến mất trên cloud**
  (đó chính là mục đích backup). Ghi kèm `manifest.json` để đối chiếu về sau.
- **Lịch:** cron của user `phong` trên máy ThinkBook, **03:00 hằng ngày**:
  ```
  0 3 * * * cd /home/phong/Desktop/MixStay && /usr/bin/node scripts/backup-storage.js >> /srv/data/MixStay/backup-storage.log 2>&1
  ```
- **Đích:** `/srv/data/MixStay/storage` trên ổ SSD 120GB gắn trong.
- **Kiểm nhanh:** `node scripts/backup-storage.js --check` (chỉ đối chiếu, không tải),
  hoặc xem đuôi log: `tail /srv/data/MixStay/backup-storage.log`.

⚠️ **Điểm yếu còn lại: bản sao Storage này chỉ nằm ở MỘT nơi — ổ trong máy.**
Cháy/mất/hỏng máy là mất luôn 4,2GB ảnh cùng lúc với máy. Muốn chắc thì đẩy thêm một bản offsite
(S3 có versioning, hoặc ổ cứng rời cất chỗ khác) — chưa làm.

---

## 4) Secrets & hạ tầng
- **Bật MFA** trên MỌI tài khoản: Supabase, Vercel, GitHub, Google Cloud (OAuth), AWS.
- `.env` chỉ ở máy local + Vercel env. Giữ bản sao secrets trong **trình quản lý bí mật** (1Password/Bitwarden/Vault). Cập nhật [`.env.example`](.env.example) liệt kê ĐỦ biến bắt buộc.
- Không để 1 người duy nhất giữ quyền: mỗi nền tảng cần ≥ 2 owner.

---

## 5) Quy trình KHÔI PHỤC (runbook)

### 5a. Khôi phục Database
1. Xác định mốc thời gian tốt cuối cùng (trước sự cố).
2. **Snapshot gói Pro (đường đi mặc định hiện nay):** Supabase Dashboard → **Database → Backups** → chọn bản gần nhất TRƯỚC sự cố → Restore.
   Chỉ có 7 ngày gần nhất; cũ hơn thì nhảy xuống bước 3.
   *(Nếu sau này bật PITR: Backups → Restore to point-in-time → chọn mốc — nhanh và mất ít dữ liệu nhất.)*
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

⚠️ **Cron Storage chạy im lặng — hỏng cũng không ai báo.** Khác `pg_dump` (GitHub gửi email khi fail),
cron trên máy chỉ ghi vào log. Máy tắt lúc 03:00 là hôm đó không có backup, và không có tín hiệu nào cả.
Nên **1 tháng liếc log một lần**.

## 7) Bảng kiểm nhanh — 4 lệnh, biết ngay còn an toàn không

> **Kiểm chứng lần cuối: 19/08/2026** — cron Storage khớp tài liệu, lần chạy gần nhất 18/08 03:00
> (5.180 file / 4.236 MB); `backup-db.yml` 5/5 lần gần nhất **success**, gần nhất 18/08; ổ `/srv/data` dùng 30% (còn 78G).
> Riêng PITR không kiểm được bằng lệnh — xem mục 1, Lớp A.


```bash
# 1. Storage: lần chạy gần nhất có "✔ Xong" và ngày hôm qua không?
tail -5 /srv/data/MixStay/backup-storage.log

# 2. pg_dump trên GitHub: 5 lần gần nhất phải "success"
gh run list --repo phongvan0926/MixStay --workflow=backup-db.yml --limit 5

# 3. Backup toàn máy (code + .env): bản mới nhất là hôm nay/hôm qua?
RESTIC_REPOSITORY=/srv/data/backup RESTIC_PASSWORD_FILE=~/.config/restic/password \
  restic snapshots --host thinkbook --compact | tail -5

# 4. Ổ DATA còn chỗ không (đầy ổ = backup âm thầm chết)
df -h /srv/data
```

Còn lại kiểm bằng mắt trên Dashboard: **Supabase → Database → Backups** phải có bản của hôm qua.
