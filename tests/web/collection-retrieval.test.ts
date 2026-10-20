import test from "node:test";
import assert from "node:assert/strict";
import { browserFixture, settleMotion } from "./fixture.ts";

async function populatedCollection() {
  const f = await browserFixture();
  try {
    for (const title of ["Zulu public", "Alpha public"]) {
      const run = await f.session.begin("create-note");
      const prepared = await f.session.prepare(run.id, { title, body: `detail-only-needle for ${title}` });
      await f.session.accept(prepared.id, prepared.confirmationDigest);
    }
    await f.page.reload();
    await f.page.locator(".record-button").nth(1).waitFor();
    return f;
  } catch (error) { await f.close(); throw error; }
}

test("loaded collection retrieval stays local and never searches separately loaded detail", { timeout: 30000 }, async () => {
  const f = await populatedCollection();
  try {
    const pane = f.page.locator("[data-collection-pane]");
    const search = pane.getByRole("searchbox", { name: "Search loaded records", exact: true });
    await pane.getByText("Sorted by Title · ascending", { exact: true }).waitFor();
    assert.deepEqual(await pane.locator(".record-button strong").allTextContents(), ["Alpha public", "Zulu public"]);
    const operations: string[] = [];
    f.page.on("request", request => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith("/api/") && path !== "/api/availability") operations.push(path);
    });
    await search.fill("  ZULU  ");
    assert.deepEqual(await pane.locator(".record-button strong").allTextContents(), ["Zulu public"]);
    const clear = pane.getByRole("button", { name: "Clear search", exact: true });
    assert.equal(await clear.getAttribute("data-slot"), "button");
    assert.equal(await clear.evaluate(element => !!element.closest("[data-search-field]")), true);
    await search.press("Enter");
    assert.equal(operations.length, 0, "search and Enter do not enter a product journey");
    assert.equal(await f.page.getByRole("region", { name: "Object context", exact: true }).count(), 0);
    await pane.getByRole("button", { name: /Zulu public/ }).click();
    const context = f.page.getByRole("region", { name: "Object context", exact: true });
    await context.getByText("detail-only-needle for Zulu public", { exact: true }).waitFor();
    assert.ok(operations.includes("/api/read"), "explicit selection still uses its admitted read");
    operations.length = 0;
    await search.fill("detail-only-needle");
    await pane.getByRole("heading", { name: "No matching records.", exact: true }).waitFor();
    assert.equal(await pane.locator(".record-button").count(), 0);
    assert.equal(await clear.evaluate(element => !!element.closest("[data-search-field]")), true,
      "empty-result recovery stays in the same shared search accessory");
    assert.equal(await context.getByRole("heading", { name: "Zulu public", exact: true }).isVisible(), true,
      "filtering does not replace or clear the reading context");
    await pane.getByRole("button", { name: "Clear search", exact: true }).click();
    assert.equal(await search.inputValue(), "");
    assert.equal(await pane.locator('[aria-current="true"] strong').textContent(), "Zulu public");
    assert.equal(operations.length, 0, "filtering and clearing neither refresh nor execute records");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("selected collection row remains visually distinct after pointer and keyboard focus leave", { timeout: 30000 }, async () => {
  const f = await populatedCollection();
  try {
    const pane = f.page.locator("[data-collection-pane]");
    const selected = pane.getByRole("button", { name: /Alpha public/ });
    const other = pane.getByRole("button", { name: /Zulu public/ });
    await selected.click();
    await f.page.getByRole("region", { name: "Object context", exact: true }).waitFor();
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme });
      await f.page.mouse.move(0, 0);
      await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).focus();
      await settleMotion(f.page);
      assert.equal(await selected.getAttribute("aria-current"), "true");
      assert.equal(await selected.evaluate(element => element.matches(":hover,:focus-visible")), false);
      const currentBackground = await selected.evaluate(element => getComputedStyle(element).backgroundColor);
      const otherBackground = await other.evaluate(element => getComputedStyle(element).backgroundColor);
      assert.notEqual(currentBackground, otherBackground, `persistent selected background differs in ${colorScheme}`);
      assert.notEqual(currentBackground, "rgba(0, 0, 0, 0)", "selection is not a transparent focus-only affordance");
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("loaded-local retrieval uses the shared search field and fits compact collection widths", { timeout: 30000 }, async () => {
  const f = await populatedCollection();
  try {
    const pane = f.page.locator("[data-collection-pane]");
    const search = pane.getByRole("searchbox", { name: "Search loaded records", exact: true });
    assert.equal(await search.evaluate(element => element.closest("[data-search-field]") !== null), true);
    for (const width of [390, 320]) {
      await f.page.setViewportSize({ width, height: 740 });
      await search.fill("not-a-loaded-record");
      await pane.getByRole("heading", { name: "No matching records.", exact: true }).waitFor();
      const bounds = await search.boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width);
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await pane.getByRole("button", { name: "Clear search", exact: true }).click();
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
