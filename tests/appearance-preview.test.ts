import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("appearance tiles preview actual modes, keep separate text settings and compact accessible tints", { timeout: 90000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import AppearancePreferences from '@desert/svelte/catalog/compositions/appearance-preferences/AppearancePreferences.svelte';
    let value = $state({theme:'system',textSize:'standard',tint:'rose',wallpaper:'mist'});
    let changes = $state(0);
  </script><main style="max-width:540px;padding:24px">
    <AppearancePreferences {value} onchange={next=>{value=next;changes+=1}}/>
    <output>{value.theme}:{changes}</output>
  </main>`, {}, undefined, { initialCss: await rendererCss() });
  try {
    await f.page.setViewportSize({ width: 760, height: 1100 });
    await f.page.emulateMedia({ colorScheme: "dark" });
    const modes = f.page.getByRole("radiogroup", { name: "Appearance", exact: true });
    assert.deepEqual(await modes.getByRole("radio").evaluateAll(items => items.map(item => item.getAttribute("aria-label"))), ["Dark", "Light"]);
    await f.page.waitForFunction(() => document.querySelector('[aria-label="Dark"]')?.getAttribute('aria-checked') === 'true');
    assert.equal(await f.page.locator("output").textContent(), "system:0", "legacy display does not write a preference");
    const light = modes.getByRole("radio", { name: "Light", exact: true });
    const dark = modes.getByRole("radio", { name: "Dark", exact: true });
    const previews = f.page.locator("[data-appearance-preview]");
    const paints = await previews.evaluateAll(items => items.map(item => ({mode:item.getAttribute('data-appearance-preview'),
      scheme:getComputedStyle(item).colorScheme, background:getComputedStyle(item).backgroundColor,
      foreground:getComputedStyle(item).color, width:item.getBoundingClientRect().width, height:item.getBoundingClientRect().height})));
    assert.equal(paints.length, 2);
    assert.deepEqual(paints.map(paint => paint.scheme), ["dark", "light"]);
    assert.notEqual(paints[0]!.background, paints[1]!.background);
    assert.notEqual(paints[0]!.foreground, paints[1]!.foreground);
    assert.ok(paints.every(paint => Math.abs(paint.width - paint.height) <= 1 && paint.width >= 100), JSON.stringify(paints));
    await dark.focus();
    await f.page.keyboard.press("ArrowRight");
    assert.equal(await light.isChecked(), true);
    assert.equal(await f.page.locator("output").textContent(), "light:1");
    assert.equal(await f.page.getByRole("group", {name:"Text size", exact:true}).count(), 1);
    const tints = await f.page.locator(".appearance-swatch").evaluateAll(items => items.map(item => ({width:item.getBoundingClientRect().width,
      height:item.getBoundingClientRect().height,x:item.getBoundingClientRect().x})));
    assert.ok(tints.every(item => item.width >= 44 && item.height >= 44));
    assert.ok(tints[1]!.x-tints[0]!.x-tints[0]!.width <= 4, "Tint hit targets are adjacent with a small gap");
    const directory = new URL("../artifacts/appearance-round4/", import.meta.url);
    await mkdir(directory, {recursive:true});
    await f.page.screenshot({path:new URL("appearance-wide.png", directory).pathname});
    for (const [width, scale] of [[390, 1], [320, 2]]) {
      await f.page.setViewportSize({width:width!, height:1100});
      await f.page.evaluate(scale => document.documentElement.style.setProperty('--text-scale', String(scale)), scale);
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.ok(await previews.evaluateAll(items => items.every(item => {const box=item.getBoundingClientRect();return box.left>=0 && box.right<=innerWidth}))); 
      await f.page.screenshot({path:new URL(`appearance-${width}-${scale}.png`, directory).pathname,fullPage:true});
    }
    assert.deepEqual(f.errors, []);
  } finally {await f.close();}
});
