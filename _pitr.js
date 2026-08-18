const { PrismaClient } = require('@prisma/client');
const fs=require('fs');
for(const f of ['.env.local','.env']){try{fs.readFileSync(f,'utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');});}catch{}}
const p=new PrismaClient();
(async()=>{
  const q = async (label, sql) => {
    try { const r = await p.$queryRawUnsafe(sql); console.log(`\n— ${label}`); console.dir(r, {depth:null}); }
    catch(e){ console.log(`\n— ${label}\n   ✗ ${String(e.message).split('\n')[0].slice(0,140)}`); }
  };
  await q('Cấu hình lưu WAL (dấu vết của PITR)',
    `select name, setting from pg_settings where name in
     ('archive_mode','archive_command','archive_library','wal_level','archive_timeout','max_wal_senders') order by name`);
  await q('Thống kê lưu trữ WAL — có WAL nào ĐƯỢC LƯU thật chưa?',
    `select archived_count, last_archived_wal, last_archived_time, failed_count, stats_reset from pg_stat_archiver`);
  await q('Tiến trình sao chép / gửi WAL đang chạy',
    `select application_name, state, sync_state from pg_stat_replication`);
  await q('Slot replication (WAL-G/pgBackRest hay dùng)',
    `select slot_name, plugin, slot_type, active from pg_replication_slots`);
  await q('Phiên bản & thời gian máy chủ', `select version() as v, now() as now`);
  await p.$disconnect();
})();
