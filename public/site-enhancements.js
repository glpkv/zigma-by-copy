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
    // Load a small local map renderer only when the visitor reaches the map.
    let library;
    const loadMapLibrary=()=>library||(library=new Promise((resolve,reject)=>{
      if(window.L){resolve(window.L);return;}
      const css=document.createElement('link');css.rel='stylesheet';css.href='/vendor/leaflet/leaflet.css';document.head.appendChild(css);
      const script=document.createElement('script');script.src='/vendor/leaflet/leaflet.js';script.onload=()=>resolve(window.L);script.onerror=()=>{library=null;reject(new Error('Map library unavailable'));};document.head.appendChild(script);
    }));
    document.querySelectorAll('.clinic-map__canvas').forEach(canvas=>{
      const status=canvas.parentElement.querySelector('.clinic-map__status');let started=false,map,tiles,timer,loaded=false;
      const start=async(retry=false)=>{
        if(started&&!retry)return;started=true;clearTimeout(timer);status.hidden=false;status.querySelector('[data-map-message]').textContent='Загружаем карту клиники…';
        timer=setTimeout(()=>{if(!loaded)status.querySelector('[data-map-message]').textContent='Карта загружается медленно. Маршрут доступен по ссылке ниже.';},8000);
        try{
          const L=await loadMapLibrary();
          if(map){loaded=false;tiles.redraw();return;}
          const point=[Number(canvas.dataset.mapLat),Number(canvas.dataset.mapLng)];
          map=L.map(canvas,{scrollWheelZoom:false,zoomControl:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,inertia:false}).setView(point,16);
          map.attributionControl.setPrefix(false);
          L.control.zoom({position:'bottomright',zoomInTitle:'Приблизить',zoomOutTitle:'Отдалить'}).addTo(map);
          tiles=L.tileLayer(canvas.dataset.mapTiles,{maxZoom:19,keepBuffer:0,updateWhenIdle:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'});
          tiles.on('tileload',()=>{loaded=true;clearTimeout(timer);status.hidden=true;});tiles.addTo(map);
          L.marker(point,{title:'Zigma — стоматологическая клиника',alt:'Клиника Зигма',icon:L.divIcon({className:'clinic-pin',html:'<span class="clinic-pin__dot"></span>',iconSize:[32,38],iconAnchor:[16,36]})}).addTo(map).bindTooltip('Zigma',{permanent:true,direction:'right',offset:[14,-20]});
          if('ResizeObserver' in window)new ResizeObserver(()=>map.invalidateSize({animate:false})).observe(canvas);
        }catch(error){status.querySelector('[data-map-message]').textContent='Не удалось загрузить карту. Откройте её в Яндекс Картах.';started=false;clearTimeout(timer);}
      };
      status.querySelector('button').addEventListener('click',()=>start(true));
      if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){start();observer.disconnect();}},{rootMargin:'0px'});observer.observe(canvas);}else start();
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
