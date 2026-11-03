import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {Readable} from 'node:stream';
import {handleAppointments} from '../intake/endpoint.mjs';
const root=path.resolve('public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'https://'+req.headers.host);
  res.setHeader('X-Zigma-Hosting','digitalocean-direct');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(url.pathname==='/healthz'){res.end('ok');return;}
  if(url.pathname==='/api/appointments'){
   const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
   const result=await handleAppointments(request,process.env);
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!filename.startsWith(root+path.sep)&&filename!==root){res.writeHead(403);res.end();return;}
  let file=filename;let info=await stat(file);
  if(info.isDirectory()){if(!url.pathname.endsWith('/')){res.writeHead(308,{Location:url.pathname+'/'+url.search});res.end();return;}file=path.join(file,'index.html');}
  let content=await readFile(file);const ext=path.extname(file);
  if(ext==='.html')content=Buffer.from(content.toString().replaceAll('local-only.js?v=2','local-only.js?v=4'));
  res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=300'});res.end(req.method==='HEAD'?undefined:content);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500,{'Cache-Control':'no-store'});res.end(error.code==='ENOENT'?'Not found':'Unavailable');}
}).listen(Number(process.env.PORT)||8080,'0.0.0.0');
