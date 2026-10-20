import test from "node:test";
import assert from "node:assert/strict";
import type { Locator, Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import { tick } from 'svelte';
  import TextInput from '@desert/svelte/pieces/TextInput.svelte';
  let props = $state({ primitive: 'input.multiline', label: 'Notes', value: '', maxLength: undefined, disabled: false, error: undefined });
  window.echoTextarea = true;
  window.replaceTextarea = async patch => { props = { ...props, ...patch }; await tick(); };
</script>
<main style="padding:16px;max-width:640px">
  <TextInput {...props} onchange={value => { if (window.echoTextarea) props = { ...props, value }; }} />
  <button>Outside</button>
</main>`;
const update = (page: Page, patch: object) => page.evaluate(value =>
  (window as unknown as { replaceTextarea: (value: object) => Promise<void> }).replaceTextarea(value), patch);
async function counter(field: Locator) {
  const describedBy = await field.getAttribute("aria-describedby");
  assert.ok(describedBy, "Every textarea associates its passive character counter");
  const id = describedBy.split(/\s+/).find(value => value.endsWith("-counter"));
  assert.ok(id, "The counter has a stable descriptive identity");
  return field.page().locator(`[id="${id}"]`);
}

test("textarea counts Unicode code points and newlines, including unacknowledged edits and owner resets", async () => {
  const f = await svelteBrowser(source);
  try {
    const field = f.page.getByRole("textbox", { name: "Notes" });
    const count = await counter(field);
    assert.equal(await count.innerText(), "0 characters");
    await field.fill("💡"); assert.equal(await count.innerText(), "1 character");
    await field.fill("💡\né"); assert.equal(await count.innerText(), "4 characters");
    await f.page.evaluate(() => { (window as unknown as { echoTextarea: boolean }).echoTextarea = false; });
    await field.fill("local draft"); assert.equal(await count.innerText(), "11 characters");
    await update(f.page, { value: "Reset" }); assert.equal(await count.innerText(), "5 characters");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("bounded textarea reports remaining and excess without native truncation or claiming validation", async () => {
  const f = await svelteBrowser(source);
  try {
    const field = f.page.getByRole("textbox", { name: "Notes" });
    await update(f.page, { maxLength: 3 }); const count = await counter(field);
    assert.equal(await count.innerText(), "3 remaining");
    assert.equal(await field.getAttribute("maxlength"), null);
    await field.fill("💡💡💡"); assert.equal(await count.innerText(), "0 remaining");
    await field.fill("💡💡💡💡"); assert.equal(await count.innerText(), "1 over limit");
    assert.equal(await field.inputValue(), "💡💡💡💡");
    assert.equal(await field.getAttribute("aria-invalid"), "false");
    await update(f.page, { maxLength: 0, value: "" }); assert.equal(await count.innerText(), "0 remaining");
    await field.fill("a"); assert.equal(await count.innerText(), "1 over limit");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("passive accessory preserves focus, descriptions, disabled state, and single-line scope", async () => {
  const f = await svelteBrowser(source);
  try {
    const field = f.page.getByRole("textbox", { name: "Notes" });
    await update(f.page, { error: "Keep the useful error." }); const count = await counter(field);
    const problem = f.page.getByText("Keep the useful error.");
    assert.ok((await field.getAttribute("aria-describedby"))!.split(/\s+/).includes((await problem.getAttribute("id"))!));
    assert.equal(await count.getAttribute("tabindex"), null);
    assert.equal(await count.locator("[tabindex],button,input").count(), 0);
    assert.equal(await count.evaluate(element => element.closest("[aria-live], [role='status']") !== null), false);
    await count.click(); assert.equal(await field.evaluate(element => element === document.activeElement), true);
    await field.press("Tab"); assert.equal(await f.page.getByRole("button", { name: "Outside" }).evaluate(element => element === document.activeElement), true);
    await update(f.page, { disabled: true }); await count.click();
    assert.equal(await field.evaluate(element => element === document.activeElement), false);
    await update(f.page, { primitive: "input.text", disabled: false, error: undefined });
    assert.equal(await f.page.locator("[data-character-counter]").count(), 0);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

for (const colorScheme of ["light", "dark"] as const) test(`counter retains its bottom-right row at compact 200% text (${colorScheme})`, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 320, height: 900 });
    await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
    const field = f.page.getByRole("textbox", { name: "Notes" }); const count = await counter(field);
    const font = await count.evaluate(element => {
      const style = getComputedStyle(element);
      return { actual: parseFloat(style.fontSize), expected: parseFloat(style.getPropertyValue("--text-caption")) *
        parseFloat(getComputedStyle(document.documentElement).fontSize) };
    });
    assert.equal(font.actual, font.expected, "Use the shared caption role, not InputGroup.Text's default font size");
    await field.evaluate(element => { element.style.maxHeight = "220px"; element.style.overflowY = "auto"; });
    await field.fill("Long writing\n".repeat(80));
    await field.evaluate(element => { element.scrollTop = element.scrollHeight; });
    assert.equal(await field.evaluate(element => element.scrollTop > 0), true, "Exercise an actually scrolled editor");
    const well = await f.page.locator("[data-floating-field]").boundingBox();
    const editor = await field.boundingBox(); const accessory = await count.boundingBox();
    assert.ok(well && editor && accessory);
    assert.ok(accessory.y >= editor.y + editor.height - 1, "Counter must not obscure the last editable line");
    assert.ok(accessory.y + accessory.height <= well.y + well.height + 1);
    assert.ok(accessory.x >= well.x && accessory.x + accessory.width <= well.x + well.width + 1);
    assert.ok(well.x + well.width <= 320, "The well must not overflow a compact viewport");
    const textRight = await count.evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      return range.getBoundingClientRect().right;
    });
    const rightInset = await count.evaluate(element => parseFloat(getComputedStyle(element.parentElement!).paddingRight));
    assert.ok(Math.abs(well.x + well.width - textRight - rightInset) <= 2,
      `The text sits against the well's right inset: ${JSON.stringify({ well, textRight, rightInset })}`);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
