#!/usr/bin/env node
// Audit pin bản đồ: pin phải nằm gần TUYẾN PHỐ của chính tòa đó.
// - Geocode mỗi (phố, quận) duy nhất 1 lần (validate trong 7km tâm quận).
// - Tòa nào pin lệch >3km khỏi điểm phố → nghi sai (kiểu Tân Ấp pin về Hồ Gươm) → ghim lại về điểm phố.
// - Phố không geocode được → bỏ qua (không đủ căn cứ phán).
// Backup mọi dòng bị sửa vào ~/.mixstay-backups/backup-fix-pins-2026-07-23.json
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
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
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
  s = s.replace(/\b(?:ngách|ngach|hẻm|hem|số\s*nhà|nhà\s*số|số|sn|nhà|tổ|to)\s*\d+[a-zA-Z0-9]*(?:\s*\/\s*\d+[a-zA-Z]?)*\b/gi, ' ');
  s = s.replace(/\b(?:ngõ|ngo)\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b/gi, ' ');
  s = s.replace(/\b(?:kdt|khu\s*đô\s*thị|liền\s*kề|lk)\s*\d*\b/gi, ' ');
  s = s.replace(/^\s*\d+[a-zA-Z]?(?:[\s./-]*\d+[a-zA-Z]?)*\b/i, ' ');
  s = s.replace(/\b(?:đường|duong)\b/gi, ' ');
  return s.replace(/["',;.:]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
async function geocode(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=vn&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA } });
  if (!r.ok) return [];
  return ((await r.json()) || []).map(h => ({ lat: parseFloat(h.lat), lng: parseFloat(h.lon) }));
}
(async () => {
  const props = await prisma.property.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, name: true, fullAddress: true, streetName: true, district: true, latitude: true, longitude: true },
  });
  // Gom theo (phố trần, quận)
  const groups = new Map();
  for (const p of props) {
    const street = bareStreet(p.streetName || '') || bareStreet(p.fullAddress || '');
    if (street.length < 4) continue;
    const key = norm(street) + '|' + norm(p.district);
    if (!groups.has(key)) groups.set(key, { street, district: p.district, items: [] });
    groups.get(key).items.push(p);
  }
  console.log(`Tòa có pin: ${props.length} | cụm (phố,quận) cần tra: ${groups.size}`);
  let checked = 0, flagged = 0, fixed = 0, unknown = 0;
  const backup = [];
  for (const [key, g] of groups) {
    const center = CENTERS[norm(g.district)];
    if (!center) { unknown++; continue; }
    const hits = await geocode(`${g.street}, Hà Nội, Việt Nam`);
    await sleep(1100);
    const anchor = hits.find(h => km(h, center) <= 7);
    if (!anchor) { unknown++; continue; } // phố không tra được → không phán
    checked++;
    for (const p of g.items) {
      const d = km({ lat: p.latitude, lng: p.longitude }, anchor);
      if (d > 3) {
        flagged++;
        backup.push({ id: p.id, fullAddress: p.fullAddress, streetName: p.streetName, latitude: p.latitude, longitude: p.longitude });
        await prisma.property.update({ where: { id: p.id }, data: { latitude: anchor.lat, longitude: anchor.lng } });
        fixed++;
        console.log(` 🔧 ${(p.fullAddress || p.name).slice(0, 45).padEnd(47)} lệch ${d.toFixed(1)}km khỏi "${g.street}" (${g.district}) → ghim lại`);
      }
    }
    if (checked % 40 === 0) console.log(`  ...đã tra ${checked}/${groups.size} cụm, sửa ${fixed}`);
  }
  if (backup.length) fs.appendFileSync(process.env.HOME + '/.mixstay-backups/backup-fix-pins-2026-07-23.json', JSON.stringify(backup) + '\n');
  console.log(`\n== AUDIT XONG == cụm tra được: ${checked} | không tra được (bỏ qua): ${unknown} | pin sửa lại: ${fixed}`);
  await prisma.$disconnect();
})().catch(e => { console.error('LỖI:', e.message); process.exit(1); });
