import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

for (const colorScheme of ["light", "dark"] as const) test(`frozen multiline wells count writing and remaining characters (${colorScheme})`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await (await navigationAction(page, "Component bank")).click();
    const find = page.getByRole("searchbox", { name: "Find component", exact: true });
    await find.fill("input.multiline");
    const empty = page.locator('[data-view-item="specimen:input.multiline:empty"]');
    const bounded = page.locator('[data-view-item="specimen:input.multiline:value"]');
    await empty.getByRole("textbox").fill("One 💡");
    assert.equal(await empty.locator("[data-character-counter]").innerText(), "5 characters");
    const editor = bounded.getByRole("textbox");
    await editor.fill("One 💡");
    assert.equal(await bounded.locator("[data-character-counter]").innerText(), "275 remaining");
    await editor.fill("a".repeat(281));
    assert.equal(await editor.inputValue(), "a".repeat(281));
    assert.equal(await bounded.locator("[data-character-counter]").innerText(), "1 over limit");
    await editor.fill("A thought worth keeping.\nWith room for another idea.");
    await find.fill("input.text"); await find.fill("input.multiline");
    assert.equal(await editor.inputValue(), "A thought worth keeping.\nWith room for another idea.");
    await mkdir("artifacts/textarea-counter/final", { recursive: true });
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await editor.scrollIntoViewIfNeeded(); await settle(page);
      const layout = await bounded.evaluate(element => {
        const well = element.querySelector('[data-floating-field]')!.getBoundingClientRect();
        const editor = element.querySelector('textarea')!.getBoundingClientRect();
        const counter = element.querySelector('[data-character-counter]')!.getBoundingClientRect();
        return { below: counter.top >= editor.bottom, inside: counter.bottom <= well.bottom && counter.right <= well.right };
      });
      assert.deepEqual(layout, { below: true, inside: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `artifacts/textarea-counter/final/catalog-${colorScheme}-${width}.png`, animations: "disabled" });
    }
    await (await navigationAction(page, "Travel kit")).click();
    const notes = page.getByRole("textbox", { name: "Things to remember", exact: true });
    await notes.fill("Remember 💡");
    const description = await notes.getAttribute("aria-describedby");
    assert.ok(description);
    assert.equal(await page.locator(`[id="${description}"]`).innerText(), "10 characters");
  } finally { await f.close(); }
});
