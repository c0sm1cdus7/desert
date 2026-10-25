// A disabled removable tag shows its remove control disabled (slice 3 package 2): the ✕ fades as every disabled
// control's content does (the theme's disabled-content), its pane never fades; an enabled one keeps full ink.
import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("a disabled tag's remove control fades its glyph once and keeps its pane", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(`<script>import Tag from "@desert/svelte/catalog/foundations/tag/Tag.svelte";</script>
    <span data-case="off"><Tag label="Research" presentation="chip" tone="neutral" state="known" removable disabled={true} removeLabel="Remove Research" onremove={() => {}} /></span>
    <span data-case="on"><Tag label="Research" presentation="chip" tone="neutral" state="known" removable disabled={false} removeLabel="Remove Research" onremove={() => {}} /></span>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const read = (which: string) => f.page.locator(`[data-case="${which}"] button`).evaluate(button => ({
      pane: getComputedStyle(button).opacity, glyph: getComputedStyle(button.firstElementChild!).opacity, disabled: (button as HTMLButtonElement).disabled }));
    assert.deepEqual(await read("off"), { pane: "1", glyph: "0.5", disabled: true });
    assert.deepEqual(await read("on"), { pane: "1", glyph: "1", disabled: false });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
