const ORIGIN='https://zigma-clinic-copy.afootdate1.chatgpt.site';
const TRUSTED_ORIGINS=new Set(['https://zigma-clinic-o7p3j.ondigitalocean.app','https://gleblapkovsky.com','https://www.gleblapkovsky.com']);
const PRIMARY='https://gleblapkovsky.com/zigma';
const MOTION_CSS=__MOTION_CSS__;
const MOTION_JS=__MOTION_JS__;
const KNOWN_ROOT=/(["'`(]\s*)\/(?=(?:assets|feeds|vendor|api|about|therapy|otbelivanie|implantation|privacy-policy|tpost|page\d+(?:\.html)?|motion\.(?:js|css)|service-catalog\.json|service-assistant\.(?:js|css)|local-only\.js|phone-input\.js|site-enhancements\.(?:js|css)|theme\.css|responsive\.css)(?:[\/"'`?#)\s]|$))/g;
function rewritePaths(text,base,html=false){
 if(base){
  if(html)text=text.replace(/\b(href|src|data-original|data-img-zoom-url|action|poster|content)=(['"])\/(?!\/)/gi,(_,name,quote)=>name+'='+quote+base+'/');
  text=text.replace(KNOWN_ROOT,(_,quote)=>quote+base+'/');
 }
 return text;
}
async function limitedText(message,max){
 if(!message.body)return '';
 const reader=message.body.getReader(),decoder=new TextDecoder();let text='',size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new Error('BODY_TOO_LARGE');}text+=decoder.decode(value,{stream:true});}
 return text+decoder.decode();
}
export default {async fetch(request){
 const incoming=new URL(request.url);
 const base=incoming.pathname==='/zigma'||incoming.pathname.startsWith('/zigma/')?'/zigma':'';
 if(incoming.pathname==='/zigma')return Response.redirect(incoming.origin+'/zigma/'+incoming.search,308);
 const path=incoming.pathname.slice(base.length)||'/';
 if(path.startsWith('//'))return new Response('Invalid path',{status:400});
 const origin=request.headers.get('Origin');
 const trusted=origin===incoming.origin||TRUSTED_ORIGINS.has(origin);
 const api=path==='/api/appointments';
 const cors=api&&trusted?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}:{};
 if(request.method==='OPTIONS')return new Response(null,{status:api&&trusted?204:403,headers:cors});
 if(!['GET','HEAD','POST'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(request.method==='POST'&&(path!=='/api/appointments'||!trusted))return new Response('Forbidden',{status:403});
 if(request.method!=='POST'&&(path==='/motion.css'||path==='/motion.js'))return new Response(request.method==='HEAD'?null:(path.endsWith('.css')?MOTION_CSS:MOTION_JS),{headers:{'Content-Type':path.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'public, max-age=300'}});
 const upstream=new URL(ORIGIN);upstream.pathname=path;upstream.search=incoming.search;
 const headers=new Headers({'Accept':request.headers.get('Accept')||'*/*','User-Agent':'Zigma-Clinic-Public-Hosting/2.0'});let body;
 if(request.method==='POST'){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return new Response('Unsupported content type',{status:415});
  try{body=await limitedText(request,4096);}catch{return new Response('Too large',{status:413});}
  headers.set('Content-Type','application/json');headers.set('Origin',upstream.origin);headers.set('Sec-Fetch-Site','same-origin');
 }
 let response;try{response=await fetch(upstream,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(25000)});}catch{return new Response('Сайт временно недоступен. Попробуйте обновить страницу.',{status:502,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 const output=new Headers(response.headers);output.delete('set-cookie');for(const [name,value] of Object.entries(cors))output.set(name,value);
 const location=output.get('location');if(location){const next=new URL(location,upstream);if(next.origin===upstream.origin)output.set('location',incoming.origin+base+next.pathname+next.search+next.hash);}
 output.set('X-Zigma-Hosting','independent-cloudflare');
 if(request.method==='HEAD'||request.method==='POST'||response.status>=300)return new Response(response.body,{status:response.status,headers:output});
 const type=output.get('Content-Type')||'';
 if(/text\/html|javascript|text\/css|application\/json/.test(type)){
  let text;try{text=await limitedText(response,2_000_000);}catch{return new Response('Resource exceeds the supported size',{status:502});}
  const html=/text\/html/.test(type);if(path!=='/service-assistant.js')text=rewritePaths(text,base,html);
  if(html){
   const canonical=PRIMARY+path;
   text=text.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi,tag=>tag.replace(/href=["'][^"']*["']/i,'href="'+canonical+'"'))
    .replace(/<meta\b(?=[^>]*\bproperty=["']og:url["'])[^>]*>/gi,tag=>tag.replace(/content=["'][^"']*["']/i,'content="'+canonical+'"'));
   const canonicalTag=/<link\b[^>]*rel=["']canonical["']/i.test(text)?'':`<link href="${canonical}" rel="canonical">`;
   const motionTags=text.includes('/motion.js?')?'':`<link rel="stylesheet" href="${base}/motion.css?v=7"><script defer src="${base}/motion.js?v=7"></script>`;
   text=text.replace('</head>',`${canonicalTag}${motionTags}</head>`);
  }
  output.delete('Content-Length');output.delete('Content-Encoding');output.delete('ETag');
  return new Response(text,{status:response.status,headers:output});
 }
 return new Response(response.body,{status:response.status,headers:output});
}};
