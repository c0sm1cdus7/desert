import assert from "node:assert/strict";
import test from "node:test";
import type { Locator, Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { groupedRowsSource } from "./fixtures/grouped-rows.ts";

const settle = (page: Page) => page.evaluate(async () => {
  await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
});
const appearance = (target: Locator) => target.evaluate(element => {
  const style=getComputedStyle(element), content=element.querySelector('[data-button-content],[data-grouped-content]')!;
  const transform=getComputedStyle(content).transform;
  return { transform:style.transform, contentScale:transform==='none'?1:new DOMMatrixReadOnly(transform).a,
    background:style.backgroundImage, outline:style.outlineWidth, offset:style.outlineOffset,
    corners:[style.borderTopLeftRadius,style.borderBottomLeftRadius] };
});

test("first, middle and last grouped rows keep surfaces fixed while only content presses; focus and disabled states remain bounded", {timeout:30000}, async () => {
  const f=await svelteBrowser(groupedRowsSource);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width:900,height:1000});
    for(const family of ['collection','actions','options','checks','selection']) for(const index of [0,1,2]) {
      const row=f.page.locator(`[data-test="${family}"] [data-grouped-row]`).nth(index);
      const target=family==='collection'?row.locator('[data-grouped-action]'):row;
      await target.scrollIntoViewIfNeeded(); await f.page.mouse.move(0,0); await settle(f.page);
      const bounds=await target.boundingBox(), before=await appearance(target);
      await target.hover(); await f.page.mouse.down();
      try {
        await settle(f.page);
        const pressed=await appearance(target);
        assert.deepEqual(await target.boundingBox(),bounds,`${family}/${index}: fixed hit surface`);
        assert.equal(pressed.transform,'none'); assert.ok(Math.abs(pressed.contentScale-.96)<.001);
        assert.equal(pressed.background,'none', 'pressed content never repaints the shared pane'); assert.deepEqual(pressed.corners,before.corners);
        await f.page.mouse.move(0,0); await settle(f.page);
        assert.equal((await appearance(target)).contentScale,1,'pointer departure cancels content feedback');
      } finally { await f.page.mouse.up(); }
      await f.page.keyboard.press('Tab');
      const focusTarget=family==='options'||family==='selection'?target.getByRole('radio'):
        family==='checks'?target.getByRole('checkbox'):target;
      await focusTarget.focus();
      const focused=await appearance(target);
      assert.equal(focused.outline,'2px'); assert.equal(focused.offset,'-3px','focus remains within the clipped group');
    }
    assert.equal(await f.page.locator('[data-events]').textContent(),'[]','cancelled presses never activate');
    await f.page.getByRole('button',{name:'Disable all',exact:true}).click();
    for(const family of ['collection','actions','options','checks','selection']) {
      const row=f.page.locator(`[data-test="${family}"] [data-grouped-row]`).nth(1);
      const target=family==='collection'?row.locator('[data-grouped-action]'):row;
      await target.scrollIntoViewIfNeeded(); const box=(await target.boundingBox())!;
      await f.page.mouse.move(box.x+box.width/2,box.y+box.height/2); await f.page.mouse.down();
      try { await settle(f.page); assert.equal((await appearance(target)).contentScale,1); }
      finally { await f.page.mouse.up(); }
    }
    assert.equal(await f.page.locator('[data-events]').textContent(),'[]','disabled labels do not forward activations');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test("reduced motion removes only content scale without moving grouped boundaries", {timeout:20000}, async () => {
  const f=await svelteBrowser(groupedRowsSource);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    const row=f.page.locator('[data-test="options"] [data-grouped-row]').nth(1);
    await row.scrollIntoViewIfNeeded(); const before=await row.boundingBox();
    await row.hover(); await f.page.mouse.down();
    try { assert.equal((await appearance(row)).contentScale,1); assert.deepEqual(await row.boundingBox(),before); }
    finally { await f.page.mouse.move(0,0); await f.page.mouse.up(); }
  } finally {await f.close();}
});
