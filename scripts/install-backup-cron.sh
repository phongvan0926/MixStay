#!/usr/bin/env bash
# Cài lịch tự động backup kho ảnh/video Supabase — chạy 3h sáng Chủ nhật hằng tuần.
#
#   Cài:  bash scripts/install-backup-cron.sh
#   Gỡ:   bash scripts/install-backup-cron.sh --remove
#
# Vì sao cần: backup của Supabase CHỈ gồm database, KHÔNG gồm file Storage.
# Script backup chạy tăng dần nên lần chạy sau chỉ tải ảnh mới, rất nhanh.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE="$(command -v node)"
LOG="$HOME/.mixstay-backups/backup-storage.log"
MARK="# MixStay backup storage"
LINE="0 3 * * 0 cd $REPO && $NODE scripts/backup-storage.js >> $LOG 2>&1 $MARK"

current="$(crontab -l 2>/dev/null || true)"
cleaned="$(printf '%s\n' "$current" | grep -vF "$MARK" || true)"

if [[ "${1:-}" == "--remove" ]]; then
  printf '%s\n' "$cleaned" | grep -v '^$' | crontab - 2>/dev/null || crontab -r 2>/dev/null || true
  echo "✔ Đã gỡ lịch backup tự động."
  exit 0
fi

mkdir -p "$HOME/.mixstay-backups"
{ printf '%s\n' "$cleaned" | grep -v '^$' || true; echo "$LINE"; } | crontab -
echo "✔ Đã cài lịch backup: 3h sáng Chủ nhật hằng tuần"
echo "  Repo:    $REPO"
echo "  Log:     $LOG"
echo "  Kho lưu: $HOME/.mixstay-backups/storage"
echo
echo "Lịch hiện tại:"
crontab -l | grep -F "$MARK"
