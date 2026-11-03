#!/usr/bin/env python3
"""Prepare the mirrored site for publication: assets, navigation, motion and branding."""
from pathlib import Path
from urllib.parse import urlsplit
import hashlib,json,re
from bs4 import BeautifulSoup,Comment
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];DIST=ROOT/'public';ASSETS=DIST/'assets'
manifest_path=ROOT/'scripts/asset-manifest.json'
manifest=json.loads(manifest_path.read_text())
files=list(ASSETS.iterdir());before=sum(p.stat().st_size for p in files)
replacements={};optimized=[]
for p in files:
    if p.suffix.lower() not in ('.png','.jpg','.jpeg') or p.stat().st_size<25000:continue
    old_size=p.stat().st_size
    with Image.open(p) as source:
        image=source.convert('RGBA' if source.mode=='RGBA' or 'transparency' in source.info else 'RGB')
        image.thumbnail((1920,1920),Image.Resampling.LANCZOS)
        import io
        output=io.BytesIO();image.save(output,format='WEBP',quality=86,method=6)
    data=output.getvalue()
    if len(data)>old_size*.88 or old_size-len(data)<5000:continue
    new=ASSETS/('image-'+hashlib.sha256(data).hexdigest()[:20]+'.webp');new.write_bytes(data)
    replacements['/assets/'+p.name]='/assets/'+new.name
    optimized.append({'source':p.name,'before':old_size,'after':len(data)})
# Update serialized gallery data, inline CSS, page metadata, and feed JSON as well as ordinary attributes.
for p in DIST.rglob('*'):
    if p.is_file() and p.suffix in ('.html','.css','.js','.json'):
        value=p.read_text()
        for old,new in replacements.items():value=value.replace(old,new)
        if p.suffix=='.css':
            value=re.sub(r'@font-face\s*\{([^}]+)\}',lambda m:'@font-face{'+m[1]+('' if 'font-display' in m[1] else ';font-display:swap')+'}',value)
        p.write_text(value)
for old in replacements:(DIST/old.lstrip('/')).unlink()
for url,value in list(manifest.items()):manifest[url]=replacements.get(value,value)
manifest_path.write_text(json.dumps(manifest,indent=2))
ROUTES={'Терапия':'/therapy','Лечение кариеса':'/therapy','Лечение каналов':'/therapy','Профгигиена':'/therapy','Отбеливание':'/otbelivanie','Профессиональное отбеливание':'/otbelivanie','Домашнее отбеливание':'/otbelivanie','Имплантация':'/implantation/','Тотальная имплантация':'/implantation/','Allon4':'/implantation/','Allon6':'/implantation/','Зубы за один день':'/implantation/','Костная пластика':'/implantation/bone-grafting/'}
counts={'removed_branding':0,'repaired_booking_links':0,'repaired_navigation':0,'removed_motion_attributes':0}
for p in DIST.rglob('*.html'):
    soup=BeautifulSoup(p.read_text(),'html.parser')
    for comment in soup.find_all(string=lambda value:isinstance(value,Comment)):
        if 'Tilda copyright' in comment:comment.extract()
    for node in soup.select('#tildacopy,.t-tildalabel'):
        node.decompose();counts['removed_branding']+=1
    for node in soup.find_all(True):
        for attr in list(node.attrs):
            if attr.startswith('data-animate-'):
                del node[attr];counts['removed_motion_attributes']+=1
        classes=node.get('class',[])
        if 't-animate' in classes:node['class']=[c for c in classes if c!='t-animate']
    for script in soup.select('script[src]'):
        if any(name in script['src'] for name in ('highlight.min.js','tilda-map-1.0.min.js')):script.decompose()
    popup_hooks={node.get('data-tooltip-hook') for node in soup.select('[data-tooltip-hook]')}
    needs_appointment=False
    for a in soup.select('a[href]'):
        href=a['href'];text=a.get_text(' ',strip=True)
        if href in ('/blog','/blog/'):a['href']='/page51061211.html';counts['repaired_navigation']+=1
        elif href in ('/team','/team/'):a['href']='/#team';counts['repaired_navigation']+=1
        elif href=='/' and text in ROUTES:a['href']=ROUTES[text];counts['repaired_navigation']+=1
        elif text.startswith('Свяжитесь с администратором'):a['href']='tel:+375296400303';counts['repaired_navigation']+=1
        elif text.lower()=='получить консультацию' and href=='/':a['href']='#appointment';needs_appointment=True
        elif href.startswith(('#zeropopup-','#popup:')) and href not in popup_hooks:
            if 'review' in href:
                review=a.find_parent(class_='t-slds__item');body=review.select_one('.t605__text') if review else None
                if body:
                    a['href']='#read-review';a['data-review-text']=body.get_text(' ',strip=True)
            else:
                a['href']='#appointment';needs_appointment=True;counts['repaired_booking_links']+=1
    # Match formerly placeholder "Подробнее" buttons to a nearby real service title.
    def position(a):
        e=a.find_parent(class_='tn-elem')
        if not e:return None
        try:return float(e.get('data-field-left-value','nan')),float(e.get('data-field-top-value','nan'))
        except ValueError:return None
    for a in soup.select('a[href="/"]'):
        if a.get_text(' ',strip=True)!='Подробнее':continue
        pos=position(a);rec=a.find_parent(class_='t-rec')
        if not pos or not rec:continue
        candidates=[]
        for title in rec.select('a[href]'):
            if title.get_text(' ',strip=True) not in ROUTES:continue
            xy=position(title)
            if xy and abs(xy[0]-pos[0])<100 and 0<=pos[1]-xy[1]<250:candidates.append((pos[1]-xy[1]+abs(xy[0]-pos[0]),title['href']))
        if candidates:a['href']=min(candidates)[1];counts['repaired_navigation']+=1
    for rec in soup.select('.t-rec'):rec['data-animationappear']='off'
    # Prevent the entire page being hidden while legacy animation scripts initialize.
    css=soup.new_tag('link',rel='stylesheet',href='/site-enhancements.css');soup.head.append(css)
    js=soup.new_tag('script',src='/site-enhancements.js',defer='');soup.head.append(js)
    if needs_appointment:
        template=BeautifulSoup((ROOT/'scripts/appointment-dialog.html').read_text(),'html.parser')
        soup.body.append(template)
    # Preload only the real hero image; lower images remain lazy loaded.
    hero=soup.select_one('.t396__carrier[data-original]')
    if hero and p.name in ('index.html','page51061185.html') and (p.parent==DIST or p.name=='page51061185.html'):
        image=hero['data-original'];hero['style']=hero.get('style','')+";background-image:url('"+image+"')"
        soup.head.append(soup.new_tag('link',rel='preload',href=image,attrs={'as':'image','fetchpriority':'high'}))
    fonts=[]
    for sheet in soup.select('link[rel="stylesheet"][href^="/assets/"]'):
        content=(DIST/sheet['href'].lstrip('/')).read_text()
        for face in re.findall(r'@font-face\s*\{[^}]+\}',content):
            if re.search(r'font-weight:\s*400',face):fonts+=re.findall(r"url\(['\"]?([^'\")]+)",face)
    if fonts:soup.head.append(soup.new_tag('link',rel='preload',href=fonts[0],attrs={'as':'font','type':'font/woff','crossorigin':'anonymous'}))
    for img in soup.select('img[src]'):
        img['decoding']='async'
    p.write_text(str(soup))
after=sum(p.stat().st_size for p in ASSETS.iterdir())
runtime_bytes=sum(p.stat().st_size for p in (DIST/'vendor').rglob('*') if p.is_file())+sum((DIST/name).stat().st_size for name in ['site-enhancements.js','site-enhancements.css'])
report={'total_resources_after':after+runtime_bytes,'asset_bytes_before':before,'asset_bytes_after':after,'asset_reduction_percent':round((before-after)/before*100,1),'optimized_images':optimized,**counts}
(ROOT/'scripts/optimization-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='optimized_images'},ensure_ascii=False))
