export default {async fetch(request) {
 const incoming=new URL(request.url);
 const upstream=new URL(incoming.pathname+incoming.search,'https://zigma-clinic-copy.afootdate1.chatgpt.site');
 if(!['GET','HEAD','POST'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(request.method==='POST'&&(incoming.pathname!=='/api/appointments'||request.headers.get('Origin')!==incoming.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'))return new Response('Forbidden',{status:403});
 const headers=new Headers();headers.set('Accept',request.headers.get('Accept')||'*/*');headers.set('User-Agent','Zigma-Clinic-Public-Hosting/1.0');
 if(request.method==='POST'){headers.set('Content-Type','application/json');headers.set('Origin',upstream.origin);headers.set('Sec-Fetch-Site','same-origin');if(Number(request.headers.get('Content-Length'))>4096)return new Response('Too large',{status:413});}
 const response=await fetch(upstream,{method:request.method,headers,body:request.method==='POST'?request.body:undefined,redirect:'manual'});
 const output=new Headers(response.headers);output.delete('set-cookie');
 const location=output.get('location');if(location){const next=new URL(location,upstream);if(next.origin===upstream.origin)output.set('location',incoming.origin+next.pathname+next.search+next.hash);}
 output.set('X-Zigma-Hosting','independent-cloudflare');
 return new Response(response.body,{status:response.status,headers:output});
}};
