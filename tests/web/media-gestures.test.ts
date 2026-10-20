import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

test('drag, pan, emulated pinch, keyboard and focus have separate ownership', async () => {
  const f=await publicCatalogFixture(),{page}=f;
  try {
    await page.setViewportSize({width:390,height:820}); await settle(page);
    const open=page.locator('[data-media-open]').first(),box=(await open.boundingBox())!;
    await page.mouse.move(box.x+300,box.y+180); await page.mouse.down();
    await page.mouse.move(box.x+80,box.y+180,{steps:12}); await page.mouse.up();
    assert.match((await page.locator('[data-media-dots] [aria-current="true"]').getAttribute('aria-label'))!,/^Photo 2:/);
    assert.equal(await page.locator('[data-media-viewer]').count(),0);
    await open.click({position:{x:180,y:180}});
    const viewer=page.locator('[data-media-viewer]'); await viewer.waitFor();
    await viewer.locator('[data-media-stage] [data-image-state="ready"]').waitFor();
    await viewer.getByRole('button',{name:'Zoom in',exact:true}).click();
    const stage=viewer.locator('[data-media-stage]'),sb=(await stage.boundingBox())!;
    await page.mouse.move(sb.x+280,sb.y+180); await page.mouse.down();
    await page.mouse.move(sb.x+80,sb.y+180,{steps:12}); await page.mouse.up();
    assert.equal(await viewer.locator('[data-media-count]').innerText(),'2 / 3');
    assert.notEqual(await stage.locator('img').evaluate(e=>getComputedStyle(e).transform),'none');
    await page.keyboard.press('0');
    const cdp=await page.context().newCDPSession(page),cx=sb.x+sb.width/2,cy=sb.y+sb.height/2;
    const points=(distance:number)=>[{x:cx-distance,y:cy,id:1},{x:cx+distance,y:cy,id:2}];
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(30)});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(70)});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok(parseInt((await viewer.locator('[data-media-zoom]').innerText()))>150);
    await viewer.getByRole('button',{name:'Photo 1: Mount Fuji',exact:true}).click();
    assert.equal(await viewer.locator('[data-media-zoom]').innerText(),'100%');
    await page.keyboard.press('Escape'); await viewer.waitFor({state:'hidden'});
    assert.equal(await open.evaluate(e=>e===document.activeElement),true);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.keyboard.press('Enter'); await viewer.waitFor();
    assert.equal(await viewer.evaluate(e=>getComputedStyle(e).animationName),'none');
    // Dialog focus remains in the viewer through a full tab cycle.
    for(let i=0;i<12;i++) {
      await page.keyboard.press('Tab');
      assert.equal(await viewer.evaluate(e=>e.contains(document.activeElement)),true);
    }
  } finally { await f.close(); }
});
