#!/usr/bin/env python3
"""Verify the mirrored routes, local resources and disabled form policy."""
import json,re
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parents[1]; dist=root/'public'
pages=json.loads((root/'scripts/page-inventory.json').read_text())
assets=json.loads((root/'scripts/asset-manifest.json').read_text())
errors=[]
for route,filename in pages.items():
    p=dist/filename
    soup=BeautifulSoup(p.read_text(),'html.parser')
    if 'Tilda copyright' in p.read_text(): errors.append(filename+': runtime branding marker remains')
    if soup.select_one('#tildacopy,.t-tildalabel'): errors.append(filename+': Tilda branding remains')
    hooks={e.get('data-tooltip-hook') for e in soup.select('[data-tooltip-hook]')}
    for a in soup.select('a[href]'):
        if a['href'].startswith(('#zeropopup-','#popup:')) and a['href'] not in hooks: errors.append(filename+': missing popup '+a['href'])
        if a['href']=='#appointment' and not soup.select_one('#appointment-dialog'): errors.append(filename+': missing appointment dialog')
    if not soup.title: errors.append(filename+': missing title')
    guard=soup.select_one('head > script[src="/local-only.js"]')
    if not guard: errors.append(filename+': missing form guard')
    policy=soup.find('meta',attrs={'http-equiv':'Content-Security-Policy'})
    if not policy or "form-action 'none'" not in policy['content']: errors.append(filename+': form policy missing')
    map_block=soup.select_one('#rec773898881')
    if map_block:
        canvas=map_block.select_one('.clinic-map__canvas')
        route_link=map_block.select_one('a.clinic-map__route')
        if not canvas or (canvas.get('data-map-lat'),canvas.get('data-map-lng'))!=('53.886642','27.518189'):
            errors.append(filename+': clinic map marker missing')
        if not route_link:
            errors.append(filename+': route link missing')
        else:
            query=parse_qs(urlsplit(route_link['href']).query)
            if query.get('mode')!=['routes'] or query.get('ruri')!=['~ymapsbm1://org?oid=146604389627']:
                errors.append(filename+': route destination is not the clinic')
        if 't_appendYandexMap' in str(map_block): errors.append(filename+': broken API embed still present')
    for node in soup.select('script[src],link[href],img[src]'):

        link=node.get('src',node.get('href',''))
        if link.startswith('/assets/') and not (dist/link.lstrip('/')).is_file(): errors.append(filename+': missing '+link)
    for a in soup.select('a[href]'):
        href=a['href']
        if href.startswith('https://zigma.by'): errors.append(filename+': original site navigation')
# Check image URLs nested inside gallery JSON and inline styles too.
for p in dist.rglob('*'):
    if p.is_file() and p.suffix in ('.html','.css','.js','.json'):
        for resource in set(re.findall(r'/assets/[A-Za-z0-9._-]+',p.read_text())):
            if not (dist/resource.lstrip('/')).is_file(): errors.append(str(p.relative_to(dist))+': missing nested resource '+resource)
for url,filename in assets.items():
    if not (dist/filename.lstrip('/')).is_file(): errors.append('missing asset '+url)
report=json.loads((root/'scripts/mirror-report.json').read_text())
assert not report['failed'],report['failed']
assert not errors,'\n'.join(errors)
print(f'PASS: {len(pages)} pages, {len(assets)} local assets, form blocking on every page.')
