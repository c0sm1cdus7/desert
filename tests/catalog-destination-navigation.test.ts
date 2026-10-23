import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { catalogWorkspaceSource } from "./fixtures/catalog-workspace.ts";
import { program } from "./fixtures/view-program.ts";

test("catalog details use the destination toolbar and content identity, without a second navigation row", async () => {
  const fixture = await svelteBrowser(catalogWorkspaceSource, {}, undefined, {initialCss:await rendererCss()});
  try {
    const { page } = fixture;
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const id of ["input.multiline", "ToolbarLayout"]) {
      const row = page.locator(`[data-catalog-index] [data-destination="${id}"]`);
      assert.equal(await row.locator('[data-piece="face"]').count(), 1);
      assert.equal(await row.evaluate(element => element.parentElement?.hasAttribute("data-grouped-rows")), true);
      assert.equal(await row.evaluate(element => getComputedStyle(element).borderTopWidth), "1px");
    }
    const opener = page.locator('[data-catalog-index] [data-destination="input.text"]');
    await opener.click();
    assert.equal(await page.locator('[data-place-header] [data-place-title]').innerText(), "Text input");
    const back = page.locator('[data-catalog-content] > [data-toolbar="top"]')
      .getByRole("button", { name: "Back", exact: true });
    assert.equal(await back.count(), 1);
    assert.equal(await page.locator('[data-public-catalog-bank] > [data-piece="toolbar"]').count(), 0);
    await back.click();
    assert.equal(await page.locator('[data-place-header] [data-place-title]').innerText(), "Visual catalog");
    assert.ok(await opener.evaluate(element => element === document.activeElement));
    const sharedOpener=page.locator('[data-catalog-index] [data-destination="ToolbarLayout"]');
    await sharedOpener.click();
    assert.equal(await page.locator('[data-place-header] [data-place-title]').innerText(), "Toolbar");
    assert.equal(await page.locator('[data-shared-owner-catalog] > [data-piece="toolbar"]').count(), 0);
    await back.click();
    assert.equal(await page.locator('[data-place-header] [data-place-title]').innerText(), "Visual catalog");
    assert.ok(await sharedOpener.evaluate(element=>element===document.activeElement),
      "Back restores the semantic index action even when the shared-owner index remounts");
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

for (const width of [390, 1440]) test(`catalog detail title hands off to the toolbar only after scrolling at ${width}px`, async () => {
  const fixture = await svelteBrowser(catalogWorkspaceSource, {}, undefined, {initialCss:await rendererCss()});
  try {
    const {page} = fixture;
    await page.setViewportSize({width,height:500});
    await page.emulateMedia({reducedMotion:"reduce"});
    await page.locator('[data-catalog-index] [data-destination="input.text"]').click();
    const title=page.locator('[data-place-header] [data-place-title]');
    const toolbar=page.locator('[data-catalog-content] > [data-toolbar="top"]');
    const compact=toolbar.locator('[data-toolbar-identity]');
    assert.equal(await title.innerText(),"Text input");
    assert.equal(await compact.locator('.toolbar-title').innerText(),"Text input");
    assert.match(await compact.locator('.toolbar-subtitle').innerText(),/single line/);
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-catalog-content] > [data-toolbar="top"] [data-toolbar-identity]')!).opacity === "0");
    assert.equal(await page.getByRole("heading",{name:"Text input",exact:true}).count(),1);
    await page.locator('[data-catalog-scroll]').evaluate(element=>element.scrollTo({top:400}));
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-catalog-content] > [data-toolbar="top"] [data-toolbar-identity]')!).opacity === "1");
    assert.equal(await compact.locator('.toolbar-title').innerText(),"Text input");
    await toolbar.getByRole("button",{name:"Back",exact:true}).click();
    assert.equal(await title.innerText(),"Visual catalog");
    const overflow=await page.locator('[data-catalog-content]').evaluate(element=>element.scrollWidth-element.clientWidth);
    assert.ok(overflow<=1,`catalog overflowed by ${overflow}px`);
    assert.deepEqual(fixture.errors,[]);
  } finally {await fixture.close();}
});

test("each destination retains its catalog path and nested samples return through the same toolbar", async () => {
  const fixture = await svelteBrowser(`<script>
    import Workspace from './src/svelte/catalog/renderer/workspace/Workspace.svelte';
    const program = ${JSON.stringify(program)};
    let active = $state('catalog');
    let resolved = $derived({view:program.views.find(view=>view.id===active),bindings:{},disabledOutputs:[]});
  </script><Workspace {program} {resolved} activeDestination={active}
    error={null} uncertain={false} onevent={()=>{}} onnavigate={id=>active=id} />`, {}, undefined, {initialCss:await rendererCss()});
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1600, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator('[data-catalog-index] [data-destination="catalog.card"]').click();
    assert.equal(await page.locator('[data-place-header] [data-place-title]').innerText(), "Catalog card");
    await page.getByRole("navigation").getByRole("button", { name: "Home", exact: true }).click();
    assert.equal(await page.locator('[data-place-header] [data-place-title]').innerText(), "Home");
    assert.equal(await page.locator('[data-catalog-content] > [data-toolbar="top"]').getByRole("button", { name: "Back", exact: true }).count(), 0);
    await page.getByRole("navigation").getByRole("button", { name: "Visual catalog", exact: true }).click();
    assert.equal(await page.locator('[data-place-header] [data-place-title]').innerText(), "Catalog card");
    await page.locator('[data-catalog-entry="catalog.card"]').getByRole("button", {name:/^State ·/}).click();
    await page.getByRole("option", {name:"item",exact:true}).click();
    const opener=page.locator('[data-specimen="catalog.card:item"] button');
    await opener.click();
    assert.equal(await page.locator('[data-catalog-detail]:visible').count(), 1);
    assert.equal(await page.locator('[data-place-header] [data-place-title]').innerText(), "Notebook cover");
    assert.equal(await page.getByRole("heading", {name:"Notebook cover",exact:true}).count(), 1);
    const back=page.locator('[data-catalog-content] > [data-toolbar="top"]').getByRole("button", {name:"Back",exact:true});
    await back.click();
    assert.equal(await page.locator('[data-place-header] [data-place-title]').innerText(), "Catalog card");
    assert.ok(await opener.evaluate(element=>element===document.activeElement));
    await back.click();
    assert.equal(await page.locator('[data-place-header] [data-place-title]').innerText(), "Visual catalog");
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});
