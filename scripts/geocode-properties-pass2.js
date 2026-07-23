#!/usr/bin/env node
/**
 * geocode-properties-pass2.js — Vòng 2 cho các tòa vòng 1 trượt: LÀM SẠCH địa chỉ trước khi hỏi
 * Nominatim (địa chỉ nhập tay rất bẩn: "Số nhà 25 ngách 8 ngõ quỳnh", ghi chú trong ngoặc...).
 * Chiến lược mỗi tòa (thử lần lượt):
 *   1. fullAddress bỏ số nhà + bỏ ngoặc + bỏ "ngách X" (giữ "ngõ Y đường Z") + district
 *   2. rút gọn còn "đường/phố cuối cùng" + district  (VD "ngách 8 ngõ quỳnh" → "ngõ Quỳnh")
 *   3. streetName làm sạch + district
 * Vẫn 1 req/s; vẫn chặn toạ độ ngoài Hà Nội; vẫn KHÔNG rơi về tâm quận.
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
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const inHanoi = (lat, lng) => lat >= 20.5 && lat <= 21.5 && lng >= 105.2 && lng <= 106.2;

// Rút gọn theo logic redactHouseNumber của lib/address.ts (bản JS)
function stripHouseNumber(input) {
  if (!input) return '';
  let s = input.trim().replace(/^["'“”']+/, '').replace(/["'“”']+$/, '');
  s = s.replace(/\(.*?\)/g, ' ');                                              // bỏ ghi chú trong ngoặc
  s = s.replace(/^\s*(?:địa\s*chỉ|đ\/c|dc)\s*[:.]?\s*/i, '');
  s = s.replace(/\b(?:số\s*nhà|nhà\s*số|nhà)\s*\d+[a-zA-Z0-9]*\b/gi, ' ');
  s = s.replace(/^\s*(?:số\s*nhà|số|s\.)\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b[\s,.\-]*/i, '');
  if (!/^\s*(?:ngõ|ngách|hẻm|hem|ngo|ngach|phố|pho|đường|duong|tổ|to)\b/i.test(s)) {
    s = s.replace(/^\s*\d+[a-zA-Z]?(?:\s*\/\s*\d+[a-zA-Z]?)*\b[\s,.\-]*/i, '');
  }
  return s.replace(/\s{2,}/g, ' ').replace(/^[\s,.\-/]+/, '').replace(/[\s,]+$/, '').trim();
}

// "ngách 8 ngõ Quỳnh" → "ngõ Quỳnh"; "ngõ 2 Nguyên Xá" → "Nguyên Xá" (tên phố sau cùng)
function lastStreetPhrase(s) {
  if (!s) return '';
  const m = s.match(/(?:ngõ|ngo)\s+([^,;]+)$/i);
  if (m) return `ngõ ${m[1].trim()}`;
  const parts = s.split(/[,;]/).map(x => x.trim()).filter(Boolean);
  const last = parts[parts.length - 1] || '';
  // bỏ tiền tố ngách/ngõ + số → còn tên phố
  return last.replace(/\b(?:ngách|ngach|ngõ|ngo|hẻm)\s*\d+[a-zA-Z]?\b/gi, ' ').replace(/\s{2,}/g, ' ').trim();
}

async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const hit = (await res.json())?.[0];
  if (!hit) return null;
  const lat = parseFloat(hit.lat), lng = parseFloat(hit.lon);
  return inHanoi(lat, lng) ? { lat, lng } : null;
}

(async () => {
  const props = await prisma.property.findMany({
    where: { OR: [{ latitude: null }, { longitude: null }] },
    select: { id: true, name: true, fullAddress: true, streetName: true, district: true, city: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Vòng 2 — còn thiếu toạ độ: ${props.length} tòa`);

  let ok = 0, miss = 0;
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    const city = p.city || 'Hà Nội';
    const cleaned = stripHouseNumber(p.fullAddress || '');
    const street2 = lastStreetPhrase(cleaned);
    const streetClean = stripHouseNumber(p.streetName || '');

    const queries = [];
    if (cleaned) queries.push(`${cleaned}, ${p.district}, ${city}`);
    if (street2 && street2.toLowerCase() !== cleaned.toLowerCase()) queries.push(`${street2}, ${p.district}, ${city}`);
    if (streetClean && ![cleaned, street2].map(x => x.toLowerCase()).includes(streetClean.toLowerCase())) {
      queries.push(`${streetClean}, ${p.district}, ${city}`);
    }

    let geo = null;
    for (const q of queries) {
      geo = await geocode(q);
      await sleep(1100);
      if (geo) break;
    }

    if (geo) {
      await prisma.property.update({ where: { id: p.id }, data: { latitude: geo.lat, longitude: geo.lng } });
      ok++;
    } else miss++;

    if ((i + 1) % 25 === 0 || i === props.length - 1) {
      console.log(`  ${i + 1}/${props.length} — trúng thêm: ${ok}, vẫn trượt: ${miss}`);
    }
  }

  const totalGeo = await prisma.property.count({ where: { latitude: { not: null }, longitude: { not: null } } });
  const total = await prisma.property.count();
  console.log(`\n== VÒNG 2 XONG == trúng thêm ${ok}. Tổng phủ toạ độ: ${totalGeo}/${total} tòa`);
  await prisma.$disconnect();
})().catch(e => { console.error('LỖI:', e.message); process.exit(1); });
