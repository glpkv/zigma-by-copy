#!/usr/bin/env python3
"""Fetch public Zigma pages and vendor their presentation assets."""
import concurrent.futures as cf
import hashlib, json, re, time, gzip, html as html_lib
from pathlib import Path
from urllib.parse import urljoin,urlsplit,urldefrag
import subprocess
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'
CACHE=ROOT/'.cache'
CACHE.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)
BASE='https://zigma.by'
HEAD={'User-Agent':'Mozilla/5.0'}
def fetch(url):
    p=CACHE/hashlib.sha256(url.encode()).hexdigest()
    if p.exists():
        data=p.read_bytes()
        return gzip.decompress(data) if data[:2]==b'\x1f\x8b' else data
    for i in range(3):
        try:
            data=subprocess.check_output(['curl','--compressed','-fLsS','--max-time','60',url],stderr=subprocess.PIPE)
            data=gzip.decompress(data) if data[:2]==b'\x1f\x8b' else data
            p.write_bytes(data); return data
        except Exception:
            if i==2: raise
            time.sleep(1)
def internal(url): return urlsplit(url).netloc in ('zigma.by','www.zigma.by')
def pagefile(url):
    path=urlsplit(url).path
    if path in ('','/'): return 'index.html'
    if path.endswith('.html'): return path.lstrip('/')
    return path.strip('/')+'/index.html'
sitemap=fetch(BASE+'/sitemap.xml').decode()
queue=re.findall(r'<loc>(.*?)</loc>',sitemap)
# Feed articles live in separate sitemaps, outside the main page sitemap.
feed_index=fetch(BASE+'/sitemap-feeds.xml').decode()
for feedmap in re.findall(r'<loc>(.*?)</loc>',feed_index):
    queue.extend(re.findall(r'<loc>(.*?)</loc>',fetch(feedmap).decode()))
pages={}
page_failures={}
def fetchpage(url):
    try: return fetch(url)
    except Exception as e: page_failures[url]=str(e); return None
while queue:
    urls=[u for u in queue if u not in pages]; queue=[]
    if not urls: break
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        for url,data in zip(urls,ex.map(fetchpage,urls)):
            if data is None: continue
            pages[url]=data.decode('utf-8')
            soup=BeautifulSoup(pages[url],'html.parser')
            for a in soup.select('a[href]'):
                u=urldefrag(urljoin(url,a['href']))[0]
                if internal(u) and u not in pages and u not in page_failures and u not in urls and not re.search(r'\.(pdf|jpg|png|webp|zip)$',u): queue.append(u)
    queue=[u for u in dict.fromkeys(queue) if u not in (BASE+'/team',BASE+'/blog')]
    print('Pages:',len(pages),'queued:',len(queue),flush=True)
(ROOT/'scripts'/'page-inventory.json').write_text(json.dumps({u:pagefile(u) for u in pages},ensure_ascii=False,indent=2))
# Snapshot the read-only feed API so lists and article popups work independently.
feed_ids=set()
for html in pages.values(): feed_ids.update(re.findall(r"feeduid:\s*'([^']+)'",html))
feed_snapshots={}; post_snapshots={}
for uid in sorted(feed_ids):
    feed=json.loads(fetch('https://feeds.tildaapi.biz/api/getfeed/?feeduid='+uid+'&size=100&getparts=true'))
    feed_snapshots[uid]=feed
    for post in feed.get('posts',[]):
        post_snapshots[post['uid']]=json.loads(fetch('https://feeds.tildaapi.biz/api/getpost/?postuid='+post['uid']))
assets={}; failures={}
def asset_url(u):
    return (urlsplit(u).netloc.endswith(('tildacdn.com','tildacdn.biz','tildacdn.net')) or urlsplit(u).netloc in ('fonts.googleapis.com','fonts.gstatic.com','unpkg.com'))
def register(u):
    u=urldefrag(u)[0]
    if u not in assets:
        ext=Path(urlsplit(u).path).suffix
        if not ext or len(ext)>8: ext='.css' if 'fonts.googleapis' in u else '.bin'
        name=Path(urlsplit(u).path).name
        name=re.sub(r'[^A-Za-z0-9._-]','_',name)
        if not name or '.' not in name: name='resource'+ext
        assets[u]='/assets/'+hashlib.sha256(u.encode()).hexdigest()[:20]+'-'+name
    return assets[u]
# URLs in all attributes, CSS, and inline configuration.
urlpat=re.compile(r'https?://[^\s<>"\'()\\]+|//(?:static|optim|neo|ws|thb)\.tildacdn\.(?:com|biz|net)/[^\s<>"\'()\\]+')
for html in list(pages.values())+[json.dumps(feed_snapshots,ensure_ascii=False),json.dumps(post_snapshots,ensure_ascii=False)]:
    for u in urlpat.findall(html_lib.unescape(html)):
        u='https:'+u if u.startswith('//') else u
        if asset_url(u) and urlsplit(u).path not in ('','/'): register(u.replace('&amp;','&'))
processed=set()
while set(assets)-processed:
    batch=list(set(assets)-processed)
    print('Downloading assets:',len(batch),'total:',len(assets),flush=True)
    def download(u):
        try: return u,fetch(u),None
        except Exception as e: return u,b'',str(e)
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        for u,data,error in ex.map(download,batch):
            processed.add(u)
            if error: failures[u]=error; continue
            target=OUT/assets[u].lstrip('/'); target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(data)
            if target.suffix=='.css':
                txt=data.decode('utf-8')
                for v in re.findall(r'url\([\'\"]?([^\'\")]+)',txt):
                    if not v.startswith('data:'): register(urljoin(u,v))
# The feed's placeholder URL builder assumes every image is on Tilda's CDN.
for u,local in assets.items():
    target=OUT/local.lstrip('/')
    if 'tilda-feed-' in u and target.suffix=='.js' and target.exists():
        txt=target.read_text()
        txt=txt.replace('function t_feed_getLazySrc(e,t){', """function t_feed_getLazySrc(e,t){if(t.charAt(0)==="/")return 'src="'+t+'" data-original="'+t+'"';""")
        txt=txt.replace('function t_feed_getCountOfViews(e){','function t_feed_getCountOfViews(e){return;')
        target.write_text(txt)
# Rewrite CSS resources to their local vendored equivalents.
for u,local in list(assets.items()):
    target=OUT/local.lstrip('/')
    if target.exists() and target.suffix=='.css':
        txt=target.read_text()
        txt=re.sub(r'url\(([\'\"]?)([^\'\")]+)([\'\"]?)\)',lambda m:'url('+m[1]+assets.get(urljoin(u,m[2]),m[2])+m[3]+')',txt)
        target.write_text(txt)
for url,html in pages.items():
    soup=BeautifulSoup(html,'html.parser')
    # Remove analytics, tracking, CDN failover, and automatic external form submission.
    for script in soup.find_all('script'):
        src=script.get('src','')
        if src and script.has_attr('async'):
            del script['async']
            script['defer']=''
        if any(x in src for x in ('tilda-fallback','tilda-events')) or (not src and any(x in script.text for x in ('mainTracker','tildastat','google-analytics','mc.yandex','sessionStorage','dataLayer'))): script.decompose()
    # Use the organization's public map widget instead of the broken JS API embed.
    original_map=soup.select_one('#rec773898881')
    if original_map:
        for anchor in soup.select('a[name="contacts"]'): anchor.decompose()
        replacement=BeautifulSoup((ROOT/'scripts/map-block.html').read_text(),'html.parser').div
        original_map.replace_with(replacement)
    for tag in soup.select('link[rel="dns-prefetch"],link[rel="canonical"]'): tag.decompose()
    for tag in soup.find_all(True):
        for attr in list(tag.attrs):
            if attr in ('data-tilda-formskey','data-tilda-project-id'): del tag[attr]
        if tag.name=='a' and tag.get('href'):
            href=tag['href']
            if href.startswith('#'): continue
            full=urljoin(url,href)
            if internal(full):
                p=urlsplit(full)
                if p.path=='/team': tag['href']='/#team'; continue
                tag['href']=(p.path or '/')+('?' + p.query if p.query else '')+('#'+p.fragment if p.fragment else '')
        if tag.name=='form': tag['action']='#'; tag['data-local-only']='true'
    html=str(soup)
    for u,local in sorted(assets.items(),key=lambda x:-len(x[0])):
        html=html.replace(u,local).replace(u.replace('&','&amp;'),local)
        if u.startswith('https:'): html=html.replace(u[6:],local)
    # Preserve the visual Tilda form renderer, but make submission impossible.
    guard=soup.new_tag('script',src='/local-only.js')
    policy='<meta http-equiv="Content-Security-Policy" content="connect-src &apos;self&apos;; form-action &apos;none&apos;; object-src &apos;none&apos;; base-uri &apos;self&apos;">'
    html=html.replace('<head>','<head>'+policy+str(guard),1)
    dest=OUT/pagefile(url);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(html)
# Materialize feed slices and popup content using the same data as the original.
def localize(data):
    if isinstance(data,dict): return {k:localize(v) for k,v in data.items()}
    if isinstance(data,list): return [localize(v) for v in data]
    if isinstance(data,str):
        for u,local in sorted(assets.items(),key=lambda x:-len(x[0])): data=data.replace(u,local)
        return data.replace(BASE+'/','/')
    return data
feed_dir=OUT/'feeds';feed_dir.mkdir(exist_ok=True)
for uid,feed in feed_snapshots.items():
    for size in [2,4,20,100]:
        for page in range(1,max(2,(len(feed['posts'])+size-1)//size+1)):
            data=dict(feed);data['posts']=feed['posts'][(page-1)*size:page*size]
            data['size']=size;data['slice']=page
            if page*size<len(feed['posts']): data['nextslice']=page+1
            else: data.pop('nextslice',None)
            (feed_dir/(uid+'-'+str(size)+'-'+str(page)+'.json')).write_text(json.dumps(localize(data),ensure_ascii=False))
for uid,data in post_snapshots.items():
    (feed_dir/('post-'+uid+'.json')).write_text(json.dumps(localize(data),ensure_ascii=False))
# Remove stale generated assets after every successful rebuild.
if not failures:
    retained={OUT/local.lstrip('/') for local in assets.values()}
    for asset in (OUT/'assets').iterdir():
        if asset.is_file() and asset not in retained: asset.unlink()
(OUT/'robots.txt').write_text('User-agent: *\nDisallow: /\n')
(ROOT/'scripts'/'asset-manifest.json').write_text(json.dumps(assets,indent=2))
(ROOT/'scripts'/'mirror-report.json').write_text(json.dumps({'pages':len(pages),'assets':len(assets),'failed':failures,'page_failures':page_failures},indent=2))
print('Complete:',len(pages),'pages,',len(assets),'assets,',len(failures),'failures',flush=True)
