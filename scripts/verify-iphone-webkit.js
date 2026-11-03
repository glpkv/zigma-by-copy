async(page)=>{
  await page.route('**/*',route=>route.continue());
  const origin=new URL(page.url()).origin,results=[];
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  await page.setViewportSize({width:393,height:852});
  await page.goto(origin+'/therapy/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(700);
  const viewport=page.locator('.site-carousel-viewport'),next=page.getByRole('button',{name:'Следующие карточки'}),prev=page.getByRole('button',{name:'Предыдущие карточки'});
  const aligned=()=>viewport.evaluate(n=>{
    const nodes=[...n.querySelectorAll('.site-carousel-snap')].sort((a,b)=>Number(a.dataset.fieldLeftValue)-Number(b.dataset.fieldLeftValue));
    const v=n.getBoundingClientRect(),r=nodes[Number(n.dataset.carouselIndex)].getBoundingClientRect();
    return {index:Number(n.dataset.carouselIndex),left:n.scrollLeft,error:Math.abs((r.left-v.left)/(v.width/n.clientWidth)-parseFloat(n.style.scrollPaddingLeft)),visible:r.left>=0&&r.right<=innerWidth};
  });
  for(let index=0;index<3;index++){const state=await aligned();assert(state.index===index&&state.error<2&&state.visible,'WebKit card alignment failed: '+JSON.stringify(state));results.push(state);if(index<2){await next.click();await page.waitForTimeout(750);}}
  assert(await next.isDisabled(),'WebKit phantom fourth card');
  await prev.click();await page.waitForTimeout(750);await viewport.evaluate(n=>{n.scrollLeft=170;});await page.waitForTimeout(750);assert((await aligned()).error<2,'WebKit fractional scroll did not snap');
  await page.goto(origin+'/therapy/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(500);
  await next.click();await next.click();await page.waitForTimeout(900);assert((await aligned()).index===2,'rapid arrows lost the final card');
  await page.setViewportSize({width:1280,height:852});await page.waitForTimeout(1000);assert((await aligned()).index===2,'wide resize lost selected card');
  await page.setViewportSize({width:393,height:852});await page.waitForTimeout(1000);assert((await aligned()).index===2,'phone resize lost selected card');
  const icons=await page.locator('.site-mobile-header__messengers img').evaluateAll(nodes=>nodes.map(n=>({complete:n.complete,width:n.naturalWidth,right:n.getBoundingClientRect().right})));
  assert(icons.length===3&&icons.every(n=>n.complete&&n.width>0&&n.right<=393),'iPhone messenger icons failed');
  for(const path of ['/therapy/','/otbelivanie/','/implantation/']){
    await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.locator('.zigma-photo-row').first().scrollIntoViewIfNeeded();await page.waitForTimeout(700);
    const sample=()=>page.locator('.zigma-photo-track').evaluateAll(ns=>ns.map(n=>n.firstElementChild.getBoundingClientRect().left));
    const a=await sample();await page.waitForTimeout(800);const b=await sample();assert(a.length===2&&b.length===2&&b.every((v,i)=>Math.abs(v-a[i])>3),'WebKit photos stopped: '+path);
  }
  return {engine:await page.evaluate(()=>navigator.userAgent),therapy:results,messengerIcons:icons.length,photoPages:3};
}
