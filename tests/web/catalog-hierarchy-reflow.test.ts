import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

test("catalog hierarchy reflows, retains search return, and uses accessible contrast", async () => {
  const f = await publicCatalogFixture();
  const directory = `artifacts/catalog-hierarchy/${process.env.DESERT_CATALOG_BUILD?.split("/").pop()}`;
  await mkdir(directory, { recursive: true });
  try {
    const { page } = f;
    await (await navigationAction(page, "Component bank")).click();
    const measurements: unknown[] = [];
    const failures: unknown[] = [];
    for (const colorScheme of ["light", "dark"] as const) for (const width of [320, 1280]) for (const scale of [1, 2]) {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 950 });
      await page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      const find = page.getByRole("searchbox", { name: "Find component", exact: true });
      await find.fill("collection");
      const component = page.getByRole("heading", { name: "Collection", exact: true });
      await component.scrollIntoViewIfNeeded();
      await settle(page);
      const geometry = await page.locator('[data-catalog-entry="collection"]').evaluate(element => {
        const header = element.querySelector(':scope > header')!;
        const title = header.querySelector("h2")!.getBoundingClientRect();
        const metadata = header.querySelector("code")!.getBoundingClientRect();
        return { scrollWidth: element.scrollWidth, width: element.clientWidth,
          titleBottom: title.bottom, metadataTop: metadata.top,
          documentWidth: document.documentElement.scrollWidth, viewport: innerWidth,
          overflow: [...element.querySelectorAll('*')].filter(child => child.getBoundingClientRect().right > element.getBoundingClientRect().right + 1)
            .slice(0, 8).map(child => ({ tag: child.tagName, class: child.className, text: child.textContent?.slice(0, 100), width: child.getBoundingClientRect().width })) };
      });
      if (geometry.scrollWidth > geometry.width + 1 || geometry.titleBottom > geometry.metadataTop
        || geometry.documentWidth > geometry.viewport) failures.push({ colorScheme, width, scale, geometry });
      const accessibility = await new AxeBuilder({ page }).include('[data-public-catalog-bank]')
        .include('[data-catalog-content] > [data-place-header]')
        .withRules(["color-contrast", "heading-order", "link-name", "label"]).analyze();
      if (accessibility.violations.length) failures.push({ colorScheme, width, scale, violations: accessibility.violations });
      await page.screenshot({ path: `${directory}/collection-${colorScheme}-${width}-${scale}x.png` });
      measurements.push({ colorScheme, width, scale, geometry, violations: accessibility.violations });
      const recordsSearch = page.getByRole('searchbox', { name: 'Search loaded records', exact: true });
      for (let attempt = 0; attempt < 12 && !await recordsSearch.evaluate(element => element === document.activeElement); attempt++)
        await page.keyboard.press('Tab');
      assert.ok(await recordsSearch.evaluate(element => element === document.activeElement), 'Native Tab reaches the collection search');
      for (let attempt = 0; attempt < 12 && !await find.evaluate(element => element === document.activeElement); attempt++)
        await page.keyboard.press('Shift+Tab');
      assert.equal(await find.evaluate(element => element === document.activeElement), true);
      await find.fill("");
    }
    await writeFile(`${directory}/reflow.json`, JSON.stringify(measurements, null, 2));
    assert.deepEqual(failures, [], 'All appearances/sizes retain reflow, hierarchy, contrast and accessible names; see reflow.json');
  } finally { await f.close(); }
});

// Independent sizing expectations: normal controls have readable measures,
// not a stretched specimen-column width; large text fits its narrow container.
for (const { width, scale } of [{ width: 1280, scale: 1 }, { width: 320, scale: 2 }]) {
  test(`control measures remain bounded at ${width}px / ${scale * 100}% text`, async () => {
    const f = await publicCatalogFixture();
    try {
      const { page } = f;
      await page.setViewportSize({ width, height: 950 });
      await (await navigationAction(page, 'Component bank')).click();
      await page.evaluate(value => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
      await settle(page);
      const families = [
        { selector: '[data-primitive="action"]', maximum: 352 },
        { selector: '[data-primitive="input.text"], [data-primitive="input.multiline"], [data-control="money"], [data-control="date"], [data-control="select"], [data-control="files"]', maximum: 512 },
        { selector: '[data-control="options"]', maximum: 576 },
      ];
      const measurements: unknown[] = [];
      for (const family of families) {
        const controls = page.locator('[data-public-catalog-bank]').locator(family.selector);
        const rows = await controls.evaluateAll(elements => elements.filter(element => element.checkVisibility()).map(element => {
          const rect = element.getBoundingClientRect(), parent = element.parentElement!.getBoundingClientRect();
          return { identity: element.getAttribute('data-primitive') ?? element.getAttribute('data-control'),
            x: rect.x, right: rect.right, width: rect.width, parentX: parent.x, parentWidth: parent.width,
            scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
        }));
        assert.ok(rows.length > 0, `The ${family.selector} family is actually exercised`);
        for (const row of rows) {
          assert.ok(row.width <= family.maximum * scale + 1, `Control has a bounded readable measure: ${JSON.stringify(row)}`);
          assert.ok(row.right <= width + 1 && row.x >= -1, `Control stays inside viewport: ${JSON.stringify(row)}`);
          assert.ok(row.scrollWidth <= row.clientWidth + 1, `Control has no horizontal overflow: ${JSON.stringify(row)}`);
          // Hero actions deliberately center within imagery; field/list controls
          // still align to the leading edge of their semantic group.
          if (width === 1280 && row.identity !== 'action') assert.ok(Math.abs(row.x - row.parentX) <= 1, `Control is leading-aligned: ${JSON.stringify(row)}`);
        }
        measurements.push({ family: family.selector, rows });
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal document overflow');
      const viewport = await page.locator('[data-catalog-scroll]').evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
      assert.ok(viewport.scroll <= viewport.width + 1, `The complete bank introduces no hidden horizontal viewport scroll: ${JSON.stringify(viewport)}`);
      const directory = `artifacts/catalog-hierarchy/${process.env.DESERT_CATALOG_BUILD?.split('/').pop()}`;
      await mkdir(directory, { recursive: true });
      await writeFile(`${directory}/control-measures-${width}-${scale}x.json`, JSON.stringify(measurements, null, 2));
    } finally { await f.close(); }
  });
}
