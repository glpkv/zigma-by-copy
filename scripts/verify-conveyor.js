async (page) => {
  const origin=new URL(page.url()).origin;
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const results=[];
  page.setDefaultTimeout(8000);
  for(const reducedMotion of ['no-preference','reduce']) {
    await page.emulateMedia({reducedMotion});
    for(const width of [390,1280]) {
      await page.setViewportSize({width,height:844});
      await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
      await page.locator('#rec374766006').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      const point=await page.locator('.zigma-photo-track>.zigma-photo').evaluateAll(nodes=>{
        const rect=nodes.map(n=>n.getBoundingClientRect()).find(r=>r.left<innerWidth-40&&r.right>40&&r.top>100&&r.bottom<innerHeight-70);
        return rect?{x:Math.max(40,Math.min(innerWidth-40,rect.left+rect.width/2)),y:rect.top+rect.height/2}:null;
      });
      assert(point,'No visible conveyor tile');await page.mouse.move(point.x,point.y);
      const sample=()=>page.locator('.zigma-photo-track').evaluateAll(nodes=>nodes.map(n=>({x:n.firstElementChild.getBoundingClientRect().left,state:getComputedStyle(n).animationPlayState})));
      const before=await sample();await page.waitForTimeout(800);const after=await sample();
      assert(before.length===2&&after.length===2,'Both photo rows must exist');
      after.forEach((row,i)=>assert(row.state==='running'&&Math.abs(row.x-before[i].x)>3,'Photo row stopped under pointer'));
      await page.evaluate(()=>{window.__conveyorRows=[...document.querySelectorAll('.zigma-photo-row')];});
      await page.setViewportSize({width,height:780});await page.waitForTimeout(500);
      assert(await page.evaluate(()=>window.__conveyorRows.every(n=>n.isConnected)),'Height-only resize restarted conveyors');
      results.push({width,reducedMotion,moved:after.map((row,i)=>Math.round(row.x-before[i].x)),hover:'running',heightResize:'preserved'});
    }
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);
  const dimensions=await page.evaluate(()=>{
    const source=document.querySelector('#rec374766006 .tn-atom.t-bgimg[data-original]').closest('.tn-elem');
    const tile=document.querySelector('.zigma-photo-track>.zigma-photo');
    return {source:source.getBoundingClientRect().width,tile:tile.getBoundingClientRect().width};
  });
  assert(Math.abs(dimensions.source-dimensions.tile)<1,'Conveyor dimensions stale after breakpoint resize');
  return {results,breakpointDimensions:dimensions};
}
