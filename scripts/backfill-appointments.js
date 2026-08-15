#!/usr/bin/env node
/**
 * backfill-appointments.js — đổ GIỜ HẸN vào 44 lead cũ, bóc từ ô ghi chú tự do của khách.
 *
 * VÌ SAO: trước v9.59 khách gõ tay giờ hẹn vào ghi chú — "8h sáng Chủ nhật 16.8", "sáng mai",
 * "19/8/2026 em sẽ ra xem". Không có preferredDate thì các lead này không lên được trang
 * "Lịch khách xem phòng", tức toàn bộ lịch đang có của công ty vô hình với người dẫn khách.
 *
 * VÌ SAO KHÔNG GỌI AI LÚC CHẠY: bóc ngày giờ là việc CÓ ĐÁP ÁN ĐÚNG và chỉ làm MỘT LẦN cho
 * 44 dòng. Bảng dưới đây do trợ lý đọc từng ghi chú rồi lập sẵn — chạy lại bao nhiêu lần cũng
 * ra đúng một kết quả, người khác đọc lại kiểm được từng dòng, không phụ thuộc quota API và
 * không có rủi ro model "sáng tạo" ra một giờ hẹn không ai nói.
 *
 * MẤU CHỐT ĐÃ ÁP DỤNG KHI BÓC: mọi từ tương đối ("mai", "chiều nay", "cuối tuần") tính từ
 * NGÀY KHÁCH GỬI, không phải từ hôm nay. Lead gửi 11/08 ghi "8h tối mai" = 12/08 20:00.
 *
 *   node scripts/backfill-appointments.js                  # CHẠY THỬ, không ghi gì
 *   node scripts/backfill-appointments.js --apply          # ghi thật
 *   node scripts/backfill-appointments.js --apply --future-only   # chỉ ghi lịch chưa qua
 *
 * AN TOÀN: chỉ ghi vào lead ĐÚNG id và ĐANG trống preferredDate; trước khi ghi còn đối chiếu
 * lại ghi chú trong DB có khớp ghi chú lúc bóc không — lệch một chữ là bỏ qua dòng đó.
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
for (const f of ['.env.local', '.env']) {
  try {
    fs.readFileSync(f, 'utf8').split('\n').forEach(l => {
      const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  } catch {}
}
const p = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const FUTURE_ONLY = process.argv.includes('--future-only');

// Giờ đại diện — PHẢI khớp SLOT_HOUR ở app/api/viewing-requests/route.ts, lệch là lead cũ và
// lead mới xếp lịch theo hai thang giờ khác nhau. 'day' = biết ngày chưa biết giờ.
const SLOT_HOUR = { morning: '08:00', afternoon: '14:00', evening: '19:00', day: '09:00' };

/**
 * Bảng bóc tay. Mỗi dòng: [id, ghi chú gốc (để đối chiếu), ngày, slot|null, giờ|null, lý do]
 *  - slot có giá trị → khách chỉ nói buổi, KHÔNG in giờ ra màn hình
 *  - time có giá trị → khách nói giờ rõ ràng, slot = null
 *  - slot 'day'      → khách chỉ cho ngày, chưa chốt giờ
 */
const PARSED = [
  ['cmstr3zjl0001imzcz3mdw6hp', '8h sáng Chủ nhật 16.8', '2026-08-16', null, '08:00', 'ngày + giờ ghi rõ'],
  ['cmst0shl90001uxwpehuc69k4', 'sáng mai', '2026-08-15', 'morning', null, 'gửi 14/08 → mai = 15/08'],
  ['cmssxga2100075pk6nngm5x3a', 'Sáng ngày mai 15/8 tầm 7h trở đi', '2026-08-15', null, '07:00', 'ngày ghi rõ, từ 7h'],
  ['cmssx84z400015pk633b9pvoi', '19/8/2026 em sẽ ra xem', '2026-08-19', 'day', null, 'chỉ có ngày, không nói giờ'],
  ['cmssx4jne0009cs00udjiri9x', 'Ngày Chủ Nhật tuần này', '2026-08-16', 'day', null, 'gửi T6 14/08 → CN cùng tuần = 16/08'],
  ['cmsswx9it000111m5xd11wq6t', '16/8', '2026-08-16', 'day', null, 'chỉ có ngày'],
  ['cmsswl35m0001cs00ruap4hfs', 'Hôm nay 9h và sáng hoặc tối t2', '2026-08-17', 'morning', null, 'gửi 19h08 nên "hôm nay 9h" đã qua → lấy sáng T2 17/08'],
  ['cmsskblvz0001enr5la3cbapo', 'Cuối tuần Chủ nhật', '2026-08-16', 'day', null, 'gửi T6 14/08 → CN = 16/08'],
  ['cmssab9q70001bi5ub4luds8s', 'chiều mai ngày 14/8/2026', '2026-08-14', 'afternoon', null, 'ghi chú tự mâu thuẫn (gửi đúng 14/08) → theo NGÀY ghi rõ'],
  ['cmsrkrbrl000mufegxfnnhpbi', 'chủ nhật 16.8', '2026-08-16', 'day', null, 'ngày ghi rõ'],
  ['cmsrkoto9000jufegkkkhyl4p', 'Chủ nhật 16.8', '2026-08-16', 'day', null, 'ngày ghi rõ'],
  ['cmsrkm1ay000gufegvy8pdv9k', 'Chủ nhật 16.8', '2026-08-16', 'day', null, 'ngày ghi rõ'],
  ['cmsrk5x9t0007ok3gdazrzy23', 'Chủ nhật 16.8.2026', '2026-08-16', 'day', null, 'ngày ghi rõ'],
  ['cmsrjxxwg000dufegtf0dey7e', 'Ngày mai 14/8', '2026-08-14', 'day', null, 'gửi 13/08 → mai = 14/08, khớp ngày ghi rõ'],
  ['cmsqwkbno0001106ou61u78ek', 'Trưa 10h ngày 16/8', '2026-08-16', null, '10:00', 'ngày + giờ ghi rõ'],
  ['cmsq8wrah0004ge811n11mdor', 'Sáng chủ nhật', '2026-08-16', 'morning', null, 'gửi T4 12/08 → CN gần nhất = 16/08'],
  ['cmsq8tetj0001ge81yohlo7dr', 'Cuối tuần', '2026-08-15', 'day', null, 'gửi T4 12/08 → cuối tuần gần nhất, lấy T7 15/08'],
  ['cmsq7mfyf0001w5fuqk4dhco3', '10h trưa ngày 16/8', '2026-08-16', null, '10:00', 'ngày + giờ ghi rõ'],
  ['cmsq1v0qd0001gd977jcml4hx', 'Tối nay tầm 9h ngày12/8', '2026-08-12', null, '21:00', '9h tối = 21:00, ngày ghi rõ'],
  // "Sang tuần" — không có thứ nào cụ thể, đoán là bịa lịch → CỐ Ý BỎ QUA (giữ nguyên ở tab lead)
  ['cmspxiay4000gzun67dlquhwo', 'Ngày 16/8', '2026-08-16', 'day', null, 'chỉ có ngày'],
  ['cmspwlbf80004zun6hnd2723a', 'Chiều 15h thứ 7 ngày 15/8', '2026-08-15', null, '15:00', 'ngày + giờ ghi rõ'],
  ['cmsptu6ii0001zhsnsj96d5b3', 'sáng thứ 7 tuần này, tức ngày 15/8', '2026-08-15', 'morning', null, 'khách tự ghi rõ ngày'],
  ['cmspltbs10001s7xryyzd8hkt', 'Sáng mai lúc 9h', '2026-08-13', null, '09:00', 'gửi 12/08 → mai = 13/08'],
  ['cmsouyusu000dnhidq6apyunm', '8h30 tối mai', '2026-08-12', null, '20:30', 'gửi 11/08 → mai = 12/08; 8h30 tối = 20:30'],
  ['cmsouhm4z0007nhidoq2m6rat', '14h chiều mai', '2026-08-12', null, '14:00', 'gửi 11/08 → mai = 12/08'],
  ['cmsouecju0004nhidw9pmwxh4', '18h chiều mai', '2026-08-12', null, '18:00', 'gửi 11/08 → mai = 12/08'],
  ['cmsouaqoq000hbvwy20zcegd1', '8h tối mai', '2026-08-12', null, '20:00', 'gửi 11/08 → mai = 12/08; 8h tối = 20:00'],
  ['cmsoua36t0001nhidcxopdm57', 'chiều mai 15h30', '2026-08-12', null, '15:30', 'gửi 11/08 → mai = 12/08'],
  ['cmsou569b000ebvwy8h1j77lm', '8h tối mai', '2026-08-12', null, '20:00', 'gửi 11/08 → mai = 12/08'],
  ['cmsotzpmt0006x0cfqe0usa4g', '8h tối mai', '2026-08-12', null, '20:00', 'gửi 11/08 → mai = 12/08'],
  ['cmsotiatf0008bvwykx2xhpw9', '7h30 tối mai', '2026-08-12', null, '19:30', 'gửi 11/08 → mai = 12/08'],
  ['cmsoox17h0001qnwqkik4fe0x', 'Sáng mai', '2026-08-12', 'morning', null, 'gửi 11/08 → mai = 12/08'],
  ['cmsohqtpb0001wdh40mm1nyit', 'Chiều nay', '2026-08-11', 'afternoon', null, 'gửi 11/08 17h → chiều cùng ngày'],
  ['cmso07s32000d4kr6ejzhugou', '16h30 chiều', '2026-08-11', null, '16:30', 'gửi 11/08 sáng → chiều cùng ngày'],
  ['cmso06bs9000a4kr6lyhrtj4p', 'Chiều nay, 16h', '2026-08-11', null, '16:00', 'gửi 11/08 → cùng ngày'],
  ['cmsnzc6vj00074kr6yir1hdfr', '16h30 chiều nay', '2026-08-11', null, '16:30', 'gửi 11/08 → cùng ngày'],
  ['cmsny0c930001ordeb6bv0yzq', 'sáng ngày 11 tháng 8', '2026-08-11', 'morning', null, 'ngày ghi rõ'],
  ['cmsnxxav500044kr61v50qyfk', 'sáng hoặc chiều ngày 11 tháng 8', '2026-08-11', 'morning', null, 'hai lựa chọn → lấy mốc sớm nhất'],
  ['cmsnxt66z00014kr6sxplh8fe', 'sáng ngày 11 tháng 8 năm 2026', '2026-08-11', 'morning', null, 'ngày ghi rõ'],
  ['cmslyg5j10001u7bod7e3yz93', 'Từ 10h đến 16h ngày 10/8/2026', '2026-08-10', null, '10:00', 'khoảng giờ → lấy mốc bắt đầu'],
  ['cmsigkhd400016zr4ssd4omqh', 'Chủ nhật 9/8', '2026-08-09', 'day', null, 'ngày ghi rõ'],
  ['cmsd1b5mp0001y0kg19vluuod', '8/8/2026', '2026-08-08', 'day', null, 'chỉ có ngày'],
];

/** Ghi chú CỐ Ý không bóc — quá mơ hồ, đoán ra là bịa lịch cho khách. */
const SKIPPED = [
  ['cmspxonyl000mzun6dht279ef', 'Sang tuần', 'không nói thứ mấy'],
  ['cmspxixn9000jzun63axhrc1n', 'Sang tuần', 'không nói thứ mấy'],
];

const vn = d => new Date(new Date(d).getTime() + 7 * 3600000);
const ymd = d => `${vn(d).getUTCFullYear()}-${String(vn(d).getUTCMonth() + 1).padStart(2, '0')}-${String(vn(d).getUTCDate()).padStart(2, '0')}`;

(async () => {
  console.log(`\n${APPLY ? '⚠️  GHI THẬT VÀO DB' : '🔍 CHẠY THỬ — không ghi gì'}${FUTURE_ONLY ? ' (chỉ lịch chưa qua)' : ''}`);
  console.log(`Bảng bóc tay: ${PARSED.length} lead · cố ý bỏ qua: ${SKIPPED.length}\n`);

  const todayVN = new Date(`${ymd(new Date())}T00:00:00+07:00`);
  let wrote = 0, skipDone = 0, mismatch = 0, past = 0, future = 0;

  for (const [id, note, date, slot, time, why] of PARSED) {
    const row = await p.viewingRequest.findUnique({
      where: { id }, select: { id: true, name: true, note: true, preferredDate: true, status: true },
    });
    if (!row) { console.log(`  ⛔ ${id} — không còn trong DB`); mismatch++; continue; }
    // Đối chiếu ghi chú: bảng lập sẵn mà dữ liệu đã đổi thì DỪNG dòng đó, không ghi mò.
    if ((row.note || '').trim() !== note) {
      console.log(`  ⛔ ${id} — ghi chú đã đổi ("${(row.note || '').trim().slice(0, 40)}") → bỏ qua`);
      mismatch++; continue;
    }
    if (row.preferredDate) { skipDone++; continue; } // đã có giờ hẹn → không ghi đè

    const clock = time || SLOT_HOUR[slot] || '09:00';
    const when = new Date(`${date}T${clock}:00+07:00`);
    const isPast = when < todayVN;
    isPast ? past++ : future++;

    const shown = time ? time : slot === 'day' ? 'chưa rõ giờ' : slot;
    console.log(`  ${isPast ? '⬜' : '🟢'} ${(row.name || 'Khách').padEnd(16)} "${note.slice(0, 34).padEnd(34)}" → ${date} ${shown.padEnd(12)} ${isPast ? 'đã qua' : 'SẮP TỚI'}  · ${why}`);

    if (APPLY && !(FUTURE_ONLY && isPast)) {
      await p.viewingRequest.update({
        where: { id }, data: { preferredDate: when, preferredSlot: slot || null },
      });
      wrote++;
    }
  }

  console.log('\n  Cố ý KHÔNG bóc (giữ nguyên ở tab "Xin xem phòng"):');
  for (const [, note, why] of SKIPPED) console.log(`  ⚪ "${note}" — ${why}`);

  console.log(`\n───────────────────────────────────────────────`);
  console.log(`Sắp tới (sẽ lên lịch): ${future} · đã qua: ${past} · đã có giờ hẹn từ trước: ${skipDone}${mismatch ? ` · lệch dữ liệu: ${mismatch}` : ''}`);
  console.log(APPLY ? `Đã ghi vào DB: ${wrote} lead` : `CHƯA ghi gì. Ưng thì chạy lại kèm --apply`);
  await p.$disconnect();
})();
