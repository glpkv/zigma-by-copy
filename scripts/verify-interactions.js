async (page) => {
  page.setDefaultTimeout(8000);
  const origin = new URL(page.url()).origin;
  const assert = (value, message) => { if (!value) throw new Error(message); };
  await page.route('**/*', route => route.continue()); // Disable cache for repeatable checks.
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const results = [];
  for (const width of [390, 1280]) {
    await page.setViewportSize({width, height:844});
    for (const path of ['/', '/implantation/', '/implantation/bone-grafting/']) {
      await page.goto(origin + path);
      await page.waitForTimeout(400);
      const gallery = page.locator('[data-elem-type="gallery"]').first();
      const next = page.getByRole('button', {name:'Следующее фото',exact:true});
      const prev = page.getByRole('button', {name:'Предыдущее фото',exact:true});
      for (const [control, position] of [[next,2],[next,3],[prev,2]]) {
        await control.click();await page.waitForTimeout(500);
        const state = await gallery.evaluate(node => {
          const active=node.querySelector('.t-slds__item_active');
          return {position:Number(node.querySelector('.t-slds__items-wrapper').dataset.sliderPos),opacity:Number(getComputedStyle(active).opacity)};
        });
        assert(state.position===position && state.opacity===1, `${width} ${path}: gallery image did not visibly change`);
      }
      results.push(`${width} ${path}: gallery forward/back and visible image PASS`);
    }
    for (const path of ['/', '/therapy/', '/implantation/', '/implantation/bone-grafting/']) {
      await page.goto(origin + path);await page.waitForTimeout(400);
      const viewports=page.locator('.site-carousel-viewport');
      for (let index=0;index<await viewports.count();index++) {
        const viewport=viewports.nth(index),id=await viewport.evaluate(node=>node.closest('.r').id);
        const max=await viewport.evaluate(node=>node.scrollWidth-node.clientWidth);
        if(max<=2) continue;
        const next=page.locator(`button[aria-controls="${id}"][aria-label="Следующие карточки"]`);
        const prev=page.locator(`button[aria-controls="${id}"][aria-label="Предыдущие карточки"]`);
        assert(await prev.isDisabled(),`${id}: previous must be disabled at start`);
        await next.click();await page.waitForTimeout(450);
        assert(await viewport.evaluate(node=>node.scrollLeft)>0,`${id}: next failed`);
        await prev.click();await page.waitForTimeout(450);
        assert(await viewport.evaluate(node=>node.scrollLeft)<2,`${id}: previous failed`);
      }
      results.push(`${width} ${path}: card navigation and boundary state PASS`);
    }
    await page.goto(origin+'/implantation/bone-grafting/');
    const triggers=page.locator('.t585__trigger-button');
    for(let index=0;index<await triggers.count();index++) {
      const trigger=triggers.nth(index),id=await trigger.getAttribute('aria-controls'),panel=page.locator('#'+id);
      await trigger.click();await page.waitForTimeout(350);assert(await panel.isVisible(),`${id}: expand failed`);
      await trigger.click();await page.waitForTimeout(350);assert(!(await panel.isVisible()),`${id}: collapse failed`);
    }
    results.push(`${width}: FAQ expands and collapses PASS`);
  }
  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/therapy/');
  const menu=page.locator('.site-mobile-header__toggle');
  await menu.click();assert(await page.locator('#site-mobile-menu').isVisible(),'mobile menu did not open');
  await page.keyboard.press('Escape');assert(!(await page.locator('#site-mobile-menu').isVisible()),'mobile menu did not close');
  const duplicates=await page.locator('.site-legacy-header').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height>0).length);
  assert(duplicates===0,'duplicate mobile header');
  await page.locator('.site-mobile-header__appointment').click();assert(await page.locator('#appointment-dialog').isVisible(),'appointment dialog failed');
  await page.keyboard.press('Escape');assert(!(await page.locator('#appointment-dialog').isVisible()),'appointment Escape failed');
  await page.getByRole('button',{name:'Подобрать услуги',exact:true}).filter({visible:true}).click();
  await page.locator('#service-helper').waitFor({state:'visible'});
  assert(await page.locator('#service-helper').isVisible(),'service helper failed');
  await page.locator('#helper-options input[type=checkbox]').first().check();await page.locator('#helper-next').click();
  assert(await page.locator('#helper-request').isVisible(),'service helper step failed');
  await page.locator('#helper-back').click();assert(await page.locator('#helper-choice').isVisible(),'service helper back failed');
  await page.keyboard.press('Escape');assert(!(await page.locator('#service-helper').isVisible()),'service helper close failed');
  results.push('Mobile header, menu, appointment and service helper open/back/Escape PASS; no live forms submitted');
  assert(errors.length===0,'Browser errors: '+errors.join('; '));
  return results;
}
