#!/usr/bin/env node
// Re-pin CHÍNH XÁC toàn bộ: (1) thử "Ngõ N + phố" trước (OSM Hà Nội có map từng ngõ),
// (2) lùi về tên phố. MỌI kết quả phải: display_name CHỨA ĐÚNG TÊN PHỐ (norm, bỏ dấu)
// + nằm trong 7km tâm quận. Sửa lỗi audit cũ nhận mỏ neo không kiểm tên (Đông Quan → pin lạc Đống Đa).
// Chỉ ghi khi pin mới lệch pin cũ >0.25km. Backup mọi thay đổi.
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
  return s.replace(/["',;.:]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
// Lấy số NGÕ đầu tiên: "Số 10 ngõ 144/4 Quan Nhân" → "144"
function alleyNumber(input) {
  const m = (input || '').match(/\b(?:ngõ|ngo)\s*(\d+[a-zA-Z]?)/i);
  return m ? m[1] : null;
}
const cache = new Map();
async function geocodeValidated(q, streetCore, center) {
  const key = q;
  if (cache.has(key)) return cache.get(key);
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=vn&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA } });
  await sleep(1100);
  let out = null;
  if (r.ok) {
    const arr = (await r.json()) || [];
    for (const h of arr) {
      const lat = parseFloat(h.lat), lng = parseFloat(h.lon);
      // BẮT BUỘC: tên phố nằm trong display_name + trong 7km tâm quận
      if (norm(h.display_name).includes(streetCore) && km({ lat, lng }, center) <= 7) { out = { lat, lng, dn: h.display_name }; break; }
    }
  }
  cache.set(key, out);
  return out;
}
(async () => {
  const props = await prisma.property.findMany({
    where: { latitude: { not: null } },
    select: { id: true, name: true, fullAddress: true, streetName: true, district: true, latitude: true, longitude: true },
  });
  console.log('Tổng:', props.length);
  let fixed = 0, checkedQ = 0; const backup = [];
  for (const p of props) {
    const center = CENTERS[norm(p.district)];
    if (!center) continue;
    const src = [p.streetName, p.fullAddress].filter(Boolean).join(' | ');
    const street = bareStreet(p.streetName || '') || bareStreet(p.fullAddress || '');
    const core = norm(street);
    if (core.length < 4) continue;
    const alley = alleyNumber(p.streetName || '') || alleyNumber(p.fullAddress || '');
    let hit = null;
    if (alley) hit = await geocodeValidated(`Ngõ ${alley} ${street}, Hà Nội, Việt Nam`, core, center);
    if (!hit) hit = await geocodeValidated(`${street}, Hà Nội, Việt Nam`, core, center);
    checkedQ++;
    if (!hit) continue;
    const d = km({ lat: p.latitude, lng: p.longitude }, hit);
    if (d > 0.25) {
      backup.push({ id: p.id, latitude: p.latitude, longitude: p.longitude });
      await prisma.property.update({ where: { id: p.id }, data: { latitude: hit.lat, longitude: hit.lng } });
      fixed++;
      console.log(` 🔧 ${(p.streetName || p.fullAddress || '').slice(0, 38).padEnd(40)} dời ${d.toFixed(1)}km → ${hit.dn.slice(0, 55)}`);
    }
    if (checkedQ % 50 === 0) console.log(`  ...${checkedQ}/${props.length}, đã sửa ${fixed}`);
  }
  if (backup.length) fs.appendFileSync(process.env.HOME + '/.mixstay-backups/backup-fix-pins-2026-07-23.json', JSON.stringify(backup) + '\n');
  console.log(`\n== XONG == dời lại ${fixed} pin (trong ${props.length} tòa)`);
  await prisma.$disconnect();
})().catch(e => { console.error('LỖI:', e.message); process.exit(1); });
