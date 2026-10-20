import test from "node:test";
import assert from "node:assert/strict";
import { basename } from "node:path";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { action, evidence, settle } from "./public-catalog-expectations.ts";

// A selected destination is a visual location indicator, not just aria-current.
// This expectation was added after independently spotting all-blue rows in v10,
// before any corrective production change. No particular accent color is fixed.
for (const width of [1100, 402]) {
  test(`${width}px navigation highlights only the current destination`, async () => {
    const fixture = await publicCatalogFixture();
    try {
      const { page } = fixture;
      await page.setViewportSize({ width, height: 874 });
      if (width < 960) await action(page, "Show navigation").click();
      const nav = page.getByRole("navigation", { name: "Main navigation", exact: true });
      await nav.waitFor(); await settle(page);
      const rows = await nav.getByRole("button").evaluateAll(elements => elements.map(element => ({
        name: element.getAttribute("aria-label"), current: element.getAttribute("aria-current"),
        background: getComputedStyle(element).backgroundColor,
      })));
      await evidence(page, `sidebar-${basename(process.env.DESERT_CATALOG_BUILD ?? "landmarks-web-v1")}-selection-${width}`, { rows });
      const selected = rows.filter(row => row.current === "page");
      assert.equal(selected.length, 1, "Exactly one destination must announce the current location");
      for (const row of rows.filter(row => row.current !== "page")) {
        assert.notEqual(row.background, selected[0]!.background,
          `${row.name} must not have the same selected fill as ${selected[0]!.name}`);
      }
    } finally { await fixture.close(); }
  });
}
