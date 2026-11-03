import {cp,mkdir,readdir,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
const root=new URL('../',import.meta.url),source=new URL('public/',root),out=new URL('deployment/zigma/',root);
const known=/(["'`(]\s*)\/(?=(?:assets|feeds|vendor|api|about|therapy|otbelivanie|implantation|privacy-policy|tpost|page\d+(?:\.html)?|motion\.(?:js|css)|service-catalog\.json|service-assistant\.(?:js|css)|local-only\.js|phone-input\.js|site-enhancements\.(?:js|css)|theme\.css|responsive\.css)(?:[\/"'`?#)\s]|$))/g;
const rootOut=new URL('deployment/root/',root);
await mkdir(new URL('deployment/',root),{recursive:true});await rm(rootOut,{recursive:true,force:true});await cp(source,rootOut,{recursive:true});
async function patch(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=new URL(e.name+(e.isDirectory()?'/':''),dir);if(e.isDirectory()){await patch(f);continue;}if(!e.name.endsWith('.html'))continue;let s=await readFile(f,'utf8');s=s.replace("connect-src 'self'","connect-src 'self' https://zigma-clinic.jikoku.workers.dev").replaceAll('local-only.js?v=2','local-only.js?v=3');await writeFile(f,s);}}
await patch(rootOut);
await rm(out,{recursive:true,force:true});await cp(rootOut,out,{recursive:true});
let transformed=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=new URL(entry.name+(entry.isDirectory()?'/':''),dir);if(entry.isDirectory()){await walk(file);continue;}if(!/\.(?:html|css|js|json)$/.test(entry.name)||entry.name==='service-assistant.js')continue;let text=await readFile(file,'utf8');
 if(entry.name.endsWith('.html'))text=text.replace(/\b(href|src|data-original|data-img-zoom-url|action|poster|content)=(['"])\/(?!\/)/gi,(_,name,quote)=>name+'='+quote+'/zigma/');
 text=text.replace(known,(_,quote)=>quote+'/zigma/');await writeFile(file,text);transformed++;
}}
await walk(out);console.log('Built deployment/zigma with prefixed paths; transformed '+transformed+' files.');
