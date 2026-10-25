import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

for (const width of [390, 1280]) test(`Travel kit option panes retain shape and selection at ${width}px`, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width, height: 1000 });
    await (await navigationAction(f.page, "Travel kit")).click();
    const groups = f.page.locator('[data-choice="rows"]');
    assert.equal(await groups.count(), 2);
    const directory = `artifacts/grouped-panel-material/${process.env.DESERT_CATALOG_BUILD?.split('/').pop()}`;
    await mkdir(directory, { recursive: true });
    const observations = [];
    for (const theme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme: theme });
      for (const group of await groups.all()) {
        const pane = group.locator('.material-pane');
        await pane.scrollIntoViewIfNeeded();
        assert.equal(await pane.count(), 1);
        assert.equal(await pane.locator('legend').count(), 0, "heading stays outside the options pane");
        const material = await pane.evaluate(element => {
          const style = getComputedStyle(element);
          return { blur: style.backdropFilter, border: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
            background: style.backgroundColor, image: style.backgroundImage, shadow: style.boxShadow, radius: parseFloat(style.borderTopLeftRadius),
            width: element.getBoundingClientRect().width, viewport: innerWidth };
        });
        // Owner-accepted v117/S1 supersedes v1's opaque borderless material.
        // The approved row geometry and transparent interior remain unchanged.
        assert.equal(material.blur, 'blur(24px)');
        assert.deepEqual(material.border, ['1px', '1px', '1px', '1px']);
        assert.equal(material.shadow, 'none'); assert.equal(material.image, 'none');
        assert.notEqual(material.background, 'rgba(0, 0, 0, 0)');
        assert.ok(material.radius > 0);
        assert.ok(material.width < material.viewport);
        const reading = await pane.locator('[data-choice-anatomy]').first().evaluate(element => {
          const style = getComputedStyle(element);
          return { top:style.paddingTop, left:style.paddingLeft, gap:style.gap,
            root:parseFloat(getComputedStyle(document.documentElement).fontSize) };
        });
        assert.equal(parseFloat(reading.top),reading.root*.75);
        assert.equal(parseFloat(reading.left),reading.root);
        assert.equal(parseFloat(reading.gap),reading.root*.75);
        observations.push({ theme, material });
      }
      const pace = groups.filter({ hasText: "Travel pace" });
      const exploring = pace.getByRole('radio', { name: 'Keep exploring', exact: true });
      await exploring.check(); assert.equal(await exploring.isChecked(), true);
      await exploring.press('ArrowUp');
      assert.equal(await pace.getByRole('radio', { name: 'Take it slowly', exact: true }).isChecked(), true);
      const walking = f.page.getByRole('checkbox', { name: 'Walking', exact: true });
      await walking.check(); assert.equal(await walking.isChecked(), true);
      await walking.press('Space'); assert.equal(await walking.isChecked(), false);
      await settle(f.page);
      await groups.filter({ hasText: 'Interests' }).screenshot({ path: `${directory}/${theme}-${width}.png` });
    }
    await writeFile(`${directory}/material-${width}.json`, JSON.stringify(observations, null, 2));
    await f.page.evaluate(() => { document.documentElement.style.setProperty('--text-scale', '2'); });
    assert.equal(await groups.evaluateAll(groups => groups.every(group => group.scrollWidth <= group.clientWidth + 1)), true,
      "larger text does not overflow the choice groups");
  } finally { await f.close(); }
});
