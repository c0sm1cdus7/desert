import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { groupedRowsSource } from "./fixtures/grouped-rows.ts";

test("sibling collections, actions and choices have one clipped panel and contiguous separated rows", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(groupedRowsSource);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    for (const profile of ["default", "apple-reference"]) for (const width of [900, 390]) {
      await f.page.setViewportSize({width,height:1000});
      await f.page.evaluate(profile => { document.documentElement.dataset.rendererProfile = profile; }, profile);
      for (const family of ["collection","actions","options","checks","selection"]) {
        const scope = f.page.locator(`[data-test="${family}"]`);
        assert.equal(await scope.locator('[data-grouped-panel]').count(), 1, `${family}: one panel, not one card per sibling`);
        const geometry = await scope.locator('[data-grouped-panel]').evaluate(panel => {
          const style = getComputedStyle(panel);
          const rows = [...panel.querySelectorAll<HTMLElement>('[data-grouped-row]')];
          return { overflow:style.overflow, border:parseFloat(style.borderTopWidth), radius:parseFloat(style.borderTopLeftRadius),
            rows:rows.map(row => {const box=row.getBoundingClientRect(), css=getComputedStyle(row), separator=getComputedStyle(row,'::before');return {
              top:box.top,bottom:box.bottom,height:box.height, borderTop:parseFloat(css.borderTopWidth),
              choice:row.hasAttribute('data-choice-row'),separator:separator.content,separatorHeight:parseFloat(separator.height),
              separatorInset:parseFloat(separator.left),separatorFill:separator.backgroundColor,
              borderBottom:parseFloat(css.borderBottomWidth),topRadius:parseFloat(css.borderTopLeftRadius),
              bottomRadius:parseFloat(css.borderBottomLeftRadius),blur:css.backdropFilter};}) };
        });
        assert.equal(geometry.overflow,"hidden"); assert.equal(geometry.border,1); assert.ok(geometry.radius>0);
        assert.equal(geometry.rows.length,3);
        for (const [index,row] of geometry.rows.entries()) {
          assert.ok(row.height>=44); assert.equal(row.blur,"none"); assert.equal(row.borderBottom,0);
          assert.equal(row.borderTop,row.choice || index===0?0:1,`${family} row ${index}: interior separator only`);
          if (row.choice && index) {
            assert.equal(row.separator,'""'); assert.equal(row.separatorHeight,1);
            assert.ok(row.separatorInset>0,'choice dividers are inset past the selection accessory');
            assert.notEqual(row.separatorFill,'rgba(0, 0, 0, 0)');
          }
          assert.equal(row.topRadius,index===0?geometry.radius:0);
          assert.equal(row.bottomRadius,index===2?geometry.radius:0);
          if(index) assert.ok(Math.abs(row.top-geometry.rows[index-1]!.bottom)<.5,"no gap between siblings");
        }
      }
    }
    // A label click must activate its associated native choice exactly once.
    await f.page.locator('[data-test="options"] [data-grouped-row]').nth(1).click();
    await f.page.locator('[data-test="checks"] [data-grouped-row]').nth(1).click();
    await f.page.locator('[data-test="selection"] [data-grouped-row]').nth(1).click();
    assert.deepEqual(JSON.parse(await f.page.locator('[data-events]').textContent() ?? ''),['option','check','selection']);
    assert.equal(await f.page.locator('[data-test="options"]').getByRole('radio',{name:'Middle',exact:true}).isChecked(),true);
    await f.page.locator('[data-test="selection"]').getByRole('radio',{name:'Middle',exact:true}).focus();
    await f.page.keyboard.press('ArrowDown');
    assert.equal(await f.page.locator('[data-test="selection"]').getByRole('radio',{name:'Last',exact:true}).isChecked(),true);
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});
