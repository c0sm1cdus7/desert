import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { activePanel, panelToolbar, settleMotion, waitForNote } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

test("shared transient and form surfaces preserve their declared toolbar slots and padded scroll body", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await openCatalog(f.page);
    for (const width of [1280, 390]) {
      await f.page.setViewportSize({ width, height: 844 });
      await f.page.locator('[data-view-item="specimen:transient:open"]').getByRole("button").click();
      const dialog = f.page.getByRole("dialog");
      await dialog.waitFor();
      await settleMotion(f.page);
      const geometry = await dialog.evaluate(node => {
        const top = node.querySelector('[data-surface-slot="top"]')!;
        const body = node.querySelector('[data-surface-slot="content"]')!;
        const bottom = node.querySelector('[data-surface-slot="bottom"]');
        return { title: top.textContent, top: top.getBoundingClientRect().height,
          padding: parseFloat(getComputedStyle(body).paddingLeft),
          gap: bottom ? node.getBoundingClientRect().bottom - bottom.getBoundingClientRect().bottom : null,
          bottom: bottom?.getBoundingClientRect().top, contentBottom: body.getBoundingClientRect().bottom,
          paneBottom: node.getBoundingClientRect().bottom };
      });
      assert.ok(geometry.title && geometry.top >= 44);
      assert.ok(geometry.padding >= 20);
      assert.equal(geometry.bottom, undefined, "read-only transient has no redundant bottom dismissal");
      assert.ok(geometry.contentBottom <= geometry.paneBottom + 1);
      await mkdir("artifacts/typed-bank", { recursive: true });
      await f.page.screenshot({ path: `artifacts/typed-bank/drawer-${width}.png` });
      await dialog.locator('[data-surface-slot="top"]').getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
    }
    await f.page.setViewportSize({ width: 1280, height: 900 }); await settleMotion(f.page);
    await f.page.getByRole("button", { name: "Notes", exact: true }).click();
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    await f.page.setViewportSize({ width: 390, height: 844 }); await settleMotion(f.page);
    const form = activePanel(f.page);
    const input = (await form.locator("textarea").boundingBox())!;
    const footer = (await form.locator('[data-surface-slot="bottom"]').boundingBox())!;
    const pane = (await form.boundingBox())!;
    assert.ok(pane.y + pane.height - footer.y - footer.height <= 2, "short input keeps the footer anchored to the surface bottom");
    assert.ok(footer.y - input.y - input.height >= 20, "content retains its bottom padding");
    const well = form.locator('[data-floating-field]').first();
    await well.hover();
    assert.equal(await well.evaluate(node => getComputedStyle(node).overflow), "hidden");
    await f.page.screenshot({ path: "artifacts/typed-bank/form-mobile.png" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("long reading scrolls inside its adaptive surface without moving chrome at 200 percent text scale", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Long writing");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("A line of writing.\n".repeat(80));
    await panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true }).click();
    await waitForNote(f.page, "Long writing");
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
    const context = activePanel(f.page);
    await settleMotion(f.page);
    const header = context.locator('[data-surface-slot="top"]');
    const back = header.getByRole("button", { name: "Close", exact: true });
    await back.scrollIntoViewIfNeeded();
    const before = (await header.boundingBox())!;
    assert.equal(await context.locator('[data-surface-slot="bottom"]').count(), 0);
    const scrolls = await context.locator('[data-surface-slot="content"]').evaluate(element => {
      element.scrollTop = element.scrollHeight;
      return element.scrollHeight > element.clientHeight && element.scrollTop > 0;
    });
    assert.equal(scrolls, true);
    assert.ok(Math.abs((await header.boundingBox())!.y - before.y) <= 1,
      "surface viewport scroll preserves the toolbar's fixed location");
    assert.equal(await f.page.evaluate(() => scrollY), 0, "the workspace itself never needs document scrolling");
    assert.equal(await context.getByRole("button", { name: "Archive note", exact: true }).isVisible(), true);
    await back.scrollIntoViewIfNeeded();
    const after = (await back.boundingBox())!;
    assert.ok(after.y >= 0 && after.y + after.height <= 844, "Back remains reachable after long reading");
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await f.page.screenshot({ path: "artifacts/typed-bank/long-context-200.png" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
