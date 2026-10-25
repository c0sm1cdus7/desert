// The cover picker is one surface on one axis (fourth review of the slice 3 package). On a phone its anchored popover,
// nearly the page's width, lay over the page's next pane, whose rounded bottom peeked out under it like a second sheet; and
// inside it the «Cover» group heading started 16px right of the cover card under it. Now the picker presents as every
// picker does (an adaptive popover): anchored where there is room, a sheet over the page on a phone, nothing of the page
// showing as part of it; and what it holds starts on one line (the field above and the sheet's bar already name it, so the
// group's title is for assistive technology only).
import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import MediaReferenceSpecimen from "@desert/svelte/catalog/compositions/media-reference-specimen/MediaReferenceSpecimen.svelte";
</script>
<main style="padding:16px;display:grid;gap:24px;max-width:1000px">
  <MediaReferenceSpecimen />
  <div class="material-pane" data-next-pane style="height:240px;border-radius:16px">A pane of the page under the picker</div>
</main>`;

/** The left edges of what the open picker holds (its group, not a sheet bar): its visible heading (if any), cards and actions. */
function axis(root: string) {
  const surface = document.querySelector(root)!.querySelector("fieldset.place-stack")!;
  const shown = (element: Element) => element.getBoundingClientRect().width > 1 && element.checkVisibility({ visibilityProperty: true, opacityProperty: true });
  const heading = [...surface.querySelectorAll("legend")].filter(shown).map(element => element.querySelector("h1,h2,h3,h4,h5,h6,p,span") ?? element);
  const items = [...heading, ...surface.querySelectorAll("label.card[data-choice-option], [data-action]")].filter(shown);
  return items.map(item => ({ what: item.tagName + "." + item.className.toString().split(" ")[0], left: Math.round(item.getBoundingClientRect().left) }));
}

for (const { width, presentation } of [{ width: 390, presentation: "sheet" }, { width: 1280, presentation: "anchored" }] as const)
test(`the cover picker at ${width}px is one ${presentation} surface whose content starts on one line`, { timeout: 60000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.setViewportSize({ width, height: 844 });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.getByRole("button", { name: /^Cover ·/ }).click();
    const root = presentation === "sheet" ? "[data-picker-sheet]" : '[data-slot="popover-content"]';
    const surface = f.page.locator(root);
    await surface.waitFor();
    await surface.evaluate(async element => { await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined))); });
    if (presentation === "sheet") {
      assert.equal(await surface.getAttribute("aria-modal"), "true", "on a phone the picker is a modal sheet over the page");
      assert.equal(await f.page.locator('[data-slot="popover-content"]').count(), 0, "no anchored popover besides the sheet");
      // Nothing of the page takes part in it: the page's next pane, where the popover's foot used to be, is under the sheet's scrim.
      const next = (await f.page.locator("[data-next-pane]").boundingBox())!;
      const top = await f.page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-next-pane]") !== null, { x: next.x + 20, y: next.y + 20 });
      assert.equal(top, false, "the page's pane is not drawn as part of the picker");
    } else assert.equal(await f.page.locator("[data-picker-sheet]").count(), 0, "with room the picker stays anchored");
    const found = await f.page.evaluate(axis, root);
    assert.ok(found.some(item => item.what.startsWith("LABEL")) && found.some(item => item.what.startsWith("BUTTON")), `the cover card and the automatic cover action: ${JSON.stringify(found)}`);
    assert.equal(new Set(found.map(item => item.left)).size, 1, `everything the picker holds starts on one line: ${JSON.stringify(found)}`);
    if (presentation === "sheet") {
      // In the sheet that line is the sheet bar's (its ✕), inside the sheet's edge, and the sheet's foot keeps its inset.
      const edges = await f.page.evaluate(() => { const sheet = document.querySelector("[data-picker-sheet]")!;
        const close = sheet.querySelector('[data-piece="toolbar"] button[data-action]')!, content = sheet.querySelector("[data-picker-content]")!;
        const last = [...content.querySelectorAll("[data-action]")].at(-1)!;
        return { sheet: sheet.getBoundingClientRect().left, close: close.getBoundingClientRect().left,
          foot: content.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom - content.scrollTop + (content.scrollHeight - content.clientHeight) }; });
      assert.ok(Math.abs(found[0]!.left - edges.close) <= 1, `the sheet's content starts on its bar's line: ${JSON.stringify({ found, edges })}`);
      assert.ok(edges.close - edges.sheet >= 4, `inside the sheet's edge: ${JSON.stringify(edges)}`);
      assert.ok(edges.foot >= 12, `the last action keeps the sheet's inset below it: ${JSON.stringify(edges)}`);
    }
    assert.deepEqual(f.errors.filter(error => !/Failed to load resource/.test(error)), []);
  } finally { await f.close(); }
});
