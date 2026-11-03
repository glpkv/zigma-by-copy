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
      const move = direction => {
        const width = innerWidth <= 480 ? 290 : innerWidth <= 640 ? 320 : innerWidth <= 1200 ? 370 : 450;
        viewport.scrollBy({left:direction * width,behavior:reduced() ? 'instant' : 'smooth'});
      };
      const prev = button(-1,'Предыдущие карточки',() => move(-1)),next = button(1,'Следующие карточки',() => move(1));
      prev.setAttribute('aria-controls',contentId);next.setAttribute('aria-controls',contentId);
      toolbar.append(prev,next);record.querySelector('.t396__artboard')?.appendChild(toolbar);
      const update = () => {
        const max = viewport.scrollWidth - viewport.clientWidth;
        prev.disabled = viewport.scrollLeft <= 2;next.disabled = viewport.scrollLeft >= max - 2;
        toolbar.hidden = max <= 2;
      };
      viewport.addEventListener('scroll',update,{passive:true});
      viewport.addEventListener('keydown',event => {
        if(event.target !== viewport || !['ArrowLeft','ArrowRight'].includes(event.key))return;
        event.preventDefault();move(event.key === 'ArrowLeft' ? -1 : 1);
      });
      window.addEventListener('resize',update,{passive:true});window.addEventListener('load',update,{once:true});
      new ResizeObserver(update).observe(viewport);requestAnimationFrame(update);
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
