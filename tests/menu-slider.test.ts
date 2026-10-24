// Menu (design §1.3): an icon trigger reveals commands beside their labels; choosing one closes the menu first, then
// invokes it. Slider: one bounded value, set by keys or the track, reported through `change`.
import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("menu reveals labelled commands, closes on a choice and invokes it", async () => {
  const f = await svelteBrowser(`<script>
    import Menu from '@desert/svelte/catalog/foundations/menu/Menu.svelte';
    let open = $state(false), invoked = $state('none');
    const actions = [
      {intent:{kind:'journey',journey:'archive-note'},label:'Archive note',icon:'archive',state:'ready'},
      {intent:{kind:'journey',journey:'restore-note'},label:'Restore note',icon:'restore',state:'unavailable',reason:'Only archived notes can be restored'},
    ];
  </script><main style="padding:200px 0 0 600px"><Menu label="More actions" icon="more" {actions} {open} align="end"
    onopenchange={next => open = next} oninvoke={intent => invoked = intent.journey} /><output>{invoked}</output></main>`);
  try {
    const { page } = f;
    await page.addStyleTag({ content: await rendererCss() });
    const trigger = page.getByRole("button", { name: "More actions", exact: true });
    await trigger.click();
    const menu = page.getByRole("dialog", { name: "More actions", exact: true });
    await menu.waitFor();
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    assert.equal(await menu.locator("[data-menu-label]").filter({ hasText: "Archive note" }).count(), 1, "each command reads as its label");
    assert.equal(await menu.getByRole("button", { name: "Restore note", exact: true }).isDisabled(), true);
    await menu.getByRole("button", { name: "Archive note", exact: true }).click();
    await menu.waitFor({ state: "hidden" });
    assert.equal(await page.locator("output").textContent(), "archive-note");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("slider reports each value set by keys, within its bounds and step", async () => {
  const f = await svelteBrowser(`<script>
    import Slider from '@desert/svelte/catalog/foundations/slider/Slider.svelte';
    let value = $state(0.5);
  </script><Slider label="Volume" {value} min={0} max={1} step={0.25} disabled={false} onchange={next => value = next} />
  <output>{value}</output>`);
  try {
    const { page } = f;
    const thumb = page.getByRole("slider", { name: "Volume", exact: true });
    await thumb.focus();
    await page.keyboard.press("ArrowRight");
    await page.locator("output").filter({ hasText: "0.75" }).waitFor();
    await page.keyboard.press("End");
    await page.locator("output").filter({ hasText: /^1$/ }).waitFor();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("output").textContent(), "1", "the maximum bounds the value");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
