#!/usr/bin/env node
/**
 * geocode-fix-outliers.js — Rà pin đặt SAI CHỖ: tòa nào cách cụm pin cùng quận > 4.5km
 * (median toạ độ theo quận) thì geocode lại bằng query CHUẨN (luôn kèm quận).
 *   - Tìm được vị trí mới → cập nhật.
 *   - Không tìm được → GỠ pin (set null): không có pin còn hơn pin sai chỗ.
 * Nguồn lỗi gốc: các bản backfill đầu query "fullAddress + Hà Nội" thiếu quận →
 * Nominatim bắt POI trùng số nhà ở quận khác (VD "99 Trương Định" → Ba Đình).
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
const OUTLIER_KM = 4.5;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const inHanoi = (lat, lng) => lat >= 20.5 && lat <= 21.5 && lng >= 105.2 && lng <= 106.2;

const km = (a, b) => {
  const R = 6371, dLa = (b.lat - a.lat) * Math.PI / 180, dLo = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

function stripHouseNumber(input) {
  if (!input) return '';
  let s = input.trim().replace(/^["'“”']+/, '').replace(/["'“”']+$/, '');
  s = s.replace(/\(.*?\)/g, ' ');
  s = s.replace(/^\s*(?:địa\s*chỉ|đ\/c|dc)\s*[:.]?\s*/i, '');
  s = s.replace(/\b(?:số\s*nhà|nhà\s*số|nhà)\s*\d+[a-zA-Z0-9]*\b/gi, ' ');
  s = s.replace(/^\s*(?:số\s*nhà|số|s\.)\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b[\s,.\-]*/i, '');
  if (!/^\s*(?:ngõ|ngách|hẻm|hem|ngo|ngach|phố|pho|đường|duong|tổ|to)\b/i.test(s)) {
    s = s.replace(/^\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b[\s,.\-]*/i, '');
  }
  return s.replace(/\s{2,}/g, ' ').replace(/^[\s,.\-/]+/, '').replace(/[\s,]+$/, '').trim();
}

// viewbox + bounded=1: ÉP Nominatim chỉ trả kết quả trong khung quận — free-text kèm tên quận
// vẫn bị bắt nhầm tên trùng ở quận khác (VD "Nguyễn Chí Thanh" Đống Đa → dính Long Biên).
async function geocode(q, box) {
  let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn&q=${encodeURIComponent(q)}`;
  if (box) url += `&viewbox=${box.w},${box.n},${box.e},${box.s}&bounded=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const hit = (await res.json())?.[0];
  if (!hit) return null;
  const lat = parseFloat(hit.lat), lng = parseFloat(hit.lon);
  return inHanoi(lat, lng) ? { lat, lng } : null;
}

(async () => {
  const rows = await prisma.property.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, name: true, district: true, fullAddress: true, streetName: true, city: true, latitude: true, longitude: true },
  });

  // median toạ độ theo quận (chuẩn hoá tên quận: trim + lowercase)
  const byD = {};
  rows.forEach(r => { (byD[r.district.trim().toLowerCase()] ||= []).push(r); });
  const suspects = [];
  const medByD = {}; // median + khung quận (median ± ~5km) để bound query & tự kiểm sau geocode
  for (const [dk, list] of Object.entries(byD)) {
    if (list.length < 4) continue;
    const med = {
      lat: list.map(r => r.latitude).sort((a, b) => a - b)[Math.floor(list.length / 2)],
      lng: list.map(r => r.longitude).sort((a, b) => a - b)[Math.floor(list.length / 2)],
    };
    medByD[dk] = med;
    list.forEach(r => { if (km({ lat: r.latitude, lng: r.longitude }, med) > OUTLIER_KM) suspects.push(r); });
  }
  console.log(`Pin khả nghi (> ${OUTLIER_KM}km khỏi cụm quận): ${suspects.length}`);

  let fixed = 0, removed = 0;
  for (const p of suspects) {
    const city = p.city || 'Hà Nội';
    const med = medByD[p.district.trim().toLowerCase()];
    // khung quận ≈ median ± 5km (0.045°); geocode CHỈ nhận kết quả trong khung này
    const box = med ? { w: med.lng - 0.045, e: med.lng + 0.045, n: med.lat + 0.045, s: med.lat - 0.045 } : null;
    const cleaned = stripHouseNumber(p.fullAddress || '');
    const streetClean = stripHouseNumber(p.streetName || '');
    const queries = [];
    if (p.fullAddress?.trim()) queries.push(`${p.fullAddress}, ${p.district}, ${city}, Việt Nam`);
    if (cleaned) queries.push(`${cleaned}, ${p.district}, ${city}`);
    if (streetClean && streetClean.toLowerCase() !== cleaned.toLowerCase()) queries.push(`${streetClean}, ${p.district}, ${city}`);

    let geo = null;
    for (const q of queries) {
      geo = await geocode(q, box);
      await sleep(1100);
      // tự kiểm lần cuối: kết quả vẫn lệch cụm quận > OUTLIER_KM → coi như trượt
      if (geo && med && km(geo, med) > OUTLIER_KM) geo = null;
      if (geo) break;
    }

    if (geo) {
      await prisma.property.update({ where: { id: p.id }, data: { latitude: geo.lat, longitude: geo.lng } });
      fixed++;
      console.log(`  ✔ sửa: ${p.name.trim().slice(0, 50)} → ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`);
    } else {
      await prisma.property.update({ where: { id: p.id }, data: { latitude: null, longitude: null } });
      removed++;
      console.log(`  ✖ gỡ pin (không geocode được): ${p.name.trim().slice(0, 50)}`);
    }
  }
  console.log(`\n== XONG == sửa vị trí: ${fixed}, gỡ pin: ${removed}/${suspects.length}`);
  await prisma.$disconnect();
})().catch(e => { console.error('LỖI:', e.message); process.exit(1); });
