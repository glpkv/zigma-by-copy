import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../infrastructure/google-apps-script.gs',import.meta.url),'utf8');
const rows=[['ID заявки']],props=new Map(),cache=new Map();
let locked=false;
const sheet={getLastRow:()=>rows.length,getRange(row,col,height=1,width=1){return {
 getValue:()=>rows[row-1]?.[col-1],
 createTextFinder(id){return {matchEntireCell(){return this;},findNext:()=>rows.slice(row-1,row-1+height).some(r=>r[col-1]===id)?{}:null};},
 setValues(values){for(let i=0;i<values.length;i++)rows[row-1+i]=values[i];return this;},setNumberFormat(){return this;}
};}};
const context=vm.createContext({ContentService:{MimeType:{JSON:'json'},createTextOutput:content=>({content,setMimeType(){return this;}})},LockService:{getScriptLock:()=>({tryLock(){assert.equal(locked,false);locked=true;return true;},releaseLock(){locked=false;}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},Utilities:{formatDate:()=>new Date().toISOString().slice(0,10),DigestAlgorithm:{SHA_256:'sha'},computeDigest:(_,text)=>text,base64EncodeWebSafe:text=>Buffer.from(text).toString('base64url')}});
vm.runInContext(source,context);
const data={id:'12345678-1234-4123-8123-123456789012',name:'=Тест',phone:'80291234567',consent:true,page:'/therapy/',selection:[{id:'consultation',quantity:1}]};
const send=value=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(value)}}).content);
assert.equal(send(data).ok,true);assert.equal(rows.length,2);assert.equal(rows[1][2],"'=Тест");assert.equal(rows[1][3],"'+375291234567");assert.equal(rows[1][7],'');
assert.equal(send(data).ok,true);assert.equal(rows.length,2);
for(const patch of [{consent:false},{id:'invalid'},{phone:'+79990000000'},{name:'x\nHeader'},{website:'bot'},{selection:[{id:'consultation',quantity:99}]}])assert.equal(send({...data,...patch}).ok,false);
assert.equal(JSON.parse(context.doGet().content).enabled,true);
props.set('DAILY_USAGE',JSON.stringify({day:new Date().toISOString().slice(0,10),count:300}));
assert.equal(send({...data,id:'22345678-1234-4123-8123-123456789012'}).error,'DAILY_LIMIT');
assert.equal(locked,false);
console.log('PASS: validation, consent, service catalog, literal cells, phone normalization, duplicate retries, daily limit, locks.');
