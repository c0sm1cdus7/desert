import test from "node:test";
import assert from "node:assert/strict";
import { activePanel, browserFixture, panelToolbar, settleMotion, waitForNote } from "./fixture.ts";

async function populatedCollection() {
  const f = await browserFixture();
  try {
    for (const title of ["Zulu public", "Alpha public"]) {
      const run = await f.session.begin("create-note");
      const prepared = await f.session.prepare(run.id, { title, body: `detail-only-needle for ${title}` });
      await f.session.accept(prepared.id, prepared.confirmationDigest);
    }
    await f.page.reload();
    await f.page.locator('[data-row-leading="attention"]').nth(1).waitFor();
    return f;
  } catch (error) { await f.close(); throw error; }
}

test("toolbar search stays local to published collection fields, even after loading private detail", { timeout: 30000 }, async () => {
  const f = await populatedCollection();
  try {
    const rows = f.page.locator('[data-row-leading="attention"] .row-label');
    assert.deepEqual(await rows.allTextContents(), ["Alpha public", "Zulu public"]);
    assert.equal(await f.page.getByRole("searchbox").count(), 0, "no inline collection search is exposed");
    assert.equal(await f.page.getByText("Sorted by Title · ascending", { exact: true }).count(), 0);
    const operations: string[] = [];
    f.page.on("request", request => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith("/api/") && path !== "/api/availability") operations.push(path);
    });
    await f.page.getByRole("button", { name: "Search", exact: true }).click();
    const search = f.page.getByRole("searchbox", { name: "Search read notes", exact: true });
    const results = f.page.getByRole("region", { name: "Search in Read notes", exact: true });
    await search.fill("  ZULU  ");
    await results.getByRole("button", { name: /Zulu public/ }).waitFor();
    assert.equal(await results.getByRole("button", { name: /Alpha public/ }).count(), 0);
    assert.deepEqual(await rows.allTextContents(), ["Alpha public", "Zulu public"], "overlay retrieval never filters the surface underneath");
    const clear = f.page.getByRole("button", { name: "Clear search", exact: true });
    assert.equal(await clear.getAttribute("data-slot"), "button");
    assert.equal(await clear.evaluate(element => !!element.closest("[data-search-field]")), true);
    await search.press("Enter");
    assert.equal(operations.length, 0, "query editing and Enter never execute a product operation");
    await results.getByRole("button", { name: /Zulu public/ }).click();
    await waitForNote(f.page, "Zulu public");
    await activePanel(f.page).getByText("detail-only-needle for Zulu public", { exact: true }).waitFor();
    assert.ok(operations.includes("/api/read"), "selection uses the admitted read journey");
    await panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true }).click();
    await activePanel(f.page).waitFor({ state: "hidden" });
    await f.page.getByRole("button", { name: "Search", exact: true }).click();
    operations.length = 0;
    await search.fill("detail-only-needle");
    await results.getByText("No matching results", { exact: true }).waitFor();
    assert.equal(await results.getByRole("button").count(), 0, "separately read detail never expands collection search authority");
    await clear.click();
    assert.equal(await search.inputValue(), "");
    assert.equal(operations.length, 0, "clearing neither refreshes nor executes records");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("selected row remains distinct after pointer and keyboard focus leave the docked object", { timeout: 30000 }, async () => {
  const f = await populatedCollection();
  try {
    await f.page.setViewportSize({ width: 1600, height: 1000 });
    const selected = f.page.getByRole("button", { name: /Alpha public/ });
    const other = f.page.getByRole("button", { name: /Zulu public/ });
    await selected.click(); await waitForNote(f.page, "Alpha public");
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme }); await f.page.mouse.move(0, 0);
      await panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true }).focus();
      await settleMotion(f.page);
      assert.equal(await selected.getAttribute("aria-current"), "true");
      assert.equal(await selected.evaluate(element => element.matches(":hover,:focus-visible")), false);
      const currentBackground = await selected.evaluate(element => getComputedStyle(element).backgroundColor);
      const otherBackground = await other.evaluate(element => getComputedStyle(element).backgroundColor);
      assert.notEqual(currentBackground, otherBackground, `persistent selection differs in ${colorScheme}`);
      assert.notEqual(currentBackground, "rgba(0, 0, 0, 0)");
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("toolbar overlay retrieval uses the shared search field at compact widths", { timeout: 30000 }, async () => {
  const f = await populatedCollection();
  try {
    await f.page.getByRole("button", { name: "Search", exact: true }).click();
    const search = f.page.getByRole("searchbox", { name: "Search read notes", exact: true });
    assert.equal(await search.evaluate(element => !!element.closest("[data-search-field]")), true);
    for (const width of [390, 320]) {
      await f.page.setViewportSize({ width, height: 740 }); await search.fill("not-a-loaded-record");
      await f.page.getByText("No matching results", { exact: true }).waitFor(); await settleMotion(f.page);
      const bounds = await search.boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width);
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await f.page.getByRole("button", { name: "Clear search", exact: true }).click();
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
