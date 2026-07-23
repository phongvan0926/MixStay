#!/usr/bin/env node
/**
 * geocode-audit-pins.js — Rà + sửa pin theo TUYẾN ĐƯỜNG (chiến lược chốt với chủ dự án:
 * đúng tuyến đường là đạt; không chắc vị trí cụ thể → đặt 1 điểm TRÊN tuyến).
 *
 * Cách tìm "mỏ neo tuyến đường" cho từng tòa:
 *  1. Thử "Ngõ N <phố>" (đúng cửa ngõ nếu OSM có), rồi "Phố <phố>" / "Đường <phố>" / "<phố>".
 *  2. Tên phố rút dần từ phải (bỏ chữ thừa kiểu "đối diện Five Star", "cuối đường X").
 *  3. CHỈ TIN kết quả mà ĐOẠN ĐẦU TIÊN display_name chứa đúng tên phố (chống Nominatim
 *     trả ngõ khác cùng phường — "Ngõ 64 Kim Giang" khi hỏi "Ngõ 236 Khương Đình").
 *  4. Kết quả phải nằm trong 7km tâm quận.
 * Pin lệch quá ngưỡng (0.3km nếu neo là cửa ngõ, 1km nếu neo là tuyến phố) → kéo về neo.
 * Backup mọi thay đổi vào ~/.mixstay-backups/backup-fix-pins-<ngày>.json
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
const prisma = new PrismaClient();
const UA = 'MixStay/1.0 (contact@mixstay.vn)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const km = (a, b) => {
  const R = 6371, dLa = (b.lat - a.lat) * Math.PI / 180, dLo = (b.lng - a.lng) * Math.PI / 180;
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) ** 2));
};
const CENTERS = {
  'ba dinh': { lat: 21.0315, lng: 105.8264 }, 'bac tu liem': { lat: 21.0528, lng: 105.7802 },
  'cau giay': { lat: 21.0327, lng: 105.7953 }, 'dong da': { lat: 21.0137, lng: 105.824 },
  'ha dong': { lat: 20.9742, lng: 105.7912 }, 'hai ba trung': { lat: 21.0021, lng: 105.8562 },
  'hoan kiem': { lat: 21.0285, lng: 105.8524 }, 'hoang mai': { lat: 20.9796, lng: 105.8621 },
  'long bien': { lat: 21.0455, lng: 105.8759 }, 'nam tu liem': { lat: 21.0167, lng: 105.7763 },
  'tay ho': { lat: 21.0513, lng: 105.8112 }, 'thanh tri': { lat: 20.9757, lng: 105.8439 },
  'thanh xuan': { lat: 20.9929, lng: 105.8115 },
};
function bareStreet(input) {
  if (!input) return '';
  let s = input.trim();
  s = s.replace(/\(.*?\)/g, ' ');
  s = s.replace(/^\s*["':]*\s*(?:địa\s*chỉ|đ\/c|dc)?\s*[:.]?\s*/i, '');
  s = s.replace(/\b(?:ngách|ngach|hẻm|hem|số\s*nhà|nhà\s*số|số|sn|nhà|tổ|to|dãy)\s*\d+[a-zA-Z0-9]*(?:\s*\/\s*\d+[a-zA-Z]?)*\b/gi, ' ');
  s = s.replace(/\b(?:ngõ|ngo)\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b/gi, ' ');
  s = s.replace(/\b(?:kdt|khu\s*đô\s*thị|liền\s*kề|lk)\s*\d*\b/gi, ' ');
  s = s.replace(/^\s*\d+[a-zA-Z]?(?:[\s./-]*\d+[a-zA-Z]?)*\b/i, ' ');
  s = s.replace(/\b(?:đường|duong|phố|pho)\b/gi, ' ');
  return s.replace(/["',;.:-]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
function alleyNumber(input) {
  const m = (input || '').match(/\b(?:ngõ|ngo)\s*(\d+[a-zA-Z]?)/i);
  return m ? m[1] : null;
}
// Ứng viên tên phố: rút dần chữ thừa từ PHẢI ("Khương Đình đối diện Five Star" → "Khương Đình")
function candidates(street) {
  const words = street.split(/\s+/).filter(Boolean);
  const out = [];
  for (let len = words.length; len >= 1; len--) {
    const c = words.slice(0, len).join(' ');
    if (norm(c).length >= 4) out.push(c);
  }
  return out.slice(0, 5);
}
const cache = new Map();
async function query(q) {
  if (cache.has(q)) return cache.get(q);
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=vn&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA } });
  await sleep(1100);
  const out = r.ok ? ((await r.json()) || []) : [];
  cache.set(q, out);
  return out;
}
// Kết quả hợp lệ: ĐOẠN ĐẦU display_name chứa tên phố + trong 7km tâm quận
function pickValid(hits, cand, center) {
  const c = norm(cand);
  for (const h of hits) {
    const first = norm((h.display_name || '').split(',')[0]);
    const lat = parseFloat(h.lat), lng = parseFloat(h.lon);
    if (first.includes(c) && km({ lat, lng }, center) <= 7) return { lat, lng, dn: h.display_name };
  }
  return null;
}
async function findAnchor(street, alley, center) {
  for (const cand of candidates(street)) {
    if (alley) {
      const hit = pickValid(await query(`Ngõ ${alley} ${cand}, Hà Nội, Việt Nam`), cand, center);
      if (hit) return { ...hit, level: 'ngõ' };
    }
    for (const prefix of ['Phố ', 'Đường ', '']) {
      const hit = pickValid(await query(`${prefix}${cand}, Hà Nội, Việt Nam`), cand, center);
      if (hit) return { ...hit, level: 'phố' };
    }
  }
  return null;
}
(async () => {
  const props = await prisma.property.findMany({
    where: { latitude: { not: null } },
    select: { id: true, name: true, fullAddress: true, streetName: true, district: true, latitude: true, longitude: true },
  });
  console.log('Tổng:', props.length);
  let fixed = 0, noAnchor = 0, i = 0; const backup = [];
  for (const p of props) {
    i++;
    const center = CENTERS[norm(p.district)];
    if (!center) continue;
    const street = bareStreet(p.streetName || '') || bareStreet(p.fullAddress || '');
    if (norm(street).length < 4) continue;
    const alley = alleyNumber(p.streetName || '') || alleyNumber(p.fullAddress || '');
    const anchor = await findAnchor(street, alley, center);
    if (!anchor) { noAnchor++; continue; }
    // Đúng cửa ngõ → bám ngõ (lệch >0.3km kéo về); chỉ có tuyến phố → lệch >1km mới kéo
    const limit = anchor.level === 'ngõ' ? 0.3 : 1.0;
    const d = km({ lat: p.latitude, lng: p.longitude }, anchor);
    if (d > limit) {
      backup.push({ id: p.id, latitude: p.latitude, longitude: p.longitude });
      await prisma.property.update({ where: { id: p.id }, data: { latitude: anchor.lat, longitude: anchor.lng } });
      fixed++;
      console.log(` 🔧 ${(p.streetName || p.fullAddress || '').slice(0, 36).padEnd(38)} dời ${d.toFixed(1)}km → [${anchor.level}] ${anchor.dn.slice(0, 50)}`);
    }
    if (i % 50 === 0) console.log(`  ...${i}/${props.length}, sửa ${fixed}`);
  }
  if (backup.length) fs.appendFileSync(process.env.HOME + '/.mixstay-backups/backup-fix-pins-2026-07-23.json', JSON.stringify(backup) + '\n');
  console.log(`\n== XONG == kéo về tuyến đúng: ${fixed} | không tìm được tuyến (giữ nguyên): ${noAnchor}`);
  await prisma.$disconnect();
})().catch(e => { console.error('LỖI:', e.message); process.exit(1); });
