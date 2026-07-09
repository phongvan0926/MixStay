#!/usr/bin/env bash
#
# backup-db.sh — Sao lưu database MixStay (Supabase Postgres) bằng pg_dump.
#
# Dùng: DIRECT_URL="postgres://…"  ./scripts/backup-db.sh
#   - DIRECT_URL: chuỗi kết nối TRỰC TIẾP (không qua pgbouncer) — lấy ở Supabase
#     Dashboard > Settings > Database > Connection string > "Direct connection".
#     (KHÔNG dùng DATABASE_URL pooled cho pg_dump — pgbouncer không hỗ trợ đầy đủ.)
#
# Tuỳ chọn (biến môi trường):
#   BACKUP_DIR             thư mục lưu (mặc định ./backups)
#   BACKUP_RETENTION_DAYS  số ngày giữ bản local (mặc định 30)
#   BACKUP_GPG_PASSPHRASE  nếu đặt → mã hoá bản dump bằng GPG (khuyến nghị khi đẩy offsite)
#   BACKUP_S3_BUCKET       nếu đặt (vd s3://mixstay-backups) → upload bằng `aws s3 cp`
#
# Yêu cầu: pg_dump (postgresql-client), gzip; tuỳ chọn: gpg, awscli.
set -euo pipefail

: "${DIRECT_URL:?Thiếu DIRECT_URL (chuỗi kết nối trực tiếp tới Postgres)}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%d-%H%M%SZ)"
BASENAME="mixstay-${STAMP}.dump"
mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/$BASENAME"

echo "[backup] pg_dump → $OUT"
# -Fc: custom format (nén sẵn, cho phép pg_restore chọn lọc). --no-owner/--no-privileges:
# khôi phục sang project khác không vướng owner/ACL.
pg_dump "$DIRECT_URL" -Fc --no-owner --no-privileges -f "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "[backup] xong: $OUT ($SIZE)"

# Mã hoá (nếu có passphrase) — bản offsite nên luôn được mã hoá.
UPLOAD="$OUT"
if [ -n "${BACKUP_GPG_PASSPHRASE:-}" ]; then
  echo "[backup] mã hoá GPG…"
  gpg --batch --yes --passphrase "$BACKUP_GPG_PASSPHRASE" -c "$OUT"
  UPLOAD="$OUT.gpg"
  rm -f "$OUT"   # chỉ giữ bản đã mã hoá
  echo "[backup] → $UPLOAD"
fi

# Upload offsite (nếu cấu hình S3).
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  echo "[backup] upload → ${BACKUP_S3_BUCKET%/}/$(basename "$UPLOAD")"
  aws s3 cp "$UPLOAD" "${BACKUP_S3_BUCKET%/}/$(basename "$UPLOAD")" --only-show-errors
fi

# Dọn bản local cũ.
echo "[backup] xoá bản > ${RETENTION} ngày trong $BACKUP_DIR"
find "$BACKUP_DIR" -type f -name 'mixstay-*.dump*' -mtime "+${RETENTION}" -print -delete || true

echo "[backup] HOÀN TẤT"
