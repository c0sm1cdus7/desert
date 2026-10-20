import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { near, settle } from './public-catalog-expectations.ts';

// Exact default-size measures from surface-hierarchy-v1, not a new layout.
for (const colorScheme of ['light', 'dark'] as const) test(`v1 stack details and compound well: ${colorScheme}`, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 1000 });
    await f.page.emulateMedia({ colorScheme });
    await f.page.goto(`${f.origin}/?place=travel-kit`);
    await settle(f.page);
    const observed = await f.page.evaluate(() => {
      const stack = document.querySelector('[data-place-stack="pace"]')!;
      const title = stack.querySelector('.place-stack-title h2')!;
      const panel = stack.querySelector('[data-grouped-panel]')!;
      const titleStyle = getComputedStyle(title), titleBox = title.getBoundingClientRect(), paneBox = panel.getBoundingClientRect();
      const row = panel.querySelectorAll('[data-choice-row]')[1]!;
      const separator = getComputedStyle(row, '::before');
      const money = document.querySelector('[data-place-stack="budget"] [data-floating-field]')!;
      const moneyStyle = getComputedStyle(money);
      const ordinary = document.querySelector('[data-place-stack="visit"] [data-primitive="input.text"] [data-floating-field]')!;
      const description = document.querySelector('[data-place-stack="visit"] .place-stack-description')!;
      const stars = [...stack.querySelectorAll('.required')].filter(element => element.getBoundingClientRect().width > 1
        && !element.closest('.sr-only')).length;
      return {
        title: { size: parseFloat(titleStyle.fontSize), line: parseFloat(titleStyle.lineHeight), weight: titleStyle.fontWeight,
          inset: titleBox.left - paneBox.left, paneOffset: paneBox.top - titleBox.top, stars },
        optionalStars: document.querySelector('[data-place-stack="interests"] .place-stack-title .required') !== null,
        separator: { left: separator.left, right: separator.right, height: separator.height },
        descriptionInset: getComputedStyle(description).paddingInlineStart,
        money: { background: moneyStyle.backgroundColor, border: moneyStyle.borderTopWidth, radius: moneyStyle.borderRadius,
          shadow: moneyStyle.boxShadow, blur: moneyStyle.backdropFilter, width: money.getBoundingClientRect().width },
        pane: { background: getComputedStyle(panel).backgroundColor, width: paneBox.width },
        ordinaryBorder: getComputedStyle(ordinary).borderTopWidth,
      };
    });
    const directory = `artifacts/stack-reference-details/${process.env.DESERT_CATALOG_BUILD?.split('/').pop()}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/${colorScheme}.json`, JSON.stringify(observed, null, 2));
    near(observed.title.size, 13, 'Caption size', .1);
    near(observed.title.line, 18, 'Caption line height', .1);
    assert.equal(observed.title.weight, '400');
    near(observed.title.inset, 16, 'Caption inset', .1);
    near(observed.title.paneOffset, 24, 'Caption to pane', .1);
    assert.equal(observed.title.stars, 1, 'Required marker remains visible after duplicate legend is hidden');
    assert.equal(observed.optionalStars, false, 'Optional group does not gain a requirement');
    assert.deepEqual(observed.separator, { left: '40px', right: '16px', height: '1px' });
    assert.equal(observed.descriptionInset, '16px');
    assert.equal(observed.money.background, observed.pane.background);
    assert.equal(observed.money.border, '0px');
    assert.equal(observed.money.radius, '14px', 'The reference keeps the well radius, distinct from grouped lists');
    assert.equal(observed.money.shadow, 'none');
    assert.equal(observed.money.blur, 'none');
    near(observed.money.width, observed.pane.width, 'Money owns the full pane measure', .1);
    assert.equal(observed.ordinaryBorder, '1px', 'Unrelated input wells retain their boundary');
    await f.page.goto(`${f.origin}/?place=bank`);
    await settle(f.page);
    const standalone = await f.page.locator('[data-control="options"] > .options-title').evaluateAll(legends => legends.map(legend => {
      const style = getComputedStyle(legend);
      const pane = legend.parentElement!.querySelector('[data-grouped-panel]')!;
      const box = legend.getBoundingClientRect(), paneBox = pane.getBoundingClientRect();
      return { size: style.fontSize, line: style.lineHeight, weight: style.fontWeight,
        inset: box.left + parseFloat(style.paddingLeft) - paneBox.left, paneOffset: paneBox.top - box.top };
    }));
    assert.ok(standalone.length > 0, 'The bank exercises options without a same-label Stack');
    for (const legend of standalone) {
      assert.equal(legend.size, '13px'); assert.equal(legend.line, '18px'); assert.equal(legend.weight, '400');
      near(legend.inset, 16, 'Standalone option caption inset', .1);
      near(legend.paneOffset, 24, 'Standalone caption to pane', .1);
    }
  } finally { await f.close(); }
});
