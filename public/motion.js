(() => {
  'use strict';
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const ease='cubic-bezier(.16,1,.3,1)';
  const excluded='header,footer,#t-header,#t-footer,.site-mobile-header,.site-mobile-footer,form,dialog,.t-popup,.t450,.clinic-map';
  const textSelector='.tn-elem[data-elem-type="text"]>.tn-atom,.t-title,.t-descr,.t-text,.t-feed__title,.t-feed__descr';
  const photoSelector='.tn-elem[data-elem-type="image"]>.tn-atom,.js-feed-post-image';
  const active=new Set();let observer,progress,scheduled=false,lastBurst=0,stagger=0;
  function play(node,kind) {
    if(preference.matches||node.dataset.zigmaSeen)return;
    node.dataset.zigmaSeen='true';
    const now=performance.now();if(now-lastBurst>120)stagger=0;lastBurst=now;
    const mobile=matchMedia('(max-width:959px)').matches;
    const delay=(stagger++%4)*(mobile?30:65);
    const frames=kind==='photo'
      ? [{opacity:.72,clipPath:'inset(0 0 9% 0)'},{opacity:1,clipPath:'inset(0 0 0% 0)'}]
      : [{opacity:.25,translate:`0 ${mobile?10:17}px`},{opacity:1,translate:'0 0px'}];
    const animation=node.animate(frames,{duration:kind==='photo'?950:700,delay,easing:ease,fill:'none'});
    active.add(animation);animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
  }
  function collect(root) {
    if(preference.matches||!root.querySelectorAll)return;
    const candidates=[...(root.matches?.(textSelector+','+photoSelector)?[root]:[]),...root.querySelectorAll(textSelector+','+photoSelector)];
    for(const node of candidates){
      if(node.dataset.zigmaMotion||node.closest(excluded)||!node.getClientRects().length)continue;
      const photo=node.matches(photoSelector),box=node.getBoundingClientRect();
      if(photo){const image=node.matches('img')?node:node.querySelector('img');const source=image?.getAttribute('data-original')||image?.getAttribute('src')||'';if(!source||/\.svg(?:\?|$)/i.test(source)||box.width<130||box.height<70)continue;}
      else if(node.textContent.trim().length<6||box.width<30||box.height<12)continue;
      node.dataset.zigmaMotion=photo?'photo':'text';observer.observe(node);
    }
  }
  function updateProgress(){scheduled=false;if(!progress||preference.matches)return;const max=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${max>0?Math.min(1,Math.max(0,scrollY/max)):0})`;}
  function scheduleProgress(){if(!scheduled){scheduled=true;requestAnimationFrame(updateProgress);}}
  function start(){
    document.querySelectorAll('.tn-elem[data-elem-type="button"]>.tn-atom,.t-submit,.site-dialog__submit,.site-mobile-header__appointment,.site-mobile-footer__cta,.clinic-map__route').forEach(node=>node.classList.add('zigma-motion-button'));
    if(preference.matches||!('IntersectionObserver' in window)||!Element.prototype.animate)return;
    progress=document.createElement('div');progress.className='zigma-scroll-progress';progress.setAttribute('aria-hidden','true');document.body.appendChild(progress);
    observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);play(entry.target,entry.target.dataset.zigmaMotion);}},{threshold:.08,rootMargin:'0px 0px -28px 0px'});
    collect(document);window.addEventListener('load',()=>collect(document),{once:true});
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
