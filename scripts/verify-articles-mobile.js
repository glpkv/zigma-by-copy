async(page)=>{
  await page.route('**/*',route=>route.continue());
  const origin=new URL(page.url()).origin,results=[],errors=[];
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  const inspect=()=>page.locator('.js-feed-container>.js-feed-post').evaluateAll(nodes=>{
    const luminance=css=>{const rgb=css.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
    return nodes.map(n=>{const r=n.getBoundingClientRect(),wrapper=n.querySelector('.t-feed__col-grid__post-wrapper,.t-feed__row-grid__post-wrapper'),background=luminance(getComputedStyle(wrapper).backgroundColor);
      const ratios=['.t-feed__post-title a','.t-feed__post-descr','.t-feed__post-date'].map(selector=>{const color=luminance(getComputedStyle(n.querySelector(selector)).color);return (Math.max(color,background)+.05)/(Math.min(color,background)+.05);});
      const image=n.querySelector('.t-feed__post-bgimg').getBoundingClientRect();
      return {left:r.left,right:r.right,width:r.width,imageWidth:image.width,ratios};
    });
  });
  for(const colorScheme of ['light','dark'])for(const width of [320,393,768,1280]){
    await page.emulateMedia({colorScheme});await page.setViewportSize({width,height:852});
    for(const path of ['/page51061211.html','/page51061185.html']){
      await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.locator('.js-feed-container>.js-feed-post').last().waitFor({state:'visible'});await page.waitForTimeout(300);
      const cards=await inspect();assert(cards.length>0,'articles did not load');
      cards.forEach(card=>assert(card.left>=0&&card.right<=width+1&&card.imageWidth>100&&card.ratios.every(r=>r>=4.5),`${width} ${colorScheme} ${path}: ${JSON.stringify(card)}`));
      if(width===393&&path==='/page51061211.html'){
        await page.locator('.js-feed-post-link').nth(1).click();const popup=page.locator('.t-feed__post-popup.t-popup_show');await popup.waitFor({state:'visible'});
        assert(new URL(page.url()).pathname.startsWith('/tpost/'),'article history URL is incorrect');
        const content=await popup.locator('.t-feed__post-popup__content').boundingBox();assert(content.x>=0&&content.x+content.width<=width,'article reader shifted off screen');
        await page.screenshot({path:`output/playwright/audit-reader-${colorScheme}-393.png`});
        await page.getByRole('button',{name:'Закрыть пост',exact:true}).click();await popup.waitFor({state:'hidden'});await page.waitForURL('**/page51061211.html');
        assert(new URL(page.url()).pathname==='/page51061211.html','closing article did not restore list URL');
        const more=page.locator('.js-feed-btn-show-more').filter({visible:true});
        if(await more.count()){const old=await page.locator('.js-feed-container>.js-feed-post').count();await more.first().click();await page.waitForTimeout(600);assert(await page.locator('.js-feed-container>.js-feed-post').count()>old,'show more failed');(await inspect()).forEach(card=>assert(card.right<=width+1&&card.ratios.every(r=>r>=4.5),'loaded card is broken'));}
        await page.locator('.js-feed-post').nth(1).scrollIntoViewIfNeeded();await page.screenshot({path:`output/playwright/audit-articles-${colorScheme}-393.png`});
      }
      results.push({path,width,colorScheme,cards:cards.length,layout:'PASS',contrast:'PASS'});
    }
  }
  const posts=['yrbejpbxi1-there-is-a-first-post-headline','fhb6hg0o01-title-of-the-second-sample-post','4ma75xvie1-the-third-title-for-the-post','7d9io8e7z1-there-is-a-first-post-headline','8zrd1kfu21-title-of-the-second-sample-post','dfme8o9rb1-testovaya-glavnaya-novost'];
  await page.setViewportSize({width:393,height:852});
  for(const colorScheme of ['light','dark']){await page.emulateMedia({colorScheme});for(const slug of posts){await page.goto(origin+'/tpost/'+slug+'/',{waitUntil:'domcontentloaded'});const content=page.locator('.t-feed__post-popup__content');await content.waitFor({state:'visible'});const r=await content.boundingBox();assert(r.x>=0&&r.x+r.width<=393,'standalone article is outside phone');}}
  assert(!errors.length,'JavaScript errors: '+errors.join('; '));
  return {results,standaloneArticles:12,browserErrors:errors};
}
