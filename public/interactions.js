/* Local interaction repairs for the mirrored layouts. */
(() => {
  'use strict';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ready() {
    // Legacy Tilda keyboard handlers suppress the browser's native dialog cancel.
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
      if (!dialog) return;
      event.preventDefault();event.stopImmediatePropagation();
      if (dialog.dispatchEvent(new Event('cancel',{cancelable:true}))) dialog.close();
    },true);
    // Some service pages contain a second mobile header outside #t-header.
    document.querySelectorAll('.t396__artboard').forEach(board => {
      if (Number(board.dataset.artboardHeight) <= 120 && board.querySelector('a[href="#menu:open"]') && board.querySelector('a[href="/"]')) {
        board.closest('.r')?.classList.add('site-legacy-header');
      }
    });
    document.querySelectorAll('img[data-original]:not([src])').forEach(img => {
      if (/\.svg(?:\?|$)/i.test(img.dataset.original)) img.src = img.dataset.original;
    });
    const button = (direction, label, action) => {
      const node = document.createElement('button');
      node.type = 'button';node.className = 'site-carousel-button';node.setAttribute('aria-label', label);
      node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg>`;
      node.addEventListener('click', event => {event.preventDefault();event.stopPropagation();action();});
      return node;
    };
    document.querySelectorAll('a[href="#leftsld"],a[href="#rightsld"]').forEach(link => {
      const record = link.closest('.r'),gallery = record?.querySelector('[data-elem-type="gallery"]');
      if (!gallery) return;
      const direction = link.hash === '#leftsld' ? -1 : 1;
      const move = () => {
        const track = gallery.querySelector('.t-slds__items-wrapper');
        if (!track || typeof window.t_slideMove !== 'function') return;
        const total = Number(track.dataset.sliderTotalslides),current = Number(track.dataset.sliderPos) || 1;
        track.dataset.sliderPos = String((current - 1 + direction + total) % total + 1);
        track.dataset.sliderCycle = '';track.dataset.sliderAnimated = '';
        window.t_slideMoveWithoutAnimation(gallery, false);window.t_slds_updateSlider(gallery);
      };
      const control = button(direction,direction < 0 ? 'Предыдущее фото' : 'Следующее фото',move);
      // Replace the dead anchor so old hash and jQuery handlers cannot run.
      link.replaceWith(control);
      gallery.tabIndex = 0;gallery.setAttribute('role','region');gallery.setAttribute('aria-label','Фотографии клиники');
      gallery.addEventListener('keydown',event => {if(event.key === (direction < 0 ? 'ArrowLeft' : 'ArrowRight')){event.preventDefault();move();}});
    });
    const pairs = [
      ['rec374779787','rec374778067'],['rec774546011','rec774532808'],
      ['rec426890209','rec426890074'],['rec428789792','rec428789890'],['rec430112086','rec430112087']
    ];
    for (const [contentId,controlsId] of pairs) {
      const viewport = document.querySelector(`#${contentId} .t396__artboard`),record = document.getElementById(controlsId);
      if (!viewport || !record) continue;
      viewport.classList.add('site-carousel-viewport');viewport.tabIndex = 0;
      viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Список карточек — листайте стрелками или свайпом');
      record.querySelectorAll('.arrow-left,.arrow-right').forEach(node => {node.hidden = true;});
      const toolbar = document.createElement('div');toolbar.className = 'site-carousel-toolbar';
      // Use the real card outlines, deduplicating the legacy hover outline.
      const seen=new Set();
      const cards=[...viewport.querySelectorAll('.tn-elem[data-elem-type="shape"]')].filter(node=>{
        const width=Number(node.dataset.fieldWidthValue),height=Number(node.dataset.fieldHeightValue),key=node.dataset.fieldLeftValue;
        if(width<180||height<240||node.querySelector('[data-original]')||seen.has(key))return false;
        seen.add(key);return true;
      }).sort((a,b)=>Number(a.dataset.fieldLeftValue)-Number(b.dataset.fieldLeftValue));
      if(!cards.length)continue;
      cards.forEach(node=>node.classList.add('site-carousel-snap'));
      const tail=document.createElement('div');tail.className='site-carousel-tail';tail.setAttribute('aria-hidden','true');viewport.appendChild(tail);
      let targets=[],activeIndex=0,requestedIndex=null,timer,layoutTimer,signature='',layoutWidth=viewport.clientWidth,resizeIndex=null,resizeTimer;
      const nearest=()=>targets.reduce((best,value,index)=>Math.abs(value-viewport.scrollLeft)<Math.abs(targets[best]-viewport.scrollLeft)?index:best,0);
      const update=()=>{
        const index=requestedIndex??resizeIndex??nearest();
        prev.disabled=index===0;next.disabled=index===targets.length-1;
        toolbar.hidden=targets.length<2;
        viewport.dataset.carouselCount=String(cards.length);viewport.dataset.carouselIndex=String(index);
      };
      const move=direction=>{
        const index=Math.max(0,Math.min(targets.length-1,(requestedIndex??nearest())+direction));
        requestedIndex=index;activeIndex=index;if(resizeIndex!==null)resizeIndex=index;
        viewport.scrollTo({left:targets[index],behavior:reduced()?'instant':'smooth'});update();
      };
      const prev=button(-1,'Предыдущие карточки',()=>move(-1)),next=button(1,'Следующие карточки',()=>move(1));
      prev.setAttribute('aria-controls',contentId);next.setAttribute('aria-controls',contentId);
      toolbar.append(prev,next);record.querySelector('.t396__artboard')?.appendChild(toolbar);
      const measure=()=>{
        const bounds=viewport.getBoundingClientRect(),ratio=bounds.width/viewport.clientWidth;
        if(!ratio)return;
        const positions=cards.map(node=>{const r=node.getBoundingClientRect();return {left:(r.left-bounds.left)/ratio+viewport.scrollLeft,width:r.width/ratio};});
        const nextSignature=JSON.stringify([viewport.clientWidth,...positions.map(p=>[Math.round(p.left),Math.round(p.width)])]);
        if(nextSignature===signature)return;
        signature=nextSignature;
        const first=positions[0],last=positions.at(-1);
        targets=positions.map(p=>Math.round(p.left-first.left));
        viewport.style.scrollPaddingLeft=first.left+'px';
        tail.style.left=(last.left+last.width)+'px';tail.style.width=Math.max(0,viewport.clientWidth-first.left-last.width)+'px';
        // Ignore the original oversized spacer: it used to create a phantom fourth stop.
        viewport.querySelectorAll('.tn-elem[data-elem-type="shape"]').forEach(node=>{
          if(Number(node.dataset.fieldWidthValue)<100&&Number(node.dataset.fieldLeftValue)>=Number(cards.at(-1).dataset.fieldLeftValue)+Number(cards.at(-1).dataset.fieldWidthValue))node.hidden=true;
        });
        activeIndex=Math.min(resizeIndex??activeIndex,targets.length-1);requestedIndex=null;layoutWidth=viewport.clientWidth;
        viewport.scrollTo({left:targets[activeIndex],behavior:'instant'});update();
        // Tilda applies its responsive coordinates roughly 500 ms after resize.
        if(resizeIndex!==null){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{activeIndex=Math.min(resizeIndex,targets.length-1);resizeIndex=null;viewport.scrollTo({left:targets[activeIndex],behavior:'instant'});update();},800);}
      };
      const scheduleMeasure=()=>{if(viewport.clientWidth!==layoutWidth&&resizeIndex===null)resizeIndex=requestedIndex??activeIndex;clearTimeout(layoutTimer);layoutTimer=setTimeout(measure,120);};
      const settle=()=>{
        if(!targets.length)return;
        if(viewport.clientWidth!==layoutWidth){scheduleMeasure();return;}
        if(resizeIndex!==null)return;
        activeIndex=nearest();requestedIndex=null;
        if(Math.abs(viewport.scrollLeft-targets[activeIndex])>1)viewport.scrollTo({left:targets[activeIndex],behavior:'instant'});
        update();
      };
      viewport.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(settle,160);update();},{passive:true});
      viewport.addEventListener('scrollend',settle);
      viewport.addEventListener('pointerdown',()=>{requestedIndex=null;if(resizeIndex!==null){clearTimeout(resizeTimer);resizeIndex=null;}},{passive:true});
      viewport.addEventListener('keydown',event=>{
        if(event.target!==viewport||!['ArrowLeft','ArrowRight'].includes(event.key))return;
        event.preventDefault();move(event.key==='ArrowLeft'?-1:1);
      });
      window.addEventListener('resize',scheduleMeasure,{passive:true});window.addEventListener('load',scheduleMeasure,{once:true});
      const observer=new ResizeObserver(scheduleMeasure);observer.observe(viewport);cards.forEach(node=>observer.observe(node));
      measure();

    }
    // Header and icon are a single toggle, including a second click to collapse.
    document.querySelectorAll('.t585__accordion').forEach(item => {
      const trigger = item.querySelector('.t585__trigger-button'),panel = item.querySelector('.t585__content');
      if (!trigger || !panel) return;
      const sync = () => { const open = trigger.getAttribute('aria-expanded') === 'true';panel.hidden = !open;panel.setAttribute('aria-hidden',String(!open)); };
      item.querySelector('.t585__header')?.addEventListener('click',event => {
        if(event.target.closest('button,a'))return;event.preventDefault();trigger.click();
      });
      new MutationObserver(sync).observe(trigger,{attributes:true,attributeFilter:['aria-expanded']});sync();
    });
    document.querySelectorAll('a[href="#up"]').forEach(link => link.addEventListener('click',event => {
      event.preventDefault();event.stopImmediatePropagation();window.scrollTo({top:0,behavior:reduced() ? 'instant' : 'smooth'});
    },true));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
