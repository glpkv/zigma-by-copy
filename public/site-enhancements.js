/* UI repairs do not send appointment data or load third-party form services. */
(() => {
  const ready = () => {
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
