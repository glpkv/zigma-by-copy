import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const requests = [], handlers = {};
class Form {}
class XHR { open(...args) { requests.push(args); } }
const notice = { textContent: '' };
const form = { querySelector: () => notice };
const window = { fetch: async (...args) => { requests.push(args); return { ok: true }; } };
const context = { window, XMLHttpRequest: XHR, HTMLFormElement: Form, URL, Request,
  location: { href: 'https://example.test/therapy', origin: 'https://example.test' },
  navigator: {}, document: { addEventListener: (type, fn) => { handlers[type] = fn; } } };
vm.runInNewContext(await readFile(new URL('../dist/local-only.js', import.meta.url), 'utf8'), context);
await window.fetch('https://feeds.tildaapi.biz/api/getfeed/?feeduid=147617004841&size=4&slice=2');
assert.equal(requests.pop()[0], 'https://example.test/feeds/147617004841-4-2.json');
const xhr = new XHR();
xhr.open('GET', 'https://feeds.tildaapi.biz/api/getpost/?postuid=8zrd1kfu21');
assert.equal(requests.pop()[1], 'https://example.test/feeds/post-8zrd1kfu21.json');
for (const [url, options] of [
  ['https://forms.tildaapi.biz/procces/', { method: 'POST', body: 'private-data' }],
  ['/appointment', { method: 'POST', body: 'private-data' }],
  ['https://feeds.tildaapi.biz/api/getfeed/?feeduid=147617004841', { method: 'POST' }],
  ['https://unrelated.example/collect', {}],
]) await assert.rejects(window.fetch(url, options));
assert.throws(() => xhr.open('POST', '/appointment'));
assert.equal(context.navigator.sendBeacon('/appointment', 'private-data'), false);
let prevented = false, stopped = false;
handlers.submit({ target: form, preventDefault() { prevented = true; }, stopImmediatePropagation() { stopped = true; } });
assert.ok(prevented && stopped);
assert.match(notice.textContent, /Данные не отправлены/);
Form.prototype.submit.call(form);
assert.equal(requests.length, 0);
console.log('PASS: local feed lists and articles work; form submissions and external data requests remain blocked.');
