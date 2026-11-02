#!/usr/bin/env python3
"""Verify the mirrored routes, local resources and disabled form policy."""
import json,re
from pathlib import Path
from urllib.parse import urlsplit
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[1]; dist=root/'dist'
pages=json.loads((root/'scripts/page-inventory.json').read_text())
assets=json.loads((root/'scripts/asset-manifest.json').read_text())
errors=[]
for route,filename in pages.items():
    p=dist/filename
    soup=BeautifulSoup(p.read_text(),'html.parser')
    if not soup.title: errors.append(filename+': missing title')
    guard=soup.select_one('head > script[src="/local-only.js"]')
    if not guard: errors.append(filename+': missing form guard')
    policy=soup.find('meta',attrs={'http-equiv':'Content-Security-Policy'})
    if not policy or "form-action 'none'" not in policy['content']: errors.append(filename+': form policy missing')
    for node in soup.select('script[src],link[href],img[src]'):
        link=node.get('src',node.get('href',''))
        if link.startswith('/assets/') and not (dist/link.lstrip('/')).is_file(): errors.append(filename+': missing '+link)
    for a in soup.select('a[href]'):
        href=a['href']
        if href.startswith('https://zigma.by'): errors.append(filename+': original site navigation')
for url,filename in assets.items():
    if not (dist/filename.lstrip('/')).is_file(): errors.append('missing asset '+url)
report=json.loads((root/'scripts/mirror-report.json').read_text())
assert not report['failed'],report['failed']
assert not errors,'\n'.join(errors)
print(f'PASS: {len(pages)} pages, {len(assets)} local assets, form blocking on every page.')
