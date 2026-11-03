import {saveAppointment, validateAppointment} from './github-store.mjs';
const json = (value, status = 200) => Response.json(value, {status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function handleAppointments(request, env, store = saveAppointment) {
  const configured = Boolean(env.APPOINTMENTS_GITHUB_TOKEN);
  if (request.method === 'GET') return json({enabled:configured});
  if (request.method !== 'POST') return json({error:'METHOD_NOT_ALLOWED'},405);
  if (!configured) return json({error:'NOT_CONFIGURED'},503);
  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({error:'FORBIDDEN'},403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'INVALID_CONTENT_TYPE'},415);
  if (Number(request.headers.get('Content-Length')) > 4096) return json({error:'TOO_LARGE'},413);
  let data;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({error:'INVALID_FORM'},400);
    const chunks=[]; let total=0;
    for (;;) {
      const {done,value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 4096) {await reader.cancel(); return json({error:'TOO_LARGE'},413);}
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    data=JSON.parse(new TextDecoder().decode(bytes));
    if (data.website) return json({error:'INVALID_FORM'},400);
    validateAppointment(data);
  } catch {return json({error:'INVALID_FORM'},400);}
  try {const result=await store(data,env.APPOINTMENTS_GITHUB_TOKEN);return json({ok:true,id:result.id},201);}
  catch {return json({error:'SAVE_FAILED'},503);}
}
