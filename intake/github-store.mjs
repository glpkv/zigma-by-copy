// Server-only: never bundle or serve this file to visitors.
const repository = 'glpkv/zigma-appointments';
const path = 'appointments.csv';
const header = 'id,created_at,name,phone,page,consent\n';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function encode(value) {
  const bytes = encoder.encode(value);let binary='';
  for(let offset=0;offset<bytes.length;offset+=8192) binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  return btoa(binary);
}
function decode(value) {
  return decoder.decode(Uint8Array.from(atob(value.replace(/\s/g, '')), char => char.charCodeAt(0)));
}
function cell(value) {
  let text = String(value).replace(/[\r\n\0]/g, ' ');
  if (/^[=+\-@\t]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function validateAppointment(data) {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  let digits = typeof data.phone === 'string' ? data.phone.replace(/\D/g, '') : '';
  if (digits.length === 9) digits = '375' + digits;
  if (/^80\d{9}$/.test(digits)) digits = '375' + digits.slice(2);
  if (!name || name.length > 100 || /[\r\n\0]/.test(name)) throw new Error('INVALID_NAME');
  if (!/^375\d{9}$/.test(digits)) throw new Error('INVALID_PHONE');
  if (data.consent !== true) throw new Error('CONSENT_REQUIRED');
  const page = typeof data.page === 'string' && /^\/(?!\/)[\w/.-]*$/.test(data.page) ? data.page : '/';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id || '')) throw new Error('INVALID_ID');
  return {id:data.id, name, phone:'+' + digits, page, consent:true};
}
export async function saveAppointment(data, token, request = fetch) {
  if (!token) throw new Error('NOT_CONFIGURED');
  const item = validateAppointment(data);
  const headers = {'Authorization':'Bearer ' + token, 'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2026-03-10', 'User-Agent':'zigma-appointment-intake'};
  const options = {headers, signal:AbortSignal.timeout(15000)};
  // Refuse writes if the destination was accidentally made public.
  const metadata = await request(`https://api.github.com/repos/${repository}`, options);
  if (!metadata.ok || (await metadata.json()).private !== true) throw new Error('PRIVATE_REPOSITORY_REQUIRED');
  const url = `https://api.github.com/repos/${repository}/contents/${path}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await request(url, {...options, signal:AbortSignal.timeout(15000)});
    if (!current.ok) throw new Error('GITHUB_READ_FAILED');
    const file = await current.json();
    // Keep the temporary GitHub table below the Contents API's inline limit.
    if (file.size > 500000 || file.encoding !== 'base64') throw new Error('TABLE_LIMIT');
    const csv = decode(file.content);
    if (!csv.startsWith(header)) throw new Error('INVALID_TABLE');
    // A retry after a lost response must not add the same request twice.
    if (csv.split('\n').some(line => line.startsWith('"' + item.id + '",'))) return {id:item.id};
    const row = [item.id, new Date().toISOString(), item.name, item.phone, item.page, 'true'].map(cell).join(',') + '\n';
    const saved = await request(url, {method:'PUT', headers:{...headers,'Content-Type':'application/json'}, signal:AbortSignal.timeout(15000), body:JSON.stringify({message:'Add appointment request',sha:file.sha,content:encode(csv + row),branch:'main'})});
    if (saved.ok) return {id:item.id};
    if (saved.status !== 409 && saved.status !== 422) throw new Error('GITHUB_WRITE_FAILED');
  }
  throw new Error('TABLE_BUSY');
}
