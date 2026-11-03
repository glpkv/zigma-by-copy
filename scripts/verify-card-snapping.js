async(page)=>{
  await page.route('**/*',route=>route.continue());
  const origin=new URL(page.url()).origin,out=[];
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  page.setDefaultTimeout(8000);
  const check=async viewport=>viewport.evaluate(n=>{
    const cards=[...n.querySelectorAll('.site-carousel-snap')].sort((a,b)=>Number(a.dataset.fieldLeftValue)-Number(b.dataset.fieldLeftValue));
    const index=Number(n.dataset.carouselIndex),v=n.getBoundingClientRect(),r=cards[index].getBoundingClientRect(),padding=parseFloat(n.style.scrollPaddingLeft);
    return {index,count:cards.length,left:n.scrollLeft,max:n.scrollWidth-n.clientWidth,error:Math.abs((r.left-v.left)/(v.width/n.clientWidth)-padding),visible:r.left>=-1&&r.right<=innerWidth+1};
  });
  for(const width of [320,393,768,1280]){
    await page.setViewportSize({width,height:852});
    await page.goto(origin+'/therapy/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(700);
    const viewport=page.locator('.site-carousel-viewport'),next=page.getByRole('button',{name:'Следующие карточки'}),prev=page.getByRole('button',{name:'Предыдущие карточки'});
    const states=[];
    for(let i=0;i<3;i++){
      const state=await check(viewport);states.push(state);
      assert(state.index===i&&state.count===3&&state.error<2&&state.visible,`${width}: wrong therapy card alignment ${JSON.stringify(state)}`);
      if(i<2){await next.click();await page.waitForTimeout(650);}
    }
    assert(await next.isDisabled(),`${width}: phantom fourth position`);
    await prev.click();await page.waitForTimeout(650);assert((await check(viewport)).index===1,'previous skipped card');
    await prev.click();await page.waitForTimeout(650);
    // Arbitrary wheel/trackpad position must settle onto a real card.
    await viewport.evaluate(n=>{n.scrollLeft=173;});await page.waitForTimeout(700);
    assert((await check(viewport)).error<2,'arbitrary scroll did not snap');
    if(await prev.isEnabled()){await prev.click();await page.waitForTimeout(650);}
    if(width===393){
      await viewport.scrollIntoViewIfNeeded();const r=await viewport.boundingBox(),y=Math.max(170,Math.min(600,r.y+120));
      const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:315,y}]});
      for(let x=295;x>=75;x-=20){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await page.waitForTimeout(20);}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(900);await cdp.detach();
      const state=await check(viewport);assert(state.index>0&&state.error<2&&state.visible,'touch swipe did not land on a complete card');
      await prev.click();await page.waitForTimeout(650);assert((await check(viewport)).error<2,'arrow after swipe lost alignment');
    }
    out.push({width,therapy:states});
  }
  for(const path of ['/','/implantation/','/implantation/bone-grafting/']){
    await page.setViewportSize({width:393,height:852});await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.waitForTimeout(700);
    const viewports=page.locator('.site-carousel-viewport');
    for(let i=0;i<await viewports.count();i++){
      const viewport=viewports.nth(i),id=await viewport.evaluate(n=>n.closest('.r').id),next=page.locator(`button[aria-controls="${id}"][aria-label="Следующие карточки"]`);
      const count=Number(await viewport.getAttribute('data-carousel-count'));
      for(let j=1;j<count;j++){await next.click();await page.waitForTimeout(600);assert((await check(viewport)).error<2,`${path} ${id}: broken alignment`);}
      assert(await next.isDisabled(),`${id}: final boundary failed`);
    }
    out.push({path,carousels:await viewports.count(),boundaries:'PASS'});
  }
  return out;
}
