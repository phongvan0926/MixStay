#!/usr/bin/env node
/**
 * check-supabase.js — Soi trạng thái backup của dự án trên Supabase mà KHÔNG cần mở trình duyệt.
 *
 * Vì sao có: ngày 19/08/2026 phải đăng nhập Dashboard bằng tay mới trả lời được câu
 * "PITR bật hay tắt". Hỏi thẳng Postgres KHÔNG trả lời được — Supabase bật WAL archiving
 * 2 phút/lần cho mọi dự án Pro dù có mua add-on PITR hay không, nên nhìn `archive_mode`,
 * `archive_timeout` rồi suy ra là SUY SAI (xem BACKUPS.md, mục 1 Lớp A).
 * Chỉ Management API (hoặc Dashboard) mới có câu trả lời thật.
 *
 * CHỈ ĐỌC — không có lệnh nào ghi/xoá/đổi cấu hình.
 *
 * Chạy:  node scripts/check-supabase.js
 *
 * Khoá lấy ở đâu (tự tạo, 30 giây):
 *   https://supabase.com/dashboard/account/tokens → "Generate new token"
 *
 * Cất khoá ở đâu — script tìm theo thứ tự:
 *   1. biến môi trường  SUPABASE_ACCESS_TOKEN
 *   2. file             ~/.config/mixstay/supabase-token     ← KHUYẾN NGHỊ
 *
 * ⚠️ Khoá này là quyền QUẢN TRỊ TOÀN TÀI KHOẢN (xem/sửa/XOÁ mọi dự án, đổi thanh toán).
 * Supabase không cho tạo khoá chỉ-đọc. Vì vậy:
 *   - ĐỪNG để trong .env của repo: thư mục này có nhiều AI agent cùng đọc/ghi.
 *   - Để ở ~/.config/mixstay/supabase-token và `chmod 600` (chỉ chủ máy đọc được).
 *   - Lộ khoá thì thu hồi ngay ở đúng trang đã tạo.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOKEN_FILE = path.join(os.homedir(), '.config', 'mixstay', 'supabase-token');

function loadToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try { return fs.readFileSync(TOKEN_FILE, 'utf8').trim() || null; } catch { return null; }
}

function loadProjectRef() {
  for (const f of ['.env.local', '.env']) {
    try {
      const m = fs.readFileSync(f, 'utf8').match(/NEXT_PUBLIC_SUPABASE_URL=.*?https:\/\/([a-z0-9]+)\.supabase\.co/);
      if (m) return m[1];
    } catch {}
  }
  return null;
}

const token = loadToken();
if (!token) {
  console.log(`
Chưa có khoá Management API — chưa kiểm được (không sao, vẫn xem tay trên Dashboard được).

Cách tạo, 30 giây:
  1. Mở  https://supabase.com/dashboard/account/tokens
  2. "Generate new token", đặt tên vd "mixstay-backup-check"
  3. Copy khoá (dạng sbp_…) rồi chạy 2 lệnh sau:

       mkdir -p ~/.config/mixstay
       printf '%s' 'DÁN_KHOÁ_VÀO_ĐÂY' > ~/.config/mixstay/supabase-token && chmod 600 ~/.config/mixstay/supabase-token

⚠️ Khoá này có quyền quản trị TOÀN TÀI KHOẢN (xoá được dự án, đổi được thanh toán) và
   Supabase không cho tạo loại chỉ-đọc. Cố ý KHÔNG cất trong .env của repo, vì thư mục
   repo có nhiều AI agent cùng đọc. Lộ thì thu hồi ngay tại chính trang trên.
`);
  process.exit(2);
}

const ref = process.argv[2] || loadProjectRef();
if (!ref) { console.error('✗ Không tìm ra mã dự án (NEXT_PUBLIC_SUPABASE_URL trong .env). Truyền tay: node scripts/check-supabase.js <ref>'); process.exit(1); }

const api = async (p) => {
  const r = await fetch(`https://api.supabase.com/v1${p}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return { _error: `HTTP ${r.status} ${(await r.text()).slice(0, 160)}` };
  return r.json();
};

const day = (s) => { try { return new Date(s).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'; } catch { return String(s); } };

(async () => {
  console.log(`\n══ Supabase — dự án ${ref} ══\n`);

  const projects = await api('/projects');
  if (projects._error) {
    console.error('✗ Không gọi được API:', projects._error);
    console.error('  Khoá sai/hết hạn? Tạo lại ở https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }
  const proj = Array.isArray(projects) ? projects.find(p => p.id === ref) : null;
  if (proj) {
    console.log(`Tên dự án : ${proj.name}`);
    console.log(`Vùng      : ${proj.region}    Trạng thái: ${proj.status}`);
    console.log(`Tổ chức   : ${proj.organization_id}`);
  } else {
    console.log('⚠️ Không thấy dự án này trong danh sách khoá truy cập được.');
  }

  const b = await api(`/projects/${ref}/database/backups`);
  if (b._error) { console.error('\n✗ Không đọc được mục backup:', b._error); process.exit(1); }

  const pitr = b.pitr_enabled ?? b.pitrEnabled;
  console.log(`\n── PITR (Point-in-Time Recovery) ──`);
  console.log(`  ${pitr ? '🟢 ĐANG BẬT — add-on trả phí, đang tính tiền' : '⚪ TẮT — đúng như quyết định 19/08/2026 (không trả thêm tiền)'}`);
  if (b.walg_enabled !== undefined) {
    console.log(`  (walg_enabled=${b.walg_enabled} — chỉ là cơ chế lưu WAL, KHÔNG đồng nghĩa PITR. Xem BACKUPS.md)`);
  }

  const list = b.backups || [];
  console.log(`\n── Snapshot hằng ngày: ${list.length} bản ──`);
  list.slice(0, 10).forEach(x => console.log(`  ${day(x.inserted_at || x.created_at)}   ${x.status || ''} ${x.is_physical_backup ? 'PHYSICAL' : ''}`));
  if (!list.length) {
    console.log('  ⚠️ KHÔNG có bản nào — nếu dự án đang ở gói Pro thì đây là bất thường, kiểm ngay.');
  } else {
    const newest = new Date(list[0].inserted_at || list[0].created_at);
    const hours = (Date.now() - newest.getTime()) / 3600000;
    console.log(`\n  Bản mới nhất cách đây ${hours.toFixed(1)} giờ — ${hours < 26 ? '✅ bình thường' : '🔴 QUÁ CŨ, kiểm ngay'}`);
  }

  console.log(`\n⚠️ Nhắc lại: snapshot KHÔNG gồm file Storage (ảnh/video). Đó là việc của`);
  console.log(`   scripts/backup-storage.js — xem BACKUPS.md mục 3.\n`);
})();
