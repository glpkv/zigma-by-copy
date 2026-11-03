"""Replace draft content, add a flow-based mobile header, and prepare a real dark palette."""
from pathlib import Path
from bs4 import BeautifulSoup
import json,re,hashlib,html
ROOT=Path(__file__).resolve().parents[1]; PUBLIC=ROOT/'public'
ARTICLES=json.loads((ROOT/'scripts/patient-articles.json').read_text())
COVER='/assets/image-70224395e45d6ad3ff2f.webp'
def article_body(article):
    body=''.join('<h2>'+html.escape(title)+'</h2><p>'+html.escape(text)+'</p>' for title,text in article['sections'])
    return body+'<p class="article-source">Дополнительная информация: <a href="'+article['source']+'" target="_blank" rel="noopener noreferrer">источник материала</a>.</p>'
def update_feed(value):
    if isinstance(value,list):
        for item in value:update_feed(item)
    elif isinstance(value,dict):
        uid=str(value.get('uid',''))
        if uid in ARTICLES and 'title' in value:
            a=ARTICLES[uid]
            value.update(title=a['title'],descr=a['descr'],text=article_body(a),feedtitle='Статьи для пациентов',authorname='',authorurl='',authorimg='',image=COVER,imagealt='Кабинет клиники Zigma',thumb=COVER,thumbalt='Кабинет клиники Zigma',mediadata=COVER,date='2026-11-03 09:00',published='2026-11-03 09:00:00')
            if 'preview-media' in value:value['preview-media']={'type':'image','source':{'url':COVER,'alt':'Кабинет клиники Zigma'}}
        if 'feedtitle' in value:value['feedtitle']='Статьи для пациентов'
        for item in value.values():update_feed(item)
for file in (PUBLIC/'feeds').glob('*.json'):
    data=json.loads(file.read_text());update_feed(data);file.write_text(json.dumps(data,ensure_ascii=False))

replacements={
 'Придумать заголовок под каждую услугу, чтобы не дублировать с главной страницы':'Восстановление отсутствующих зубов: подход зависит от клинической ситуации',
 'Заголовок услуг, придумать заголовок под каждый раздел':'Подготовка к имплантации: возможные направления лечения',
 'СЕО текст':'О лечении',
 'Здесь пишем заголовок для блока с СЕО текстами, объём примерно такой':'План лечения начинается с осмотра и диагностики',
 'При правильной установке и должном уходе имплантаты можно носить всю жизнь':'Состояние имплантатов и конструкций оценивают на контрольных осмотрах',
}
palette_file=ROOT/'scripts/theme-palette.json'
palette=json.loads(palette_file.read_text()) if palette_file.exists() else {}
color_pattern=re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b',re.I)
declaration=re.compile(r'(?P<prop>(?<![\w-])(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|fill|stroke))\s*:\s*(?P<value>[^;}]+)',re.I)
def themed_color(token,kind):
    token=token.lower();alpha=1
    try:
        if token=='white':r=g=b=255
        elif token=='black':r=g=b=0
        elif token.startswith('#'):
            h=token[1:]
            if len(h) in (3,4):h=''.join(c*2 for c in h)
            if len(h) not in (6,8):return token
            r,g,b=[int(h[i:i+2],16) for i in (0,2,4)]
            if len(h)==8:alpha=int(h[6:8],16)/255
        else:
            parts=[x.strip() for x in token[token.index('(')+1:-1].split(',')]
            if len(parts) not in (3,4):return token
            r,g,b=map(float,parts[:3]);alpha=float(parts[3]) if len(parts)==4 else 1
    except (ValueError,TypeError):return token
    if max(r,g,b)-min(r,g,b)>24:return token
    gray=(r+g+b)/3
    if kind=='text':dark=240 if gray<110 else (190 if gray<215 else 245)
    elif kind=='background':dark=17 if gray>245 else (26 if gray>210 else (34 if gray>100 else 30))
    else:dark=72 if gray>160 else 104
    # Keep translucent image overlays translucent.
    mapped=f'rgba({dark},{dark},{dark},{alpha:g})' if alpha<1 else f'rgb({dark},{dark},{dark})'
    key='--z-'+kind+'-'+hashlib.sha1(token.encode()).hexdigest()[:8];palette[key]=mapped
    return 'var('+key+','+token+')'
def transform_css(text):
    def change(match):
        prop=match['prop'];value=match['value']
        if 'var(--z-' in value or 'url(' in value:return match[0]
        kind='text' if prop.lower() in ('color','fill','stroke') else ('background' if prop.lower().startswith('background') else 'border')
        return prop+':'+color_pattern.sub(lambda m:themed_color(m[0],kind),value)
    return declaration.sub(change,text)

for page in PUBLIC.rglob('*.html'):
    soup=BeautifulSoup(page.read_text(),'html.parser')
    for node in soup.select('.tn-atom,.t-title,.t-descr,.t-text'):
        text=' '.join(node.get_text(' ',strip=True).split())
        if text in replacements:node.clear();node.append(replacements[text])
        elif text.startswith('Какой бы вид лечения вам не понадобился'):
            node.clear();node.append('На консультации врач оценивает состояние зубов и дёсен, при необходимости назначает исследования и обсуждает варианты лечения. План составляют с учётом клинической ситуации и пожеланий пациента.')
        elif text.startswith('Любая услуга — будь то сложный случай'):
            node.clear();node.append('До начала лечения можно уточнить его этапы, возможные ограничения и ориентировочную стоимость. Необходимость подготовительных процедур и сроки определяют индивидуально.')
        elif text.startswith('Это надежный способ восстановить красивую улыбку'):
            node.clear();node.append('Имплантация — один из вариантов восстановления отсутствующих зубов. На консультации врач оценивает состояние полости рта, объём костной ткани и возможность установки имплантатов. Метод и последовательность лечения подбирают после диагностики.')
    for text in list(soup.find_all(string=True)):
        if text.parent.name in ('script','style'):continue
        if 'При правильной установке' in str(text) and 'всю жизнь' in str(text):text.replace_with('Состояние имплантатов и конструкций оценивают на контрольных осмотрах')
    if page.parent.name=='implantation':
        for node in soup.select('.tn-atom'):
            if 'Здесь пишем' in node.get_text():node.string='Планирование имплантации: от диагностики к этапам лечения'
    uid=next((u for u in ARTICLES if page.parent.name.startswith(u+'-')),None)
    if uid:
        a=ARTICLES[uid];soup.title.string=a['title']+' — Zigma'
        for node in soup.select('.js-feed-post-title'):node.clear();node.append(a['title'])
        for node in soup.select('.js-feed-post-text'):node.clear();node.append(BeautifulSoup(article_body(a),'html.parser'))
        for node in soup.select('.js-feed-close-text'):node.string='Статьи для пациентов'
        for node in soup.select('.js-feed-post-date'):node.string='03.11.2026'
        for node in soup.select('.js-feed-post-author,.t-feed__post-popup__author-wrapper'):node.decompose()
        for node in soup.select('.js-feed-post-image'):
            node['src']=COVER;node['alt']='Кабинет клиники Zigma'
            for attr in ('data-original','data-img-zoom-url'):
                if node.has_attr(attr):node[attr]=COVER
        for meta in soup.select('meta'):
            if meta.get('name')=='description' or meta.get('property') in ('og:description','twitter:description'):meta['content']=a['descr']
            if meta.get('property') in ('og:title','twitter:title'):meta['content']=a['title']
            if meta.get('property') in ('og:image','twitter:image'):meta['content']=COVER
            if meta.get('itemprop') in ('datePublished','dateModified'):meta['content']='2026-11-03T09:00:00+03:00'
    if soup.title and soup.title.string:soup.title.string=soup.title.string.replace('Copy of ','')
    for link in soup.select('link[rel="alternate"]'):
        if 'rss' in link.get('type',''):link['title']='Статьи для пациентов'
    for link in ('/theme.css','/responsive.css'):
        if not soup.select_one('link[href="'+link+'"]'):soup.head.append(soup.new_tag('link',rel='stylesheet',href=link))
    if not soup.select_one('meta[name="color-scheme"]'):soup.head.append(soup.new_tag('meta',attrs={'name':'color-scheme','content':'light dark'}))
    if not soup.select_one('[data-mobile-header]'):
        soup.body.insert(0,BeautifulSoup((ROOT/'scripts/mobile-header.html').read_text(),'html.parser'))
    if not soup.select_one('#contacts'):
        contact=soup.select_one('#site-mobile-menu a[href="#contacts"]')
        if contact:contact['href']='/#contacts'
    footer=soup.select_one('#t-footer')
    if footer:
        old_mobile=footer.select_one('.site-mobile-footer')
        fragment=BeautifulSoup((ROOT/'scripts/mobile-footer.html').read_text(),'html.parser')
        if old_mobile:old_mobile.replace_with(fragment)
        else:footer.append(fragment)
    # All pages, including articles, need the same working callback dialog.
    if not soup.select_one('#appointment-dialog'):soup.body.append(BeautifulSoup((ROOT/'scripts/appointment-dialog.html').read_text(),'html.parser'))
    for node in soup.select('[style]'):node['style']=transform_css(node['style'])
    for style in soup.select('style'):
        if style.string:style.string=transform_css(style.string)
    for image in soup.select('img,[data-original$=".svg"]'):
        path=image.get('src') or image.get('data-original') or ''
        if path.endswith('.svg') and path.startswith('/assets/'):
            source=(PUBLIC/path.lstrip('/')).read_text()
            colors=re.findall(r'#([0-9a-f]{6}|[0-9a-f]{3})\b',source.lower())
            def neutral(color):
                if len(color)==3:color=''.join(c*2 for c in color)
                channels=[int(color[i:i+2],16) for i in (0,2,4)]
                return max(channels)-min(channels)<=24
            if 'data:image' not in source and all(neutral(color) for color in colors):
                image['class']=list(dict.fromkeys(image.get('class',[])+['site-monochrome']))
    for answer in soup.select('.t585__text'):
        if answer.get_text(strip=True).startswith('Our managers'):
            answer.string='Обсудите этот вопрос со стоматологом на консультации. Для выбора времени визита оставьте заявку или свяжитесь с администратором клиники.'
        elif answer.get_text(strip=True).startswith('Our company'):
            answer.string='Если вас интересует лечение под общим наркозом, уточните доступность этой услуги у администратора и обсудите свой запрос с врачом на консультации.'
    if not soup.select_one('script[src^="/interactions.js"]'):
        soup.body.append(soup.new_tag('script',src='/interactions.js?v=1',defer=''))
    for stylesheet in soup.select('link[href^="/site-enhancements.css"]'):
        stylesheet['href']='/site-enhancements.css?v=3'
    for script in soup.select('script[src^="/site-enhancements.js"]'):
        script['src']='/site-enhancements.js?v=3'
    page.write_text(str(soup))
for file in (PUBLIC/'assets').glob('*.css'):file.write_text(transform_css(file.read_text()))
palette_file.write_text(json.dumps(palette,indent=2))
rules=';'.join(key+':'+value for key,value in sorted(palette.items()))+';--site-header:#111113;--site-ink:#f2f2f2;--site-line:#3c3c40;color-scheme:dark'
extra='''
body,.t-feed__post-popup,.t-popup__container-static{background:#111113!important;color:#f2f2f2}
.site-dialog{background:#1c1c20;color:#f2f2f2}.site-dialog input{background:#25252a;color:#f2f2f2;border-color:#555}.site-dialog__close{color:#eee}.site-dialog__submit{background:#eee;color:#151515}
.site-monochrome{filter:invert(1)}
.t-feed__post-popup__text,.t-feed__post-popup__title,.t-feed__post-popup__close-text,.t-feed__post-popup__date,.t-feed__title,.t-feed__descr,.t-feed__parts-switch-btn,.t-feed__post-popup__text a{color:#eee!important}
.t-feed__post-popup__text [style*="color"]{color:inherit!important}
.t-form input:not([type="checkbox"]):not([type="radio"]),.t-form textarea{color:inherit!important}
.t396__elem[data-elem-type="button"]>.tn-atom,.t-submit{background:#ededed!important;color:#171717!important;border-color:#777!important}
.t396__elem[data-elem-type="button"]>.tn-atom *,.t-submit *{color:#171717!important}
.clinic-map__info{background:#18181b!important;border-color:#38383c}.clinic-map__address span{color:#bebebe!important}.clinic-map__address strong{color:#eee}
#rec773898881 .clinic-map__route{background:#eee!important;color:#161616!important}.clinic-map__status{background:#202024;color:#eee}.clinic-map__status a,.clinic-map__status button{color:#eee}.clinic-map__status button{background:#29292e;border-color:#666}
[data-local-notice]{background:#29292e!important;color:#f2f2f2!important}
.t450__close-button span,.t-menuburger span{background:#eee!important}
'''
def prefix(css,scope):
    return re.sub(r'([^{}]+)\{',lambda m:','.join(scope+' '+s.strip() for s in m[1].split(','))+'{',css)
css='/* Separate dark palette; photographs and map tiles retain their colors. */\n'
css+='@media(prefers-color-scheme:dark){:root:not([data-site-theme="light"]){'+rules+'}'+prefix(extra,'html:not([data-site-theme="light"])')+'}\n'
css+='html[data-site-theme="dark"]{'+rules+'}'+prefix(extra,'html[data-site-theme="dark"]')
(PUBLIC/'theme.css').write_text(css)
print('Updated 17 pages, six patient articles and dark palette:',len(palette),'tokens')
