import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { browserFixture, settleMotion } from "./fixture.ts";

test("catalog drawers own visible top, padded scroll body and bottom-anchored toolbar", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    for (const width of [1280, 390]) {
      await f.page.setViewportSize({ width, height: 844 });
      await f.page.locator('[data-specimen="collection:records"]').getByRole("button").click();
      const dialog = f.page.getByRole("dialog");
      await dialog.waitFor();
      await settleMotion(f.page);
      const geometry = await dialog.evaluate(node => {
        const top = node.querySelector('[data-surface-slot="top"]')!;
        const body = node.querySelector('[data-surface-slot="content"]')!;
        const bottom = node.querySelector('[data-surface-slot="bottom"]')!;
        return { title: top.textContent, top: top.getBoundingClientRect().height,
          padding: parseFloat(getComputedStyle(body).paddingLeft),
          gap: node.getBoundingClientRect().bottom - bottom.getBoundingClientRect().bottom,
          bottom: bottom.getBoundingClientRect().top, contentBottom: body.getBoundingClientRect().bottom };
      });
      assert.ok(geometry.title && geometry.top >= 44);
      assert.ok(geometry.padding >= 20);
      assert.ok(geometry.gap <= 2, "short content never pulls the footer away from the bottom");
      assert.ok(geometry.contentBottom <= geometry.bottom + 1);
      await mkdir("artifacts/typed-bank", { recursive: true });
      await f.page.screenshot({ path: `artifacts/typed-bank/drawer-${width}.png` });
      await dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
    }
    const form = f.page.locator('[data-specimen="form:ready"]');
    const input = (await form.locator("textarea").boundingBox())!;
    const footer = (await form.locator('[data-surface-slot="bottom"]').boundingBox())!;
    assert.ok(footer.y - input.y - input.height >= 20, "content retains its bottom padding");
    const well = form.locator('[data-floating-field]').first();
    await well.hover();
    assert.equal(await well.evaluate(node => getComputedStyle(node).overflow), "hidden");
    await f.page.screenshot({ path: "artifacts/typed-bank/form-mobile.png" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("long nonmodal reading scrolls in the document at 200 percent text scale", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Long writing");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("A line of writing.\n".repeat(80));
    await f.page.locator("form").getByRole("button", { name: "Create note", exact: true }).click();
    await f.page.getByRole("region", { name: "Object context", exact: true }).waitFor();
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
    const context = f.page.getByRole("region", { name: "Object context", exact: true });
    await f.page.getByRole("dialog").waitFor({ state: "hidden" });
    await settleMotion(f.page);
    const header = context.locator('[data-surface-slot="top"]');
    const back = header.getByRole("button", { name: "Back", exact: true });
    await back.scrollIntoViewIfNeeded();
    const before = (await header.boundingBox())!;
    assert.equal(await context.locator('[data-surface-slot="bottom"]').count(), 0);
    const scrolls = await f.page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      return document.documentElement.scrollHeight > innerHeight && scrollY > 0;
    });
    assert.equal(scrolls, true);
    assert.ok((await header.boundingBox())!.y < before.y, "reading header participates in document flow, not fixed drawer chrome");
    assert.equal(await context.getByRole("button", { name: "Archive note", exact: true }).isVisible(), true);
    await back.scrollIntoViewIfNeeded();
    const after = (await back.boundingBox())!;
    assert.ok(after.y >= 0 && after.y + after.height <= 844, "Back remains reachable after long reading");
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await f.page.screenshot({ path: "artifacts/typed-bank/long-context-200.png" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
