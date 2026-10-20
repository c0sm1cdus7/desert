import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle, textStyle } from "./public-catalog-expectations.ts";

// Relative hierarchy is the requirement; these tests do not copy token values.
for (const width of [390, 1280]) test(`bank hierarchy remains distinct at ${width}px and enlarged text`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width, height: 1000 });
    await (await navigationAction(page, "Component bank")).click();
    for (const scale of [1, 2]) {
      await page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
      await page.locator('[data-catalog-scroll]').evaluate(element => element.scrollTop = 0);
      await settle(page);
      const bank = page.locator("[data-public-catalog-bank]");
      const header = page.locator('[data-catalog-content] > [data-place-header]');
      const title = header.getByRole("heading", { name: "Component bank", exact: true });
      const pageTitle = await textStyle(title);
      // The same title now condenses through an ancestor transform. Hierarchy
      // concerns its painted text size, not the untransformed compact base.
      const paintedScale = await title.evaluate(element => {
        let scale = 1;
        for (let node: Element | null = element; node; node = node.parentElement) {
          const matrix = new DOMMatrix(getComputedStyle(node).transform);
          scale *= Math.hypot(matrix.a, matrix.b);
        }
        return scale;
      });
      const component = await textStyle(bank.getByRole("heading", { name: "Text input", exact: true }));
      const state = await textStyle(bank.locator('[data-specimen="input.text:value"] > p'));
      const field = await textStyle(bank.locator('[data-specimen="input.text:value"] input'));
      const folder = `artifacts/catalog-hierarchy/${process.env.DESERT_CATALOG_BUILD?.split("/").pop()}`;
      await mkdir(folder, { recursive: true });
      await page.screenshot({ path: `${folder}/${width}-${scale}x.png` });
      assert.ok(pageTitle.size * paintedScale > component.size, "painted page title outranks component");
      for (const name of ['Foundations', 'Controls', 'Compositions', 'Product examples'])
        assert.equal(await bank.getByRole('heading', { level:2,name,exact:true }).count(), 1, 'Canonical discovery groups own the outline without another renderer taxonomy');
      for (const name of ['Primitives', 'Typed control bench'])
        assert.equal(await bank.getByRole('heading', {name,exact:true}).count(),0);
      assert.ok(component.size > state.size, "component outranks specimen metadata");
      assert.ok(field.size > state.size, "the real editor is not shrunk to metadata size");
      const componentHeader = bank.locator('[data-catalog-entry="input.text"] > header');
      assert.equal(await componentHeader.getByRole('heading', { level: 3, name: 'Text input', exact: true }).count(), 1);
      assert.equal(await componentHeader.locator('code').innerText(), 'input.text');
      assert.equal(await bank.locator('[data-specimen-group="input.text"] > header').count(), 0,
        'Component identity belongs outside its content pane');
    }
  } finally { await f.close(); }
});

test("missing specimens are catalog annotations, not product empty states", async () => {
  const f = await publicCatalogFixture();
  try {
    await (await navigationAction(f.page, "Component bank")).click();
    const specimen = f.page.locator('[data-specimen="collection:empty"]');
    assert.equal(await specimen.locator('[data-slot="empty"]').count(), 0,
      "an unavailable specimen must not pretend to demonstrate an empty collection");
    assert.match(await specimen.textContent() ?? "", /Execution adapter required/);
    assert.match(await specimen.textContent() ?? "", /no create operation/);
    const explanation = await textStyle(specimen.getByText("Execution adapter required", { exact: true }));
    const title = await textStyle(f.page.getByRole("heading", { name: "Collection", exact: true }));
    assert.ok(explanation.size < title.size, "catalog limitations remain subordinate to component headings");
  } finally { await f.close(); }
});

test("collection guidance is subordinate to the records it describes", async () => {
  const f = await publicCatalogFixture();
  try {
    await (await navigationAction(f.page, "Component bank")).click();
    const specimen = f.page.locator('[data-specimen="collection:records"]');
    const record = await textStyle(specimen.getByRole("button", { name: "Alps", exact: true }));
    for (const text of [/Only loaded collection/, /Sorted by/]) {
      assert.ok((await textStyle(specimen.getByText(text))).size < record.size,
        "search scope and sorting are metadata, not record content");
    }
  } finally { await f.close(); }
});

// Independent reading budget: at the narrowest/shortest reviewed capacity and
// enlarged text, persistent chrome must leave most of the viewport for content.
// This 45% ceiling is a product regression criterion, not an Apple HIG number.
for (const place of ['bank', 'travel-kit']) test(`${place} compact toolbar preserves a reading window at320x568/200%`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`${f.origin}/?place=${place}`);
    await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '2'));
    await settle(page);
    await page.locator('[data-catalog-scroll]').evaluate(element => element.scrollTop = 500);
    await settle(page);
    const geometry = await page.evaluate(() => {
      const header = document.querySelector('[data-catalog-content] > [data-place-header]')!;
      const bounds = header.getBoundingClientRect();
      const title = header.querySelector('[data-place-title]')!;
      const pairs = [...header.querySelectorAll('button')].filter(action => action.checkVisibility()).map(action => {
        const range = document.createRange(); range.selectNodeContents(title);
        const actionBounds = action.getBoundingClientRect();
        const glyphs = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
        return { text: title.textContent, action: actionBounds.toJSON(), glyphs: glyphs.map(rect => rect.toJSON()),
          overlaps: glyphs.some(rect => rect.left < actionBounds.right && rect.right > actionBounds.left
            && rect.top < actionBounds.bottom && rect.bottom > actionBounds.top) };
      });
      return { height: bounds.height, available: innerHeight, condensed: header.getAttribute('data-header-condensed'), pairs };
    });
    const directory = `artifacts/catalog-hierarchy/${process.env.DESERT_CATALOG_BUILD?.split('/').pop()}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/${place}-compact-reading.json`, JSON.stringify(geometry, null, 2));
    await page.screenshot({ path: `${directory}/${place}-compact-reading.png` });
    assert.equal(geometry.condensed, 'true', 'The test exercises the completed compact state');
    assert.ok(geometry.height <= geometry.available * .45,
      `Compact chrome leaves at least55% for reading: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.pairs.length >= 1, 'The persistent toolbar action is exercised');
    assert.ok(geometry.pairs.every(pair => !pair.overlaps), 'No place title glyph overlaps its toolbar accessories');
  } finally { await f.close(); }
});
