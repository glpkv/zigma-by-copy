async(page)=>{
  await page.route('**/*',route=>route.continue());
  const origin=new URL(page.url()).origin,errors=[],results=[];
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(10000);
  page.on('pageerror',error=>{if(error.stack?.includes(origin))errors.push(error.message);});
  const paths=['/','/about/','/therapy/','/otbelivanie/','/implantation/','/implantation/bone-grafting/','/privacy-policy/','/page51061185.html','/page51061203.html','/page51061211.html','/page51061229.html','/tpost/yrbejpbxi1-there-is-a-first-post-headline/','/tpost/fhb6hg0o01-title-of-the-second-sample-post/','/tpost/4ma75xvie1-the-third-title-for-the-post/','/tpost/7d9io8e7z1-there-is-a-first-post-headline/','/tpost/8zrd1kfu21-title-of-the-second-sample-post/','/tpost/dfme8o9rb1-testovaya-glavnaya-novost/'];
  for(const width of [393,1280])for(const colorScheme of ['light','dark']){
    await page.setViewportSize({width,height:852});await page.emulateMedia({colorScheme});
    for(const path of paths){
      const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.waitForTimeout(150);
      assert(response.status()===200,path+': route failed');
      const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,icons:[...document.querySelectorAll('.site-mobile-header__messengers a')].map(n=>({name:n.getAttribute('aria-label'),href:n.href,text:n.textContent.trim(),icon:!!n.querySelector('img')}))}));
      assert(geometry.scroll<=width+1,`${path}: page overflow`);assert(geometry.icons.length===3&&geometry.icons.every(n=>n.icon&&!n.text),`${path}: messenger letters remain`);
      results.push({path,width,colorScheme,status:'PASS'});
    }
  }
  let posts=0;
  await page.route('**/api/appointments',async route=>{if(route.request().method()==='POST')posts++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(route.request().method()==='GET'?{enabled:true}:{ok:true})});});
  await page.setViewportSize({width:393,height:852});await page.goto(origin+'/therapy/',{waitUntil:'domcontentloaded'});
  await page.locator('.site-mobile-header__appointment').click();const dialog=page.locator('#appointment-dialog');
  await dialog.getByRole('button',{name:'Записаться',exact:true}).click();assert((await dialog.locator('[data-local-notice]').innerText()).includes('подтвердите'),'empty form validation failed');
  await dialog.getByRole('textbox',{name:'Имя',exact:true}).fill('Проверка интерфейса');await dialog.getByRole('textbox',{name:'Телефон',exact:true}).fill('+375291234567');await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Записаться',exact:true}).click();await page.waitForTimeout(250);
  assert(posts===1&&(await dialog.locator('[data-local-notice]').innerText()).includes('Заявка сохранена'),'mock form success failed');await page.keyboard.press('Escape');await page.unroute('**/api/appointments');
  const map=await page.locator('.clinic-map__frame').getAttribute('src'),route=await page.locator('.clinic-map__route').getAttribute('href');assert(new URL(map).searchParams.get('oid')==='146604389627','wrong map organization');assert(new URL(route).searchParams.get('ruri')==='~ymapsbm1://org?oid=146604389627','wrong route organization');
  assert(!errors.length,'Site JavaScript errors: '+errors.join('; '));
  return {pages:results.length,errors,form:'validation and mock success PASS; no real appointments submitted',map:'organization and entrance route PASS'};
}
