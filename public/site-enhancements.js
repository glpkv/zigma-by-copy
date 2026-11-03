/* Prevent the edge-injected photo conveyor from restarting when Safari only
   changes viewport height as its address bar expands or collapses. */
(() => {
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    if (type === 'resize' && typeof listener === 'function') {
      const source = Function.prototype.toString.call(listener);
      if (source.includes('.zigma-photo-row') && source.includes('conveyors()')) {
        let previousWidth = document.documentElement.clientWidth;
        const widthOnlyListener = function(event) {
          const width = document.documentElement.clientWidth;
          if (Math.abs(width - previousWidth) < 2) return;
          previousWidth = width;
          return listener.call(this, event);
        };
        return originalAddEventListener.call(this, type, widthOnlyListener, options);
      }
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
})();

/* UI repairs do not send appointment data or load third-party form services. */
(() => {
  const ready = () => {
    const menuButton=document.querySelector('.site-mobile-header__toggle');
    const mobileMenu=document.getElementById('site-mobile-menu');
    const closeMenu=()=>{if(mobileMenu)mobileMenu.hidden=true;if(menuButton){menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Открыть меню');}};
    menuButton?.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';mobileMenu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');});
    mobileMenu?.addEventListener('click',event=>{
      const link=event.target.closest('a');if(!link)return;closeMenu();
      const url=new URL(link.href,location.href),target=url.hash&&document.getElementById(url.hash.slice(1));
      if(url.origin===location.origin&&url.pathname===location.pathname&&target){event.preventDefault();event.stopPropagation();target.scrollIntoView({behavior:'instant',block:'start'});history.pushState(null,'',url.href);}
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
    let lastTrigger;
    const close = dialog => { dialog.close(); lastTrigger?.focus(); };
    document.addEventListener('click', event => {
      const trigger = event.target.closest('a[href="#appointment"],a[href="#read-review"]');
      if (trigger) {
        event.preventDefault();event.stopImmediatePropagation();lastTrigger=trigger;
        let dialog;
        if (trigger.getAttribute('href') === '#appointment') dialog=document.getElementById('appointment-dialog');
        else {
          dialog=document.getElementById('review-dialog');
          if(!dialog){dialog=document.createElement('dialog');dialog.id='review-dialog';dialog.className='site-dialog';dialog.setAttribute('aria-labelledby','review-title');dialog.innerHTML='<button type="button" class="site-dialog__close" data-close-dialog aria-label="Закрыть отзыв">×</button><h2 id="review-title">Отзыв пациента</h2><p></p>';document.body.appendChild(dialog);}
          dialog.querySelector('p').textContent=trigger.dataset.reviewText;
        }
        if(dialog&&!dialog.open)dialog.showModal();
      }
      const dismiss=event.target.closest('[data-close-dialog]');
      if(dismiss){event.preventDefault();close(dismiss.closest('dialog'));}
      if(event.target instanceof HTMLDialogElement){const box=event.target.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close(event.target);}
    },true);
    // The organization map is a native, lazily loaded Yandex iframe.

  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
