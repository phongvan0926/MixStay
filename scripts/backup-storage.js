#!/usr/bin/env node
/**
 * BACKUP KHO ẢNH/VIDEO SUPABASE STORAGE
 *
 * Vì sao cần: backup hằng ngày của Supabase CHỈ gồm database, KHÔNG gồm file Storage
 * (Supabase ghi rõ "Storage objects are not included"). Ảnh/video tin đăng vì thế chỉ
 * tồn tại đúng 1 bản trên cloud — xoá nhầm hoặc sự cố là mất trắng.
 *
 * Cách chạy:
 *   node scripts/backup-storage.js                 # backup vào ổ Samsung: /srv/data/MixStay/storage
 *   node scripts/backup-storage.js --dest <thư mục>
 *   node scripts/backup-storage.js --check         # chỉ đối chiếu, không tải
 *
 * Đặc điểm:
 *  - TĂNG DẦN (incremental): file đã có đủ dung lượng thì bỏ qua → chạy lại rất nhanh,
 *    chỉ tải phần mới. An toàn khi chạy nhiều lần / cron hằng tuần.
 *  - CHỈ ĐỌC với Supabase: không xoá, không sửa gì trên cloud.
 *  - Không xoá file local kể cả khi file đã biến mất trên cloud (đó chính là mục đích backup).
 *  - Ghi manifest.json: danh sách file + dung lượng + thời điểm backup để đối chiếu về sau.
 */
const fs = require('fs');
const path = require('path');

// Nạp .env thủ công (script chạy bằng node thuần, không tự đọc .env)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'images';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const destIdx = args.indexOf('--dest');

// Đích mặc định: ổ SSD Samsung 120GB gắn trong máy, mount tại /srv/data (dành riêng cho backup).
// Thư mục MixStay nằm CẠNH repo restic /srv/data/backup của hệ thống — không đụng vào nhau.
const BACKUP_DRIVE = '/srv/data';
const DEFAULT_DEST = path.join(BACKUP_DRIVE, 'MixStay', 'storage');
const DEST = destIdx >= 0 && args[destIdx + 1] ? path.resolve(args[destIdx + 1]) : DEFAULT_DEST;

/**
 * Chốt an toàn: nếu ổ backup CHƯA mount thì /srv/data chỉ là thư mục rỗng trên ổ hệ thống —
 * ghi 4GB vào đó sẽ âm thầm làm đầy ổ chính mà tưởng là đã backup. Thà dừng hẳn còn hơn.
 */
function assertDriveMounted() {
  if (DEST !== DEFAULT_DEST) return; // người dùng tự chỉ định đích thì tự chịu trách nhiệm
  const { execSync } = require('child_process');
  try {
    execSync(`mountpoint -q ${BACKUP_DRIVE}`, { stdio: 'ignore' });
  } catch {
    console.error(`✖ Ổ backup chưa được mount tại ${BACKUP_DRIVE} — DỪNG để khỏi ghi nhầm vào ổ hệ thống.`);
    console.error(`  Kiểm tra: lsblk | grep sda   —   mount lại rồi chạy lại script.`);
    console.error(`  Hoặc chỉ định đích khác: node scripts/backup-storage.js --dest <thư mục>`);
    process.exit(1);
  }
}

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

/** Liệt kê đệ quy mọi file trong bucket (Storage API trả tối đa 100/lần → phải phân trang). */
async function listAll(prefix = '', out = []) {
  let offset = 0;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!res.ok) throw new Error(`list ${prefix || '/'}: HTTP ${res.status} ${await res.text()}`);
    const items = await res.json();
    if (!items.length) break;
    for (const it of items) {
      const full = prefix ? `${prefix}/${it.name}` : it.name;
      // Thư mục: Storage trả bản ghi không có metadata/id
      if (it.id === null || !it.metadata) await listAll(full, out);
      else out.push({ path: full, size: it.metadata.size ?? 0, updatedAt: it.updated_at });
    }
    if (items.length < 100) break;
    offset += items.length;
  }
  return out;
}

async function download(objPath, destFile) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objPath.split('/').map(encodeURIComponent).join('/')}`,
    { headers },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  const tmp = `${destFile}.part`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, destFile); // đổi tên nguyên tử: không bao giờ để lại file tải dở
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);

(async () => {
  assertDriveMounted();
  console.log(`Kho:  ${SUPABASE_URL}/storage/v1 (bucket "${BUCKET}", chỉ đọc)`);
  console.log(`Đích: ${DEST}\n`);

  process.stdout.write('Đang liệt kê file trên cloud… ');
  const files = await listAll();
  const total = files.reduce((s, f) => s + f.size, 0);
  console.log(`${files.length} file, ${mb(total)} MB`);

  const todo = files.filter((f) => {
    const local = path.join(DEST, f.path);
    return !fs.existsSync(local) || fs.statSync(local).size !== f.size;
  });
  const todoSize = todo.reduce((s, f) => s + f.size, 0);
  console.log(`Đã có sẵn: ${files.length - todo.length} file — cần tải: ${todo.length} file (${mb(todoSize)} MB)\n`);

  if (CHECK_ONLY) { console.log('(--check: chỉ đối chiếu, không tải)'); return; }
  if (!todo.length) { console.log('✔ Backup đã đầy đủ, không có gì để tải.'); }

  let done = 0, bytes = 0, failed = [];
  for (const f of todo) {
    try {
      await download(f.path, path.join(DEST, f.path));
      bytes += f.size;
    } catch (e) {
      failed.push({ path: f.path, error: e.message });
    }
    done++;
    if (done % 25 === 0 || done === todo.length) {
      process.stdout.write(`\r  ${done}/${todo.length} file — ${mb(bytes)} MB${failed.length ? ` — lỗi: ${failed.length}` : ''}   `);
    }
  }
  if (todo.length) console.log('');

  fs.mkdirSync(DEST, { recursive: true });
  fs.writeFileSync(
    path.join(DEST, 'manifest.json'),
    JSON.stringify({ backedUpAt: new Date().toISOString(), bucket: BUCKET, fileCount: files.length, totalBytes: total, files }, null, 2),
  );

  console.log(`\n✔ Xong. Tổng kho: ${files.length} file / ${mb(total)} MB tại ${DEST}`);
  console.log(`  Manifest: ${path.join(DEST, 'manifest.json')}`);
  if (failed.length) {
    console.log(`\n⚠ ${failed.length} file lỗi (chạy lại script sẽ tự thử lại):`);
    failed.slice(0, 10).forEach((f) => console.log(`  - ${f.path}: ${f.error}`));
  }
})().catch((e) => { console.error('\nLỗi:', e.message); process.exit(1); });
