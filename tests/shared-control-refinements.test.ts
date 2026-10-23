import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("message headings keep the shared tight gap and muted description; ordinary actions remain intrinsic", { timeout: 90000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import SharedOwnerSpecimen from '@desert/svelte/catalog/SharedOwnerSpecimen.svelte';
    import PlaceHeading from '@desert/svelte/pieces/PlaceHeading.svelte';
    import Toolbar from '@desert/svelte/pieces/Toolbar.svelte';
  </script><main style="max-width:720px">
    <PlaceHeading identity={{title:'Collection',subtitle:'A short description.'}}/>
    <Toolbar toolbar={{edge:'top',title:'Collection',subtitle:'A short description.'}} invoke={()=>{}}/>
    <SharedOwnerSpecimen owner="ConfirmationDialog"/>
  </main>`, {}, undefined, { initialCss: await rendererCss() });
  try {
    await f.page.setViewportSize({ width: 1000, height: 900 });
    const opener = f.page.getByRole("button", { name: "Move note to Trash", exact: true });
    assert.ok((await opener.boundingBox())!.width < 300, "ordinary buttons cannot stretch to their grid track");
    await opener.click();
    const dialog = f.page.getByRole("dialog");
    await dialog.waitFor();
    const geometry = await f.page.evaluate(() => {
      const title = document.querySelector('[role="dialog"] [data-slot="dialog-title"]')!;
      const description = document.querySelector('[role="dialog"] [data-slot="dialog-description"]')!;
      const pageTitle = document.querySelector('[data-place-title]')!, pageSubtitle = document.querySelector('[data-place-subtitle]')!;
      const toolbarTitle = document.querySelector('main [data-toolbar-title]')!, toolbarSubtitle = document.querySelector('main [data-toolbar-subtitle]')!;
      return { messageGap: description.getBoundingClientRect().top - title.getBoundingClientRect().bottom,
        pageGap: pageSubtitle.getBoundingClientRect().top - pageTitle.getBoundingClientRect().bottom,
        toolbarGap: toolbarSubtitle.getBoundingClientRect().top - toolbarTitle.getBoundingClientRect().bottom,
        messageCenter: title.getBoundingClientRect().x + title.getBoundingClientRect().width / 2,
        descriptionCenter: description.getBoundingClientRect().x + description.getBoundingClientRect().width / 2,
        color: getComputedStyle(description).color, subtitleColor: getComputedStyle(pageSubtitle).color,
        titleColor: getComputedStyle(title).color };
    });
    assert.ok(Math.abs(geometry.messageGap - geometry.pageGap) <= 1, JSON.stringify(geometry));
    assert.ok(Math.abs(geometry.toolbarGap - geometry.pageGap) <= 1, JSON.stringify(geometry));
    assert.equal(geometry.color, geometry.subtitleColor);
    assert.notEqual(geometry.color, geometry.titleColor);
    assert.ok(Math.abs(geometry.messageCenter - geometry.descriptionCenter) <= 1, "message title and subtitle share their reading axis");
    const footer = dialog.locator('[data-toolbar="bottom"]');
    assert.ok(await footer.locator("button").evaluateAll(buttons => buttons.every(button => getComputedStyle(button).flexGrow === "0")), "footer actions must not stretch");
    await f.page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await f.page.setViewportSize({ width: 320, height: 900 });
    await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
    assert.ok((await opener.boundingBox())!.width <= 320, "intrinsic specimen actions remain bounded at enlarged text sizes");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("known-empty fact values use a dash alone without hiding unknown or literal Empty values", { timeout: 90000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">import FactValue from '@desert/svelte/pieces/FactValue.svelte';</script>
    <FactValue value=""/><FactValue value={null}/><FactValue value="Empty"/>`, {}, undefined, { initialCss: await rendererCss() });
  try {
    const empty = f.page.locator('[data-fact-state="empty"]');
    assert.equal(await empty.locator("svg").count(), 1);
    assert.equal(await empty.locator(":scope > span:not(.sr-only)").count(), 0, "Empty is not visible copy");
    assert.match((await empty.textContent())!, /Empty/, "screen readers retain the known-empty distinction");
    assert.match((await f.page.locator('[data-fact-state="unknown"]').textContent())!, /Unknown/);
    assert.equal(await f.page.locator('[data-fact-state="known"]').textContent(), "Empty");
  } finally { await f.close(); }
});

test("appearance and embedded selection use compact rounded controls and content-sized option panes", { timeout: 90000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import AppearancePreferences from '@desert/svelte/pieces/AppearancePreferences.svelte';
    import ObjectStateControl from '@desert/svelte/pieces/ObjectStateControl.svelte';
    let value = $state({theme:'dark',textSize:'standard',tint:'blue',wallpaper:'plain'});
  </script><main style="width:760px;max-width:100%">
    <AppearancePreferences {value} onchange={next=>value=next}/>
    <ObjectStateControl selectors={[{field:'status',label:'Status',value:'open',disabled:false,options:[
      {value:'open',label:'Open',journey:'open',available:true},{value:'completed',label:'Completed',journey:'completed',available:true}]}]} onselect={()=>{}}/>
    <output>{value.theme}</output>
  </main>`, {}, undefined, { initialCss: await rendererCss() });
  try {
    await f.page.setViewportSize({ width: 1100, height: 1000 });
    assert.equal(await f.page.getByRole("radiogroup", { name: "Appearance", exact: true }).getByRole("radio").count(), 2);
    await f.page.getByRole("radio", { name: "Light", exact: true }).click();
    assert.equal(await f.page.locator("output").textContent(), "light");
    for (const label of ["Text size · Default", "Status"]) {
      const trigger = f.page.getByRole("button", { name: label, exact: true });
      await trigger.hover();
      const size = await trigger.evaluate(element => ({ width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height, radius: parseFloat(getComputedStyle(element).borderRadius),
        hover: getComputedStyle(element).boxShadow }));
      assert.ok(size.width < 300 && size.height >= 44 && size.radius > 0, JSON.stringify({ label, size }));
      assert.notEqual(size.hover, "none");
      await trigger.click();
      const pane = f.page.locator('[data-slot="popover-content"]');
      assert.ok((await pane.boundingBox())!.width < 300, "options fit their contents rather than the settings column");
      await f.page.keyboard.press("Escape");
      await pane.waitFor({ state: "hidden" });
    }
    const swatches = await f.page.locator(".appearance-swatch").evaluateAll(labels => labels.map(label => ({
      hit: label.getBoundingClientRect().width,
      color: parseFloat(getComputedStyle(label, "::before").width),
    })));
    assert.ok(swatches.length > 0 && swatches.every(swatch => swatch.hit >= 44 && swatch.color <= 32), JSON.stringify(swatches));
    await f.page.getByRole("radio", { name: "Rose", exact: true }).click();
    assert.equal(await f.page.getByRole("radio", { name: "Rose", exact: true }).getAttribute("aria-checked"), "true");
    await f.page.setViewportSize({ width: 320, height: 900 });
    await f.page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%"));
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
