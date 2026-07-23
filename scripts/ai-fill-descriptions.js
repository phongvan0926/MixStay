#!/usr/bin/env node
/**
 * ai-fill-descriptions.js — AI viết mô tả cho các tin có mô tả QUÁ NGẮN (<40 ký tự).
 * CHỈ dùng dữ liệu thật của tin (loại, m², giá, tiện ích, khu vực) — prompt cấm bịa, cấm số nhà/SĐT.
 * IDEMPOTENT: chạy lại bao nhiêu lần cũng chỉ xử lý phần còn thiếu — hết quota Gemini thì mai chạy tiếp:
 *   node scripts/ai-fill-descriptions.js
 * Hỗ trợ nhiều key: GEMINI_API_KEY, GEMINI_API_KEY_2..10, GEMINI_API_KEYS (xoay khi 429).
 */
const {PrismaClient}=require('@prisma/client');
const fs=require('fs');
for(const f of ['.env.local','.env']){try{fs.readFileSync(f,'utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');});}catch{}}
const p=new PrismaClient();
const KEYS=(()=>{const set=new Set();const add=v=>v?.split(',').forEach(k=>{const t=k.trim();if(t)set.add(t);});add(process.env.GEMINI_API_KEYS);add(process.env.GEMINI_API_KEY);for(let i=2;i<=10;i++)add(process.env['GEMINI_API_KEY_'+i]);return [...set];})();
const MODEL=process.env.GEMINI_MODEL||'gemini-2.5-flash';
let ki=0;
async function gem(prompt){
  for(let t=0;t<KEYS.length*2;t++){
    const key=KEYS[ki%KEYS.length];
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.7,maxOutputTokens:800,responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:{description:{type:'STRING'}},required:['description']},thinkingConfig:{thinkingBudget:0}}})});
    if(res.ok){const d=await res.json();return (d?.candidates?.[0]?.content?.parts||[]).map(x=>x?.text||'').join('');}
    if(res.status===429){ki++; await new Promise(r=>setTimeout(r,3000)); continue;}
    throw new Error('Gemini '+res.status);
  }
  return null; // het quota moi key
}
const TYPE={don:'Phòng đơn khép kín',gac_xep:'Phòng có gác xép','1k1n':'Căn 1 ngủ 1 khách','2k1n':'Căn 2 ngủ 1 khách',studio:'Studio',duplex:'Duplex'};
const fmt=n=>n?n.toLocaleString('vi-VN')+'đ':'';
(async()=>{
  const rts=await p.roomType.findMany({
    select:{id:true,name:true,typeName:true,areaSqm:true,priceMonthly:true,deposit:true,amenities:true,shortTermAllowed:true,shortTermPrice:true,description:true,
      property:{select:{district:true,streetName:true,amenities:true,parkingCar:true,parkingBike:true,evCharging:true,petAllowed:true,foreignerOk:true}}},
  });
  const targets=rts.filter(r=>!r.description||r.description.trim().length<40);
  console.log('Can viet mo ta:',targets.length,'| so key Gemini:',KEYS.length);
  let ok=0,fail=0;
  for(let i=0;i<targets.length;i++){
    const r=targets[i];
    const flags=[];
    const pr=r.property||{};
    if(pr.parkingCar)flags.push('ô tô đỗ cửa');
    if(pr.parkingBike)flags.push('chỗ để xe máy');
    if(pr.evCharging)flags.push('sạc xe điện');
    if(pr.petAllowed)flags.push('nuôi thú cưng');
    if(pr.foreignerOk)flags.push('người nước ngoài thuê được');
    const prompt=`Viết MÔ TẢ tin cho thuê phòng (tiếng Việt có dấu, 3-6 câu hoặc gạch đầu dòng ngắn, dễ đọc trên điện thoại, không markdown ** #, emoji tiết chế).
TUYỆT ĐỐI CHỈ dùng thông tin dưới đây — KHÔNG bịa thêm tiện nghi/giá/ưu đãi. KHÔNG ghi số nhà, KHÔNG SĐT.
- Tiêu đề: ${r.name}
- Loại: ${TYPE[r.typeName]||r.typeName}, ${r.areaSqm}m²
- Giá thuê: ${fmt(r.priceMonthly)}/tháng${r.deposit?`, cọc ${fmt(r.deposit)}`:''}
${r.shortTermAllowed?`- Cho thuê ngắn hạn${r.shortTermPrice?` giá ${fmt(r.shortTermPrice)}/tháng`:''}\n`:''}- Khu vực: ${[pr.streetName,pr.district].filter(Boolean).join(', ')}
- Nội thất trong phòng: ${(r.amenities||[]).join(', ')||'(không rõ)'}
- Tiện ích tòa nhà: ${[...(pr.amenities||[]),...flags].join(', ')||'(không rõ)'}
${r.description?.trim()?`- Ghi chú gốc của chủ nhà (giữ ý): ${r.description.trim()}`:''}`;
    try{
      const out=await gem(prompt);
      if(out===null){console.log('HET QUOTA tat ca key — dung o',i,'/',targets.length);break;}
      let desc='';
      try{desc=(JSON.parse(out).description||'').trim();}catch{}
      desc=desc.replace(/\*\*/g,'').replace(/\n{3,}/g,'\n\n').trim();
      if(desc.length>=60){
        await p.roomType.update({where:{id:r.id},data:{description:desc}});
        ok++;
      } else fail++;
    }catch(e){fail++;}
    if((i+1)%20===0) console.log(`  ${i+1}/${targets.length} — ghi: ${ok}, loi/bo: ${fail}`);
    await new Promise(r=>setTimeout(r,4200)); // ~14 req/phut — duoi RPM free tier
  }
  console.log(`\nXONG: ghi ${ok}, loi/bo ${fail} / ${targets.length}`);
  const left=await p.roomType.count({where:{OR:[{description:null},{description:''}]}});
  console.log('(idempotent — chay lai script se tiep tuc phan con thieu)');
  await p.$disconnect();
})().catch(e=>{console.error('LOI:',e.message);process.exit(1)});
