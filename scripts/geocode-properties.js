#!/usr/bin/env node
/**
 * geocode-properties.js — Backfill toạ độ (latitude/longitude) cho tòa nhà từ địa chỉ,
 * dùng Nominatim (OpenStreetMap, miễn phí) — tôn trọng rate limit 1 request/giây.
 *
 * Chạy:  node scripts/geocode-properties.js            → chỉ geocode tòa CHƯA có toạ độ
 *        node scripts/geocode-properties.js --force    → geocode lại tất cả
 *
 * Chiến lược mỗi tòa (thử lần lượt tới khi trúng):
 *   1. fullAddress đầy đủ
 *   2. streetName + district (tâm tuyến phố — vẫn đủ đúng cho bản đồ)
 * KHÔNG rơi về tâm quận: pin sai còn tệ hơn không có pin (tòa không geocode được sẽ
 * không hiện trên bản đồ, admin bổ sung sau).
 * Toạ độ ngoài Hà Nội (lat 20.5–21.5, lng 105.2–106.2) bị coi là geocode sai → bỏ.
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

for (const f of ['.env.local', '.env']) {
  try {
    fs.readFileSync(f, 'utf8').split('\n').forEach(l => {
      const m = l.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  } catch {}
}

const prisma = new PrismaClient();
const UA = 'MixStay/1.0 (contact@mixstay.vn)'; // Nominatim yêu cầu User-Agent định danh
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function inHanoi(lat, lng) {
  return lat >= 20.5 && lat <= 21.5 && lng >= 105.2 && lng <= 106.2;
}

async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const arr = await res.json();
  const hit = arr?.[0];
  if (!hit) return null;
  const lat = parseFloat(hit.lat), lng = parseFloat(hit.lon);
  if (!inHanoi(lat, lng)) return null;
  return { lat, lng };
}

(async () => {
  const force = process.argv.includes('--force');
  const where = force ? {} : { OR: [{ latitude: null }, { longitude: null }] };
  const props = await prisma.property.findMany({
    where,
    select: { id: true, name: true, fullAddress: true, streetName: true, district: true, city: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Cần geocode: ${props.length} tòa nhà (ước tính ~${Math.ceil(props.length * 1.5 / 60)} phút)`);

  let ok = 0, streetLevel = 0, miss = 0;
  const missed = [];
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    const city = p.city || 'Hà Nội';
    let geo = null, level = '';

    if (p.fullAddress?.trim()) {
      geo = await geocode(`${p.fullAddress}, ${city}, Việt Nam`);
      level = 'address';
      await sleep(1100);
    }
    if (!geo && p.streetName?.trim() && p.district) {
      geo = await geocode(`${p.streetName}, ${p.district}, ${city}, Việt Nam`);
      level = 'street';
      await sleep(1100);
    }

    if (geo) {
      await prisma.property.update({ where: { id: p.id }, data: { latitude: geo.lat, longitude: geo.lng } });
      ok++;
      if (level === 'street') streetLevel++;
    } else {
      miss++;
      missed.push(`${p.name} — ${p.fullAddress || '(trống)'} (${p.district})`);
    }
    if ((i + 1) % 25 === 0 || i === props.length - 1) {
      console.log(`  ${i + 1}/${props.length} — trúng: ${ok} (tâm phố: ${streetLevel}), trượt: ${miss}`);
    }
  }

  console.log('\n== KẾT QUẢ ==');
  console.log(`Geocode được: ${ok}/${props.length} (trong đó ${streetLevel} tòa chỉ tới mức tâm tuyến phố)`);
  if (missed.length) {
    console.log(`KHÔNG geocode được ${missed.length} tòa (không hiện trên bản đồ, bổ sung tay sau):`);
    missed.slice(0, 30).forEach(m => console.log('  -', m));
    if (missed.length > 30) console.log(`  ... và ${missed.length - 30} tòa nữa`);
  }
  await prisma.$disconnect();
})().catch(e => { console.error('LỖI:', e.message); process.exit(1); });
