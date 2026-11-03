(() => {
  'use strict';
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const ease='cubic-bezier(.16,1,.3,1)';
  const excluded='.zigma-header-surface,.uc-menu-ap,#rec375959943,#rec774364427,header,footer,#t-header,#t-footer,.site-mobile-header,.site-mobile-footer,form,dialog,.t-popup,.t450,.clinic-map';
  const textSelector='.tn-elem[data-elem-type="text"]>.tn-atom,.t-title,.t-descr,.t-text,.t-feed__title,.t-feed__descr';
  const photoSelector='.tn-elem[data-elem-type="image"]>.tn-atom,.tn-atom.t-bgimg[data-original],.tn-atom__slds-img,.js-feed-post-image,.tn-atom[style*="background-image"]';
  const active=new Set();let observer,progress,scheduled=false;
  function play(node,kind) {
    if(preference.matches||node.dataset.zigmaSeen)return;
    node.dataset.zigmaSeen='true';
    const animation=node.animate([{opacity:.55},{opacity:1}],{duration:650,easing:ease,fill:'none'});
    active.add(animation);animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
  }
  function collect(root) {
    if(preference.matches||!root.querySelectorAll)return;
    const candidates=[...(root.matches?.(textSelector+','+photoSelector)?[root]:[]),...root.querySelectorAll(textSelector+','+photoSelector)];
    for(const node of candidates){
      if(node.dataset.zigmaMotion||node.closest('.zigma-photo-row,.zigma-photo-source')||node.closest(excluded)||!node.getClientRects().length)continue;
      const photo=node.matches(photoSelector),box=node.getBoundingClientRect();
      if(photo){const image=node.matches('img')?node:node.querySelector('img');const source=node.getAttribute('data-original')||image?.getAttribute('data-original')||image?.getAttribute('src')||node.style.backgroundImage||'';if(!source||/\.svg(?:\?|$)/i.test(source)||box.width<130||box.height<70)continue;}
      else if(node.textContent.trim().length<6||box.width<30||box.height<12)continue;
      node.dataset.zigmaMotion=photo?'photo':'text';observer.observe(node);
    }
  }
  function updateProgress(){scheduled=false;if(!progress||preference.matches)return;const max=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${max>0?Math.min(1,Math.max(0,scrollY/max)):0})`;}
  function scheduleProgress(){if(!scheduled){scheduled=true;requestAnimationFrame(updateProgress);}}
  function decorate(){
    document.querySelectorAll(photoSelector).forEach(node=>{
      const image=node.querySelector('img'),source=node.getAttribute('data-original')||image?.getAttribute('data-original')||image?.getAttribute('src')||node.style.backgroundImage||'';
      if(source&&!/\.svg(?:\?|$)/i.test(source)&&node.getBoundingClientRect().width>=120&&!node.closest(excluded))node.classList.add('zigma-photo');
    });
  }
  function conveyors(){
    document.querySelectorAll('#rec374766006 .t396__artboard').forEach(board=>{
      if(board.querySelector('.zigma-photo-row'))return;
      const groups=new Map(),br=board.getBoundingClientRect(),ratio=br.width/board.offsetWidth;
      if(!ratio)return;
      board.querySelectorAll('.tn-atom.t-bgimg[data-original]').forEach(atom=>{
        const elem=atom.parentElement,r=elem.getBoundingClientRect();if(!r.width||!r.height)return;
        const y=Math.round((r.top-br.top)/ratio),x=Math.round((r.left-br.left)/ratio);
        if(!groups.has(y))groups.set(y,[]);
        groups.get(y).push({atom,elem,x,width:r.width/ratio,height:r.height/ratio});
      });
      const sources=[...new Set([...groups.values()].flat().map(p=>p.atom.dataset.original))];
      let line=0;
      for(const [y,photos] of groups){
        photos.sort((a,b)=>a.x-b.x);
        const unique=photos.filter((p,i)=>!i||p.x!==photos[i-1].x);if(unique.length<3)continue;
        const width=unique[0].width,gap=unique[1].x-unique[0].x-width,period=sources.length*(width+gap);
        const sequence=sources.map((_,index)=>sources[(index+line*3)%sources.length]);
        if(gap<0||gap>100)continue;
        const row=document.createElement('div'),track=document.createElement('div');row.className='zigma-photo-row';track.className='zigma-photo-track';
        row.setAttribute('aria-hidden','true');row.style.top=y+'px';row.style.height=unique[0].height+'px';
        row.style.setProperty('--photo-width',width+'px');row.style.setProperty('--photo-gap',gap+'px');row.style.setProperty('--photo-period',period+'px');
        row.style.setProperty('--photo-start',unique[0].x+'px');row.style.setProperty('--photo-duration',(period/(line++%2?22:15))+'s');
        const copies=Math.ceil((board.offsetWidth+Math.abs(unique[0].x))/period)+2;
        for(let copy=0;copy<copies;copy++)for(const source of sequence){
          const tile=document.createElement('div');tile.className='zigma-photo';tile.dataset.photoSource=source;tile.style.backgroundImage=`url("${source}")`;track.appendChild(tile);
        }
        row.appendChild(track);board.appendChild(row);photos.forEach(p=>p.elem.classList.add('zigma-photo-source'));
      }
    });
  }
  function prepareHeaders(){
    document.querySelectorAll('.t396__artboard').forEach(board=>{
      if(board.closest('#t-footer'))return;
      if(board.querySelectorAll('a[href*="#about"],a[href*="#services"],a[href*="#team"],a[href*="#contacts"]').length>=3)board.classList.add('zigma-header-surface');
    });
  }
  function cards(){
    document.querySelectorAll('.t396__artboard').forEach(board=>{
      if(board.dataset.zigmaCards||board.closest(excluded))return;
      const photos=[...board.querySelectorAll('.tn-atom[style*="background-image"]')].filter(n=>n.classList.contains('zigma-photo'));
      if(!photos.length)return;
      const shapes=[...board.querySelectorAll('.tn-elem[data-elem-type="shape"]')];
      const cards=photos.map(photo=>{
        const p=photo.getBoundingClientRect();
        const bounds=shapes.filter(n=>{const r=n.getBoundingClientRect();return n!==photo.parentElement&&r.width>=p.width&&r.height>p.height+30&&r.left<=p.left+1&&r.right>=p.right-1&&r.top<=p.top+1&&r.bottom>=p.bottom;}).sort((a,b)=>a.getBoundingClientRect().width*a.getBoundingClientRect().height-b.getBoundingClientRect().width*b.getBoundingClientRect().height);
        photo.classList.add('zigma-card-photo');photo.style.setProperty('--zigma-card-image',photo.style.backgroundImage);
        return {photo,bound:bounds[0]||photo.parentElement};
      });
      const update=(x,y)=>cards.forEach(({photo,bound})=>{const r=bound.getBoundingClientRect();photo.classList.toggle('zigma-card-active',x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom);});
      board.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')update(event.clientX,event.clientY);});
      board.addEventListener('pointerleave',()=>cards.forEach(({photo})=>photo.classList.remove('zigma-card-active')));
      board.addEventListener('focusin',event=>{const r=event.target.getBoundingClientRect();update(r.left+r.width/2,r.top+r.height/2);});
      board.addEventListener('focusout',()=>cards.forEach(({photo})=>photo.classList.remove('zigma-card-active')));
      board.dataset.zigmaCards='true';
    });
  }
  function start(){
    prepareHeaders();decorate();cards();
    document.querySelectorAll('.tn-elem[data-elem-type="button"]>.tn-atom,.t-submit,.site-dialog__submit,.site-mobile-header__appointment,.site-mobile-footer__cta,.clinic-map__route').forEach(node=>node.classList.add('zigma-motion-button'));
    if(preference.matches||!('IntersectionObserver' in window)||!Element.prototype.animate)return;
    conveyors();

    let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{document.querySelectorAll('.zigma-photo-row').forEach(n=>n.remove());document.querySelectorAll('.zigma-photo-source').forEach(n=>n.classList.remove('zigma-photo-source'));if(!preference.matches)conveyors();},250);},{passive:true});
    progress=document.createElement('div');progress.className='zigma-scroll-progress';progress.setAttribute('aria-hidden','true');document.body.appendChild(progress);
    observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);play(entry.target,entry.target.dataset.zigmaMotion);}},{threshold:.12,rootMargin:'0px 0px -65px 0px'});
    collect(document);window.addEventListener('load',()=>{prepareHeaders();decorate();cards();collect(document);conveyors();},{once:true});
    new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)collect(node);}).observe(document.body,{childList:true,subtree:true});
    window.addEventListener('scroll',scheduleProgress,{passive:true});window.addEventListener('resize',scheduleProgress,{passive:true});scheduleProgress();

  }
  preference.addEventListener('change',()=>{if(preference.matches){observer?.disconnect();for(const animation of active)animation.cancel();active.clear();progress?.remove();}});
  const ready=()=>requestAnimationFrame(()=>requestAnimationFrame(start));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
