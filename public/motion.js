(() => {
  'use strict';
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const ease='cubic-bezier(.16,1,.3,1)';
  const excluded='header,footer,#t-header,#t-footer,.site-mobile-header,.site-mobile-footer,form,dialog,.t-popup,.t450,.clinic-map';
  const textSelector='.tn-elem[data-elem-type="text"]>.tn-atom,.t-title,.t-descr,.t-text,.t-feed__title,.t-feed__descr';
  const photoSelector='.tn-elem[data-elem-type="image"]>.tn-atom,.tn-atom.t-bgimg[data-original],.tn-atom__slds-img,.js-feed-post-image';
  const active=new Set();let observer,progress,scheduled=false,lastBurst=0,stagger=0;
  function play(node,kind) {
    if(preference.matches||node.dataset.zigmaSeen)return;
    node.dataset.zigmaSeen='true';
    const now=performance.now();if(now-lastBurst>120)stagger=0;lastBurst=now;
    const mobile=matchMedia('(max-width:959px)').matches;
    const delay=(stagger++%4)*(mobile?30:65);
    const frames=kind==='photo'
      ? [{opacity:0,translate:'0 36px',clipPath:'inset(0 0 24% 0)',scale:'.965'},{opacity:1,translate:'0 0px',clipPath:'inset(0 0 0% 0)',scale:'1'}]
      : [{opacity:0,translate:`0 ${mobile?28:44}px`},{opacity:1,translate:'0 0px'}];
    const animation=node.animate(frames,{duration:kind==='photo'?1350:1050,delay,easing:ease,fill:'none'});
    active.add(animation);animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
  }
  function collect(root) {
    if(preference.matches||!root.querySelectorAll)return;
    const candidates=[...(root.matches?.(textSelector+','+photoSelector)?[root]:[]),...root.querySelectorAll(textSelector+','+photoSelector)];
    for(const node of candidates){
      if(node.dataset.zigmaMotion||node.closest('.zigma-photo-row,.zigma-photo-source')||node.closest(excluded)||!node.getClientRects().length)continue;
      const photo=node.matches(photoSelector),box=node.getBoundingClientRect();
      if(photo){const image=node.matches('img')?node:node.querySelector('img');const source=node.getAttribute('data-original')||image?.getAttribute('data-original')||image?.getAttribute('src')||'';if(!source||/\.svg(?:\?|$)/i.test(source)||box.width<130||box.height<70)continue;}
      else if(node.textContent.trim().length<6||box.width<30||box.height<12)continue;
      node.dataset.zigmaMotion=photo?'photo':'text';observer.observe(node);
    }
  }
  function updateProgress(){scheduled=false;if(!progress||preference.matches)return;const max=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${max>0?Math.min(1,Math.max(0,scrollY/max)):0})`;}
  function scheduleProgress(){if(!scheduled){scheduled=true;requestAnimationFrame(updateProgress);}}
  function decorate(){
    document.querySelectorAll(photoSelector).forEach(node=>{
      const image=node.querySelector('img'),source=node.getAttribute('data-original')||image?.getAttribute('data-original')||image?.getAttribute('src')||'';
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
      let line=0;
      for(const [y,photos] of groups){
        photos.sort((a,b)=>a.x-b.x);
        const unique=photos.filter((p,i)=>!i||p.x!==photos[i-1].x);if(unique.length<3)continue;
        const width=unique[0].width,gap=unique[1].x-unique[0].x-width,period=unique.length*(width+gap);
        if(gap<0||gap>100)continue;
        const row=document.createElement('div'),track=document.createElement('div');row.className='zigma-photo-row';track.className='zigma-photo-track';
        row.setAttribute('aria-hidden','true');row.style.top=y+'px';row.style.height=unique[0].height+'px';
        row.style.setProperty('--photo-width',width+'px');row.style.setProperty('--photo-gap',gap+'px');row.style.setProperty('--photo-period',period+'px');
        row.style.setProperty('--photo-start',unique[0].x+'px');row.style.setProperty('--photo-duration',(period/(line++%2?22:15))+'s');
        const copies=Math.ceil((board.offsetWidth+Math.abs(unique[0].x))/period)+2;
        for(let copy=0;copy<copies;copy++)for(const photo of unique){
          const tile=document.createElement('div');tile.className='zigma-photo';tile.style.backgroundImage=`url("${photo.atom.dataset.original}")`;track.appendChild(tile);
        }
        row.appendChild(track);board.appendChild(row);photos.forEach(p=>p.elem.classList.add('zigma-photo-source'));
      }
    });
  }
  function start(){
    decorate();
    document.querySelectorAll('.tn-elem[data-elem-type="button"]>.tn-atom,.t-submit,.site-dialog__submit,.site-mobile-header__appointment,.site-mobile-footer__cta,.clinic-map__route').forEach(node=>node.classList.add('zigma-motion-button'));
    if(preference.matches||!('IntersectionObserver' in window)||!Element.prototype.animate)return;
    conveyors();
    document.querySelectorAll('.zigma-motion-button').forEach(node=>{node.addEventListener('pointermove',event=>{if(!matchMedia('(hover:hover) and (pointer:fine)').matches||preference.matches)return;const r=node.getBoundingClientRect();node.style.setProperty('--hover-x',((event.clientX-r.left-r.width/2)*.075)+'px');node.style.setProperty('--hover-y',((event.clientY-r.top-r.height/2)*.12-3)+'px');});node.addEventListener('pointerleave',()=>{node.style.removeProperty('--hover-x');node.style.removeProperty('--hover-y');});});
    let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{document.querySelectorAll('.zigma-photo-row').forEach(n=>n.remove());document.querySelectorAll('.zigma-photo-source').forEach(n=>n.classList.remove('zigma-photo-source'));if(!preference.matches)conveyors();},250);},{passive:true});
    progress=document.createElement('div');progress.className='zigma-scroll-progress';progress.setAttribute('aria-hidden','true');document.body.appendChild(progress);
    observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);play(entry.target,entry.target.dataset.zigmaMotion);}},{threshold:.12,rootMargin:'0px 0px -65px 0px'});
    collect(document);window.addEventListener('load',()=>{decorate();collect(document);conveyors();},{once:true});
    new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)collect(node);}).observe(document.body,{childList:true,subtree:true});
    window.addEventListener('scroll',scheduleProgress,{passive:true});window.addEventListener('resize',scheduleProgress,{passive:true});scheduleProgress();
    const hero=document.querySelector('.t396__carrier[data-original]');
    if(hero&&hero.getBoundingClientRect().top<innerHeight&&!hero.closest(excluded)){
      const animation=hero.animate([{scale:'1.025'},{scale:'1'}],{duration:1400,easing:ease,fill:'none'});active.add(animation);animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
    }
  }
  preference.addEventListener('change',()=>{if(preference.matches){observer?.disconnect();for(const animation of active)animation.cancel();active.clear();progress?.remove();}});
  const ready=()=>requestAnimationFrame(()=>requestAnimationFrame(start));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
