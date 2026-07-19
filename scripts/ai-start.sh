#!/usr/bin/env bash
# scripts/ai-start.sh — CHẠY ĐẦU MỖI PHIÊN/VIỆC. Dùng chung cho 3 AI làm trên cùng thư mục
# (Claude Code / Antigravity / Codex) để không dẫm chân nhau.
# Chỉ ĐỌC trạng thái + đồng bộ AN TOÀN (fast-forward), KHÔNG bao giờ merge bừa / ghi đè.
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" || exit 0

echo "▶ git status — AI trước có để lại file CHƯA COMMIT không?"
git status -sb
echo

echo "▶ 8 commit gần nhất — ai vừa đụng file gì:"
git log --oneline -8
echo

echo "▶ Đồng bộ remote (chỉ fast-forward, an toàn — không tạo merge, không ghi đè):"
timeout 15 git pull --ff-only 2>&1 | sed 's/^/  /' || true
echo

echo "✔ Sẵn sàng làm việc."
echo "  • Nếu status ở trên có file chưa commit của AI khác → HỎI trước, đừng ghi đè."
echo "  • Nếu pull báo KHÔNG ff được → có commit local chưa push hoặc đã phân nhánh, xử lý trước."
echo "  • Xong việc: commit + push NGAY (working tree sạch) để AI sau không dính conflict."
exit 0
