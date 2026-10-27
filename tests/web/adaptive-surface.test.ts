import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settleMotion } from './fixture.ts';

test('a roomy catalog reserves a right pane without modal ownership', async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 2000, height: 900 });
    await f.page.goto(`${f.origin}/?place=bank`);
    const opener = f.page.locator('[data-view-item="entry:transient"] button').first();
    await opener.click(); await settleMotion(f.page);
    const pane = f.page.locator('[data-composition="transient"]');
    assert.equal(await pane.getAttribute('role'), 'region');
    assert.equal(await pane.getAttribute('aria-modal'), null);
    assert.equal(await pane.getAttribute('data-presentation'), 'docked');
    assert.ok(Math.abs((await pane.boundingBox())!.width - 576) < 1);
    await f.page.getByRole('button', { name: 'Search', exact: true }).click();
    await f.page.waitForFunction(() => document.querySelector('[data-catalog-workspace]')?.getAttribute('data-search-active') === 'true');
    await settleMotion(f.page);
    assert.equal(await pane.isVisible(), true, 'opening background search preserves the docked task');
    await f.page.keyboard.press('Escape');
    assert.equal(await f.page.locator('[data-catalog-workspace]').getAttribute('data-search-active'), 'false', 'docked panel must not consume background search Escape');
    assert.equal(await pane.isVisible(), true);
    await f.page.getByRole('button', { name: 'Travel kit', exact: true }).click();
    assert.equal(await f.page.locator('[data-catalog-content]').getAttribute('data-destination'), 'travel-kit');
  } finally { await f.close(); }
});

test('a right transient keeps its readable pane width before docking is possible', async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 700, height: 900 });
    await f.page.goto(`${f.origin}/?place=bank`);
    await f.page.locator('[data-view-item="entry:transient"] button').first().click();
    await settleMotion(f.page);
    const pane = f.page.locator('[data-composition="transient"]');
    assert.equal(await pane.getAttribute('data-edge'), 'right');
    assert.equal(await pane.getAttribute('aria-modal'), 'true');
    assert.ok(Math.abs((await pane.boundingBox())!.width - 576) < 1);
  } finally { await f.close(); }
});
