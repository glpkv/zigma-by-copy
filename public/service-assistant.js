(() => {
  'use strict';
  const base=location.pathname==='/zigma'||location.pathname.startsWith('/zigma/')?'/zigma':'';
  const byId=id=>document.getElementById(id);
  let catalog,dialog,trigger,lastOverflow='';
  const selected=new Map();
  const money=value=>new Intl.NumberFormat('ru-BY',{maximumFractionDigits:2}).format(value)+' BYN';
  function estimate(){
    const items=catalog.services.filter(service=>selected.has(service.id));
    const complete=items.length&&items.every(item=>Number.isFinite(item.min)&&Number.isFinite(item.max));
    return complete?{min:items.reduce((sum,item)=>sum+Math.round(item.min*100)*selected.get(item.id),0)/100,max:items.reduce((sum,item)=>sum+Math.round(item.max*100)*selected.get(item.id),0)/100}:null;
  }
  function update(){
    const count=selected.size,total=estimate();
    byId('helper-next').disabled=count===0||Boolean(byId('helper-options').querySelector(':invalid'));
    byId('helper-count').textContent=count?'Выбрано услуг: '+count:'Выберите хотя бы одну услугу';
    byId('helper-total').textContent=total?(total.min===total.max?money(total.min):money(total.min)+' – '+money(total.max)):'Стоимость уточнит администратор';
    byId('helper-price-note').textContent=total?'Предварительный расчёт по выбранным услугам. Итоговый план и стоимость согласуют после консультации.':'Выбранные услуги передадим администратору. Он уточнит объём, стоимость и удобное время визита.';
    const list=byId('helper-summary');list.replaceChildren();
    for(const service of catalog.services){
      if(!selected.has(service.id))continue;
      const li=document.createElement('li');li.textContent=service.label+(service.maxQuantity>1?' × '+selected.get(service.id):'');list.appendChild(li);
    }
    byId('helper-selection').value=JSON.stringify([...selected].map(([id,quantity])=>({id,quantity})));
  }
  function step(index){
    byId('helper-choice').hidden=index!==1;byId('helper-request').hidden=index!==2;
    byId('helper-step').textContent='Шаг '+index+' из 2';
    byId('helper-title').textContent=index===1?'Что вас интересует?':'Ваш запрос на визит';
    byId('helper-title').focus({preventScroll:true});dialog.scrollTop=0;
  }
  function close(){dialog.close();document.documentElement.style.overflow=lastOverflow;trigger?.focus({preventScroll:true});}
  async function open(button){
    trigger=button;
    if(!dialog){
      button.disabled=true;
      try{const response=await fetch(base+'/service-catalog.json');if(!response.ok)throw new Error('CATALOG');catalog=await response.json();build();}
      catch{button.textContent='Помощник недоступен. Позвоните нам';return;}
      finally{button.disabled=false;}
    }
    lastOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
    dialog.showModal();step(1);update();
  }
  function build(){
    dialog=document.createElement('dialog');dialog.className='zigma-assistant';dialog.id='service-helper';dialog.setAttribute('aria-labelledby','helper-title');
    dialog.innerHTML=`<button type="button" class="zigma-assistant__close" aria-label="Закрыть помощник">×</button>
      <p id="helper-step" class="zigma-assistant__eyebrow">Шаг 1 из 2</p><h2 id="helper-title" tabindex="-1">Что вас интересует?</h2>
      <section id="helper-choice"><p class="zigma-assistant__intro">Отметьте услуги, которые хотите обсудить с врачом.</p><fieldset id="helper-options"><legend class="zigma-visually-hidden">Выберите услуги</legend></fieldset>
      <div class="zigma-assistant__actions"><span id="helper-count" role="status"></span><button id="helper-next" type="button" disabled>Продолжить <span aria-hidden="true">→</span></button></div></section>
      <section id="helper-request" hidden><div class="zigma-assistant__result"><ul id="helper-summary"></ul><span class="zigma-assistant__eyebrow">Ориентировочная стоимость</span><strong id="helper-total"></strong><p id="helper-price-note"></p><button type="button" id="helper-back">Изменить выбор</button></div>
      <form data-service-helper><input type="hidden" id="helper-selection" name="selection" value="[]">
      <div class="zigma-assistant__fields"><label for="helper-name">Ваше имя<input id="helper-name" name="name" autocomplete="given-name" maxlength="100" required placeholder="Как к вам обращаться"></label>
      <label for="helper-phone">Телефон<input id="helper-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+375 (29) 123-45-67"></label></div>
      <label class="zigma-assistant__consent"><input type="checkbox" name="consent" required><span>Согласен на обработку контактных данных и выбранных услуг для обратного звонка. <a href="${base}/privacy-policy">Политика конфиденциальности</a></span></label>
      <button type="submit" class="zigma-assistant__submit">Отправить заявку</button><p class="zigma-assistant__after">Администратор уточнит стоимость и согласует время. Отправка заявки не бронирует приём.</p><div data-local-notice role="status" aria-live="polite"></div></form></section>`;
    document.body.appendChild(dialog);
    const options=byId('helper-options');
    for(const service of catalog.services){
      const row=document.createElement('div');row.className='zigma-assistant__option';
      const label=document.createElement('label'),check=document.createElement('input'),copy=document.createElement('span'),title=document.createElement('strong'),description=document.createElement('small');
      check.type='checkbox';check.value=service.id;title.textContent=service.label;description.textContent=service.description;copy.append(title,description);label.append(check,copy);row.appendChild(label);
      let quantity;
      if(service.maxQuantity>1){
        const quantityLabel=document.createElement('label');quantityLabel.className='zigma-assistant__quantity';quantityLabel.hidden=true;quantityLabel.textContent='Количество зубов';
        quantity=document.createElement('input');quantity.type='number';quantity.min='1';quantity.max=String(service.maxQuantity);quantity.value='1';quantity.setAttribute('aria-label',service.label+': количество зубов');quantityLabel.appendChild(quantity);row.appendChild(quantityLabel);
        quantity.addEventListener('input',()=>{const n=Number(quantity.value);if(Number.isInteger(n)&&n>=1&&n<=service.maxQuantity){selected.set(service.id,n);quantity.setCustomValidity('');}else quantity.setCustomValidity('Укажите от 1 до '+service.maxQuantity);byId('helper-next').disabled=!options.querySelectorAll(':invalid').length?selected.size===0:true;update();if(!quantity.checkValidity())byId('helper-next').disabled=true;});
      }
      check.addEventListener('change',()=>{if(check.checked){selected.set(service.id,1);if(quantity)quantity.value='1';}else selected.delete(service.id);row.classList.toggle('is-selected',check.checked);if(quantity){quantity.closest('label').hidden=!check.checked;quantity.disabled=!check.checked;quantity.setCustomValidity('');}update();});
      if(quantity)quantity.disabled=true;options.appendChild(row);
    }
    byId('helper-next').addEventListener('click',()=>{if(selected.size&&!options.querySelector(':invalid')){update();step(2);}});
    byId('helper-back').addEventListener('click',()=>step(1));
    dialog.querySelector('.zigma-assistant__close').addEventListener('click',close);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('close',()=>{document.documentElement.style.overflow=lastOverflow;});
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
    dialog.querySelector('form').addEventListener('appointment:saved',()=>{selected.clear();dialog.querySelectorAll('#helper-options input[type=checkbox]').forEach(n=>{n.checked=false;n.closest('.zigma-assistant__option').classList.remove('is-selected');});dialog.querySelectorAll('.zigma-assistant__quantity').forEach(n=>{n.hidden=true;n.querySelector('input').disabled=true;});});
  }
  function ready(){
    const nav=document.createElement('nav');nav.className='zigma-mobile-actions';nav.setAttribute('aria-label','Быстрая связь с клиникой');
    nav.innerHTML='<a href="tel:+375296400303"><span aria-hidden="true">↗</span>Позвонить</a><button type="button" data-contact-options aria-expanded="false"><span aria-hidden="true">✉</span>Написать</button><a href="#appointment" class="zigma-mobile-actions__primary">Оставить заявку</a>';
    document.body.appendChild(nav);
    const contact=document.createElement('div');contact.className='zigma-contact-options';contact.hidden=true;contact.innerHTML='<a href="https://t.me/zigmaclinic" target="_blank" rel="noopener noreferrer">Telegram ↗</a><a href="https://wa.me/375296400303" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a><a href="https://viber.click/375296400303" target="_blank" rel="noopener noreferrer">Viber ↗</a>';contact.id='zigma-contact-options';document.body.appendChild(contact);
    const appointmentDialog=document.getElementById('appointment-dialog');if(appointmentDialog)new MutationObserver(()=>{if(appointmentDialog.open){contact.hidden=true;nav.querySelector('button').setAttribute('aria-expanded','false');}}).observe(appointmentDialog,{attributes:true,attributeFilter:['open']});
    const contactButton=nav.querySelector('button');contactButton.setAttribute('aria-controls',contact.id);
    contactButton.addEventListener('click',()=>{contact.hidden=!contact.hidden;contactButton.setAttribute('aria-expanded',String(!contact.hidden));});
    document.addEventListener('click',event=>{if(!event.target.closest('.zigma-mobile-actions,.zigma-contact-options')){contact.hidden=true;contactButton.setAttribute('aria-expanded','false');}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){contact.hidden=true;contactButton.setAttribute('aria-expanded','false');}});
    const cta=document.createElement('button');cta.type='button';cta.className='zigma-helper-launch';cta.textContent='Подобрать услуги';cta.setAttribute('aria-haspopup','dialog');cta.addEventListener('click',()=>open(cta));document.body.appendChild(cta);
    const menu=document.getElementById('site-mobile-menu');if(menu){const link=document.createElement('button');link.type='button';link.className='zigma-helper-menu';link.textContent='Подобрать услуги';link.addEventListener('click',()=>{document.querySelector('.site-mobile-header__toggle')?.click();open(link);});menu.appendChild(link);}
    document.querySelectorAll('#appointment-dialog p').forEach(p=>{p.textContent='Оставьте имя и телефон. Администратор перезвонит, уточнит запрос и согласует время визита.';});
    if(window.visualViewport){const updateKeyboard=()=>{document.body.classList.toggle('zigma-keyboard-open',window.visualViewport.height<innerHeight*.72);};window.visualViewport.addEventListener('resize',updateKeyboard);updateKeyboard();}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
