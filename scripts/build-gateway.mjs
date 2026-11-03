import {readFile,mkdir,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
let source=await readFile(new URL('infrastructure/recovery-worker.mjs',root),'utf8');
source=source.replace('__MOTION_CSS__',JSON.stringify(await readFile(new URL('public/motion.css',root),'utf8')))
 .replace('__MOTION_JS__',JSON.stringify(await readFile(new URL('public/motion.js',root),'utf8')));
await mkdir(new URL('.cache/',root),{recursive:true});
await writeFile(new URL('.cache/gateway-worker.mjs',root),source);
console.log('Built .cache/gateway-worker.mjs');
