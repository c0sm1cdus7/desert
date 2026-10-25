import assert from "node:assert/strict";
import test from "node:test";
import type { Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { groupedRowsSource } from "./fixtures/grouped-rows.ts";

/** Collections and context actions are Lists of Rows (composition lane C); choices are Choice's rows (lane B; the grouped
 * panel and choice row foundations they drew before were deleted in Batch 3). */
const listed = (family: string) => family === "collection" || family === "actions";
const panelOf = (family: string) => listed(family) ? "[data-list]" : "[data-choice]";
const rowOf = (family: string) => listed(family) ? "[data-row]" : "[data-choice-row]";

const settle = (page: Page) => page.evaluate(async () => {
  await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
});
async function expectedInk(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = 'var(--foreground)';
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove(); return color;
  });
}

test("action and choice rows share semantic hover, press, cancellation and disabled feedback", {timeout:30000}, async () => {
  const f = await svelteBrowser(groupedRowsSource);
  const families = ["collection", "actions", "options", "checks", "selection"];
  const target = (family: string) => {
    return f.page.locator(`[data-test="${family}"] ${rowOf(family)}`).nth(1);
  };
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width:900,height:1000});
    for (const profile of ["default", "apple-reference"]) {
      await f.page.evaluate(profile => { document.documentElement.dataset.rendererProfile = profile; }, profile);
      const hover = await expectedInk(f.page);
      for (const family of families) {
        const row = target(family);
        await row.scrollIntoViewIfNeeded(); await f.page.mouse.move(0,0); await settle(f.page);
        const before = await row.boundingBox();
        const restingInk = await row.evaluate(node => getComputedStyle(node).color);
        const restingShadow = await row.evaluate(node => getComputedStyle(node).boxShadow);
        await row.hover(); await settle(f.page);
        assert.equal(await row.evaluate(node => getComputedStyle(node).color),hover,`${profile}/${family}: shared hover ink`);
        assert.equal(await row.evaluate(node => getComputedStyle(node).color),restingInk,'hover preserves semantic ink');
        const hoverShadow = await row.evaluate(node => getComputedStyle(node).boxShadow);
        assert.notEqual(hoverShadow,restingShadow,'neutral hover feedback remains perceptible');
        assert.equal(await row.evaluate(node => getComputedStyle(node).backgroundImage),'none','hover does not repaint the pane');
        await f.page.mouse.down();
        try {
          await settle(f.page);
          assert.equal(await row.evaluate(node => getComputedStyle(node).backgroundImage),'none','press does not repaint the pane');
          const scale = await row.evaluate(node => new DOMMatrix(getComputedStyle(node.querySelector('[data-button-content],[data-choice-anatomy]')!).transform).a);
          assert.ok(Math.abs(scale - .96) < .001,`${profile}/${family}: shared held content feedback`);
          assert.notEqual(await row.evaluate(node => getComputedStyle(node).boxShadow),hoverShadow,'held feedback is distinct from hover');
          assert.deepEqual(await row.boundingBox(),before,"feedback does not resize its surface");
          await f.page.mouse.move(0,0); await settle(f.page);
          assert.equal(await row.evaluate(node => getComputedStyle(node).backgroundImage),"none","pointer departure clears held feedback");
          assert.equal(await row.getAttribute('data-pressed'),null,'pointer departure clears the pressed state');
          assert.equal(await row.evaluate(node => getComputedStyle(node).boxShadow),restingShadow,'departure clears neutral feedback');
        } finally { await f.page.mouse.up(); }
      }
    }
    await f.page.getByRole("button",{name:"Disable all",exact:true}).click();
    for (const family of families) {
      const row = target(family);
      await row.scrollIntoViewIfNeeded(); const box = (await row.boundingBox())!;
      await f.page.mouse.move(box.x+box.width/2,box.y+box.height/2); await settle(f.page);
      assert.equal(await row.evaluate(node => getComputedStyle(node).backgroundImage),"none",`${family}: disabled has no hover surface`);
      await f.page.mouse.down();
      try {
        await settle(f.page);
        assert.equal(await row.evaluate(node => getComputedStyle(node).backgroundImage),"none",`${family}: disabled has no pressed surface`);
      } finally { await f.page.mouse.up(); }
    }
    assert.equal(await f.page.locator("[data-events]").textContent(),"[]","cancelled and disabled presses do not activate");
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});
