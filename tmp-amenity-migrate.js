const {PrismaClient}=require('@prisma/client');
const fs=require('fs');
for(const f of ['.env.local','.env']){try{fs.readFileSync(f,'utf8').split('\n').forEach(l=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');});}catch{}}
const p=new PrismaClient();
(async()=>{
  const rows=await p.roomType.findMany({where:{amenities:{has:'Bình nóng lạnh'}},select:{id:true,amenities:true}});
  console.log('Can migrate:',rows.length);
  let changed=0;
  for(const r of rows){
    const set=[];
    for(const a of r.amenities){
      if(a==='Bình nóng lạnh'){ if(!set.includes('Nóng lạnh')) set.push('Nóng lạnh'); continue; }
      if(!set.includes(a)) set.push(a);
    }
    await p.roomType.update({where:{id:r.id},data:{amenities:set}});
    changed++;
    if(changed%100===0) console.log('  ...',changed,'/',rows.length);
  }
  const left=await p.roomType.count({where:{amenities:{has:'Bình nóng lạnh'}}});
  console.log('XONG. Da cap nhat:',changed,'| con lai:',left);
  await p.$disconnect();
})().catch(e=>{console.error(e.message);process.exit(1)});
