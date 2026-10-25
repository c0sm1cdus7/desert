// Field's trailing accessory (law 9d: one curvature family, concentric radii): the action a caller places in the well
// (the lock screen's unlock) sits inside the well with the same inset from its top, end and bottom edges, and its radius
// is the well's less that inset. And a shown placeholder (the money amount's «0,00») keeps the label above it.
import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import LockScreen from "@desert/svelte/catalog/compositions/lock-screen/LockScreen.svelte";
  import Field from "@desert/svelte/catalog/foundations/field/Field.svelte";
</script>
<LockScreen profile={{ login: "sample-identity", displayName: "Sample identity", avatarSeed: "0011223344556677" }} onsubmit={async () => {}} />
<div data-case="placeholder"><Field primitive="input.text" label="Amount" labelVisibility="visible" required={false} invalid={false} disabled={false}
  measure="amount" purpose="text" value="" placeholder="0,00" clear={false} /></div>
<div data-case="empty"><Field primitive="input.text" label="Title" labelVisibility="visible" required={false} invalid={false} disabled={false}
  measure="writing" purpose="text" value="" clear={false} /></div>`;

test("the accessory sits concentric inside the well: equal inset on top, end and bottom, radius = well radius − inset", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    for (const [width, scale] of [[390, "1"], [1280, "1"], [390, "2"]] as const) {
      await f.page.setViewportSize({ width, height: 900 });
      await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", value), scale);
      const geometry = await f.page.evaluate(() => {
        const well = document.querySelector('input[autocomplete="current-password"]')!.closest(".field-well")!;
        const action = well.querySelector("[data-action]")!;
        const w = well.getBoundingClientRect(), a = action.getBoundingClientRect();
        return { top: a.top - w.top, end: w.right - a.right, bottom: w.bottom - a.bottom, width: a.width, height: a.height,
          wellRadius: parseFloat(getComputedStyle(well).borderTopRightRadius), radius: parseFloat(getComputedStyle(action).borderTopRightRadius),
          inset: parseFloat(getComputedStyle(action).getPropertyValue("--field-accessory-inset")) };
      });
      const label = `${width}px, text ×${scale} ${JSON.stringify(geometry)}`;
      assert.ok(geometry.inset > 1, `${label}: the accessory is inset, not flush against the well's border`);
      for (const side of ["top", "end", "bottom"] as const)
        assert.ok(Math.abs(geometry[side] - geometry.inset) <= 0.5, `${label}: ${side} inset ${geometry[side]} = ${geometry.inset}`);
      assert.ok(Math.abs(geometry.width - geometry.height) <= 0.5, `${label}: a square`);
      assert.ok(geometry.height >= 44 - 0.5, `${label}: still a 44px target`);
      assert.ok(Math.abs(geometry.radius - (geometry.wellRadius - geometry.inset)) <= 0.5,
        `${label}: radius ${geometry.radius} = ${geometry.wellRadius} − ${geometry.inset} (concentric)`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a shown placeholder keeps the label above the editor line; an empty field without one rests its label on the line", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.setViewportSize({ width: 390, height: 900 });
    const overlap = (name: string) => f.page.locator(`[data-case="${name}"]`).evaluate(node => {
      const label = node.querySelector('[data-slot="field-label"]')!.getBoundingClientRect(), input = node.querySelector("input")!;
      const style = getComputedStyle(input), line = input.getBoundingClientRect();
      const text = { top: line.top + parseFloat(style.paddingTop), bottom: line.bottom - parseFloat(style.paddingBottom) };
      return label.bottom > text.top + 1 && label.top < text.bottom - 1;
    });
    assert.equal(await overlap("placeholder"), false, "the label «Amount» never draws over «0,00»");
    assert.equal(await overlap("empty"), true, "without a placeholder the empty line shows the label in its place");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
