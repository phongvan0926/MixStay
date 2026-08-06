const fs=require('fs');
for (const f of ['.env.local','.env']) { try { for (const l of fs.readFileSync(f,'utf8').split('\n')) { const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,''); } } catch(e){} }
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const H = t => console.log(`\n${'='.repeat(64)}\n${t}\n${'='.repeat(64)}`);
const R = (label, n, detail) => console.log(`  ${n>0?'❗':'✅'} ${String(n).padStart(4)}  ${label}${n>0&&detail?'\n        '+detail:''}`);
(async () => {
  H('1. TÀI KHOẢN & QUYỀN — có ai đang giữ quyền không đáng có?');
  const roles = await p.user.groupBy({by:['role'], _count:true});
  console.log('  Phân bố vai trò:', roles.map(r=>`${r.role}=${r._count}`).join('  '));
  const admins = await p.user.findMany({where:{role:{in:['ADMIN','ADMIN_STAFF']}}, select:{name:true,email:true,role:true,permissions:true,isActive:true,password:true,createdAt:true}});
  console.log(`\n  Tài khoản quyền admin: ${admins.length}`);
  admins.forEach(a=>console.log(`    ${a.role.padEnd(12)} ${(a.name||'—').slice(0,22).padEnd(22)} ${(a.email||'KHÔNG EMAIL').padEnd(26)} mật khẩu:${a.password?'có':'KHÔNG'} ${a.isActive?'':'(khoá)'} quyền:[${a.permissions.join(',')||'—'}]`));
  R('tài khoản KHÔNG PHẢI staff mà vẫn có permissions[] (thừa quyền treo)', (await p.user.findMany({where:{role:{notIn:['ADMIN_STAFF']}}, select:{name:true,role:true,permissions:true}})).filter(u=>u.permissions.length).map(u=>`${u.name}(${u.role}):[${u.permissions}]`).length);
  const noPass = await p.user.findMany({where:{password:null, accounts:{none:{}}}, select:{name:true,email:true,role:true,isActive:true}});
  R('tài khoản KHÔNG mật khẩu VÀ KHÔNG liên kết OAuth (không đăng nhập được / mồ côi)', noPass.length, noPass.slice(0,6).map(u=>`${u.role} ${u.name||u.email}`).join(' | '));
  const weak = await p.user.findMany({select:{name:true,email:true,role:true,password:true}});
  R('mật khẩu KHÔNG băm bcrypt (lưu thô!)', weak.filter(u=>u.password && !/^\$2[aby]\$/.test(u.password)).length, weak.filter(u=>u.password&&!/^\$2[aby]\$/.test(u.password)).map(u=>`${u.role} ${u.email}`).join(' | '));
  const dupPhone = await p.$queryRaw`SELECT phone, COUNT(*) n FROM users WHERE phone IS NOT NULL GROUP BY phone HAVING COUNT(*)>1`;
  R('SĐT TRÙNG giữa nhiều tài khoản (đăng nhập bằng SĐT → chiếm tài khoản)', dupPhone.length, dupPhone.map(x=>`${x.phone} ×${x.n}`).join(' | '));
  const dupEmail = await p.$queryRaw`SELECT lower(email) e, COUNT(*) n FROM users WHERE email IS NOT NULL GROUP BY lower(email) HAVING COUNT(*)>1`;
  R('EMAIL trùng khác hoa/thường', dupEmail.length, dupEmail.map(x=>`${x.e} ×${x.n}`).join(' | '));
  R('CTV được xem liên hệ (canViewContact)', (await p.user.count({where:{role:'BROKER', canViewContact:true}})));
  R('CTV được xem hoa hồng (canViewCommission)', (await p.user.count({where:{role:'BROKER', canViewCommission:true}})));

  H('2. RIÊNG TƯ — dữ liệu nhạy cảm có nằm ở chỗ công khai đọc được không?');
  const pub = {isApproved:true, status:{in:['AVAILABLE','UPCOMING']}, property:{status:'APPROVED', isActive:true}};
  const leakName = await p.roomType.findMany({where:pub, select:{listingCode:true,name:true}});
  const digitStart = leakName.filter(r=>/^\s*(số\s*)?\d+[a-z]?\s*(,|\/|\s)/i.test(r.name));
  R('TÊN TIN công khai bắt đầu bằng số nhà', digitStart.length, digitStart.slice(0,5).map(r=>`${r.listingCode}: "${r.name.slice(0,40)}"`).join(' | '));
  const descPhone = leakName.length && await p.roomType.findMany({where:pub, select:{listingCode:true,description:true}});
  const inDesc = (descPhone||[]).filter(r=>/0\d{9}|zalo|\bsđt\b|điện thoại/i.test(r.description||''));
  R('MÔ TẢ công khai có lộ SĐT/Zalo (khách bỏ qua CTV, gọi thẳng chủ nhà)', inDesc.length, inDesc.slice(0,5).map(r=>`${r.listingCode}: "${(r.description||'').match(/0\d{9}|zalo[^\s]*/i)?.[0]}"`).join(' | '));
  const notes = await p.roomType.count({where:{...pub, landlordNotes:{not:null}}});
  console.log(`  ℹ️  ${notes} tin có landlordNotes (nội bộ — chỉ cần chắc API public không trả ra)`);

  H('3. TOÀN VẸN QUAN HỆ — bản ghi mồ côi / trỏ sai');
  R('tòa nhà KHÔNG có chủ nhà hợp lệ', (await p.$queryRaw`SELECT COUNT(*)::int n FROM properties pr LEFT JOIN users u ON u.id=pr."landlordId" WHERE u.id IS NULL`)[0].n);
  R('tin đăng trỏ tới tòa không tồn tại', (await p.$queryRaw`SELECT COUNT(*)::int n FROM room_types rt LEFT JOIN properties pr ON pr.id=rt."propertyId" WHERE pr.id IS NULL`)[0].n);
  R('share link trỏ tới tin đã bị xoá', (await p.$queryRaw`SELECT COUNT(*)::int n FROM share_links sl LEFT JOIN room_types rt ON rt.id=sl."roomTypeId" WHERE sl."roomTypeId" IS NOT NULL AND rt.id IS NULL`)[0].n);
  R('tòa gán công ty không tồn tại', (await p.$queryRaw`SELECT COUNT(*)::int n FROM properties pr LEFT JOIN companies c ON c.id=pr."companyId" WHERE pr."companyId" IS NOT NULL AND c.id IS NULL`)[0].n);
  R('deal trỏ tin đã xoá', (await p.$queryRaw`SELECT COUNT(*)::int n FROM deals d LEFT JOIN room_types rt ON rt.id=d."roomTypeId" WHERE rt.id IS NULL`)[0].n);
  R('thông báo gửi cho user không tồn tại', (await p.$queryRaw`SELECT COUNT(*)::int n FROM notifications nt LEFT JOIN users u ON u.id=nt."userId" WHERE u.id IS NULL`)[0].n);
  R('mã tin TRÙNG (listingCode phải duy nhất)', (await p.$queryRaw`SELECT COUNT(*)::int n FROM (SELECT "listingCode" FROM room_types WHERE "listingCode" IS NOT NULL GROUP BY 1 HAVING COUNT(*)>1) t`)[0].n);
  R('token share link TRÙNG', (await p.$queryRaw`SELECT COUNT(*)::int n FROM (SELECT token FROM share_links GROUP BY 1 HAVING COUNT(*)>1) t`)[0].n);

  H('4. TRẠNG THÁI PHI LÝ');
  R('tin ĐÃ DUYỆT nằm trên tòa CHƯA duyệt (lọt lưới kiểm duyệt)', (await p.roomType.count({where:{isApproved:true, property:{status:{not:'APPROVED'}}}})));
  R('tin 🟢 còn phòng nhưng availableUnits = 0', (await p.roomType.count({where:{status:'AVAILABLE', availableUnits:{lte:0}}})));
  R('availableUnits > totalUnits', (await p.$queryRaw`SELECT COUNT(*)::int n FROM room_types WHERE "availableUnits" > "totalUnits"`)[0].n);
  R('tin 🟡 UPCOMING thiếu ngày dự kiến (schema bảo bắt buộc)', (await p.roomType.count({where:{status:'UPCOMING', expectedAvailableDate:null}})));
  R('tin 🟡 UPCOMING đã QUÁ HẠN mà cron chưa xử lý', (await p.roomType.count({where:{status:'UPCOMING', expectedAvailableDate:{lt:new Date()}}})));
  R('giá thuê <= 0 hoặc null', (await p.roomType.count({where:{OR:[{priceMonthly:{lte:0}}]}})));
  R('share link đã hết hạn nhưng vẫn isActive', (await p.shareLink.count({where:{isActive:true, expiresAt:{lt:new Date()}}})));
  R('công ty isApproved=false nhưng vẫn isActive=true', (await p.company.count({where:{isApproved:false, isActive:true}})));
  await p.$disconnect();
})().catch(e=>{console.error('LỖI:',e.message, e.stack?.split('\n')[1]);process.exit(1)});
