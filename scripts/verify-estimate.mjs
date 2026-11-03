import assert from 'node:assert/strict';
import {calculateEstimate} from '../intake/estimate.mjs';
import {validateAppointment,saveAppointment} from '../intake/github-store.mjs';
const selection=[{id:'caries',quantity:2},{id:'hygiene',quantity:1}];
const pending=calculateEstimate(selection);assert.equal(pending.min,null);assert.equal(pending.max,null);assert.equal(pending.items.length,2);
const pricing={version:'test-only',currency:'BYN',services:[{id:'caries',label:'Тест',maxQuantity:16,min:100.10,max:150.25},{id:'hygiene',label:'Тест 2',maxQuantity:1,min:200,max:210}]};
const total=calculateEstimate(selection,pricing);assert.equal(total.min,400.2);assert.equal(total.max,510.5);
for(const value of [[{id:'bad',quantity:1}],[{id:'caries',quantity:0}],[{id:'caries',quantity:1.5}],[{id:'caries',quantity:17}],[{id:'caries',quantity:1},{id:'caries',quantity:1}],null])assert.throws(()=>calculateEstimate(value));
const data={id:'12345678-1234-4123-8123-123456789012',name:'Проверка',phone:'+375290000000',page:'/zigma/',consent:true,selection,estimate:{min:1,max:1}};
assert.equal(validateAppointment(data).estimate.min,null,'A visitor cannot set the price');
const legacy='id,created_at,name,phone,page,consent\n"old","2026","Пример","phone","/","true"\n';let written;
await saveAppointment(data,'test',async(url,options)=>{
 if(!url.includes('/contents/'))return Response.json({private:true});
 if(options.method==='PUT'){written=JSON.parse(options.body);return Response.json({}, {status:201});}
 return Response.json({sha:'legacy',size:legacy.length,encoding:'base64',content:Buffer.from(legacy).toString('base64')});
});
const csv=Buffer.from(written.content,'base64').toString();assert.match(csv,/services,estimate_min_byn,estimate_max_byn,catalog_version/);assert.match(csv,/"old","2026","Пример","phone","\/","true","","","",""/);assert.match(csv,/Лечение кариеса × 2; Профессиональная гигиена × 1/);
console.log('PASS: missing prices stay unknown, totals use integer kopecks, invalid selections are rejected, server prices cannot be overridden, and CSV migration preserves existing rows.');
