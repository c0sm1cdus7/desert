// Choice cards and swatches show their disabled and keyboard-focus states (slice 3 package 2). Their rules read
// `:has(:disabled)` and `:has(:focus-visible)` in a scoped style, but the control inside is another component's element,
// which never carries the scope, so neither state ever drew: a disabled card read as enabled and a focused card had no
// ring of its own. A disabled card fades its content once (the pane never fades); a disabled swatch, a mark, fades whole.
import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script>
  import Choice from "@desert/svelte/catalog/foundations/choice/Choice.svelte";
  let disabled = $state(true);
  window.enable = () => { disabled = false; };
  const wallpapers = [{ value: "silk", label: "Silk", disabled: false, leading: { kind: "wallpaper", wallpaper: "silk" } },
    { value: "mist", label: "Mist", disabled: false, leading: { kind: "wallpaper", wallpaper: "mist" } }];
  const tints = [{ value: "blue", label: "Blue", disabled: false, leading: { kind: "color", color: "blue" } },
    { value: "rose", label: "Rose", disabled: false, leading: { kind: "color", color: "rose" } }];
</script>
<section data-case="one"><Choice presentation="cards" cardinality="one" label="Wallpaper" labelVisibility="accessible" selected={["mist"]} {disabled} required={false} onchange={() => {}} options={wallpapers} /></section>
<section data-case="many"><Choice presentation="cards" cardinality="many" label="Covers" labelVisibility="accessible" selected={["mist"]} {disabled} required={false} onchange={() => {}} options={wallpapers} /></section>
<section data-case="swatch"><Choice presentation="swatches" cardinality="one" label="Tint" labelVisibility="accessible" selected={["blue"]} {disabled} required={false} onchange={() => {}} options={tints} /></section>`;

const drawn = (selector: string) => `(() => { let opacity = 1;
  for (let node = document.querySelector(${JSON.stringify(selector)}); node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
  return Math.round(opacity * 100) / 100; })()`;

test("a disabled choice card fades its content once and its pane never; a disabled swatch fades", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const measure = async () => Object.fromEntries(await Promise.all(Object.entries({
      pane: '[data-case="one"] [data-choice-option="silk"]', art: '[data-case="one"] [data-choice-option="silk"] [data-system-wallpaper]',
      label: '[data-case="one"] [data-choice-option="silk"] .caption > span:last-child', radio: '[data-case="one"] [data-choice-option="silk"] button',
      box: '[data-case="many"] [data-choice-option="silk"] button', swatch: '[data-case="swatch"] [data-choice-option="rose"]',
    }).map(async ([name, selector]) => [name, await f.page.evaluate(drawn(selector))] as const)));
    assert.deepEqual(await measure(), { pane: 1, art: 0.5, label: 0.5, radio: 0.5, box: 0.5, swatch: 0.5 }, "disabled");
    await f.page.evaluate(() => (window as unknown as { enable: () => void }).enable());
    await f.page.evaluate(() => new Promise(requestAnimationFrame));
    assert.deepEqual(await measure(), { pane: 1, art: 1, label: 1, radio: 1, box: 1, swatch: 1 }, "enabled");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a keyboard-focused choice card or swatch draws its ring; a pointer press does not", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.evaluate(() => (window as unknown as { enable: () => void }).enable());
    // The outline drawn: none, or its style and width (a selected card keeps its 2px selection ring, focus draws 3px).
    const ring = (selector: string) => f.page.locator(selector).evaluate(element => { const style = getComputedStyle(element);
      return style.outlineStyle === "none" ? "none" : style.outlineWidth; });
    await f.page.locator('[data-case="many"] [data-choice-option="silk"] button').click();
    assert.equal(await ring('[data-case="many"] [data-choice-option="silk"]'), "none", "a pointer press draws no focus ring");
    await f.page.keyboard.press("Tab");
    assert.equal(await ring('[data-case="many"] [data-choice-option="mist"]'), "3px", "the card focused from the keyboard is ringed");
    await f.page.keyboard.press("Tab");
    assert.equal(await ring('[data-case="swatch"] [data-choice-option="blue"]'), "3px", "the swatch focused from the keyboard is ringed");
    assert.equal(await ring('[data-case="many"] [data-choice-option="mist"]'), "2px", "the focus ring leaves with the focus");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
