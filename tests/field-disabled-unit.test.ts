// A disabled field's content fades once, whoever draws it (slice 3 package 2). The field fades the units it draws (its
// row, as the theme's disabled-unit, and the counter under it); a control another owner draws inside that row (the
// money currency choice, the caller's accessory action) fades with the row and never a second time, while an enabled
// field's disabled accessory still fades its own content. field.css names no other owner's content to undo a fade.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script>
  import Field from "@desert/svelte/catalog/foundations/field/Field.svelte";
  import Action from "@desert/svelte/catalog/foundations/action/Action.svelte";
  import MoneyControl from "./src/svelte/catalog/compositions/money-control/MoneyControl.svelte";
  let disabled = $state(true);
  window.enable = () => { disabled = false; };
  const money = $derived({ version: "desert.control/1", kind: "money", id: "amount", label: "Amount", disabled,
    required: false, currencies: [{ code: "ARS", scale: 2 }, { code: "USD", scale: 2 }], currency: "ARS", minorUnits: "100" });
</script>
<section data-case="accessory"><Field primitive="input.text" label="Password" labelVisibility="visible" required={false} invalid={false}
  {disabled} measure="writing" purpose="text" value="secret">
  {#snippet accessory()}<Action label="Unlock" icon="open" emphasis="secondary" face="icon" type="button" state="pending" />{/snippet}
</Field></section>
<section data-case="money"><MoneyControl node={money} onevent={() => {}} /></section>
<section data-case="counter"><Field primitive="input.multiline" label="Notes" labelVisibility="visible" required={false} invalid={false}
  {disabled} measure="writing" purpose="text" value="A note" /></section>`;

/** The opacity an element is drawn with: the product of its own and every ancestor's. */
const drawn = (selector: string) => `(() => { let opacity = 1;
  for (let node = document.querySelector(${JSON.stringify(selector)}); node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
  return Math.round(opacity * 100) / 100; })()`;

test("a disabled field fades each content unit once, whoever draws it", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const measure = async () => Object.fromEntries(await Promise.all(Object.entries({
      editor: '[data-case="accessory"] input', accessory: '[data-case="accessory"] [data-field-accessory] [data-button-content]',
      amount: '[data-case="money"] input', currency: '[data-case="money"] [data-field-row] [data-button-content]',
      note: '[data-case="counter"] textarea', counter: '[data-case="counter"] [data-character-counter]',
    }).map(async ([name, selector]) => [name, await f.page.evaluate(drawn(selector))] as const)));
    assert.deepEqual(await measure(), { editor: 0.5, accessory: 0.5, amount: 0.5, currency: 0.5, note: 0.5, counter: 0.5 },
      "disabled: every unit at the disabled opacity, none twice");
    await f.page.evaluate(() => (window as unknown as { enable: () => void }).enable());
    await f.page.evaluate(() => new Promise(requestAnimationFrame));
    assert.deepEqual(await measure(), { editor: 1, accessory: 0.5, amount: 1, currency: 1, note: 1, counter: 1 },
      "enabled: only the pending accessory fades, by its own disabled content");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("field.css fades only what the field draws", async () => {
  const css = await readFile("src/svelte/catalog/foundations/field/field.css", "utf8");
  assert.doesNotMatch(css, /\[data-disabled="true"\][^{]*\[data-button-content\]/, "no rule reaches into a button's content");
  assert.doesNotMatch(css, /\[data-disabled="true"\][^{]*(?:^|[\s>+~(,])\*/m, "no disabled rule names every element");
});
