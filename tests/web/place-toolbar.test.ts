import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle, evidence } from "./public-catalog-expectations.ts";

for (const width of [390, 1280]) test(`place heading hands off to the top toolbar at ${width}px`, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width, height: 840 });
    await (await navigationAction(f.page, 'Travel kit')).click();
    const toolbar = f.page.locator('[data-catalog-place-toolbar]');
    await toolbar.waitFor();
    const title = toolbar.locator('[data-catalog-toolbar-title]');
    assert.equal(await title.getAttribute('data-condensed'), 'false');
    const viewport = f.page.locator('[data-catalog-scroll]');
    await viewport.evaluate(element => { element.scrollTop = 320; });
    await f.page.waitForFunction(() => document.querySelector('[data-catalog-toolbar-title]')?.getAttribute('data-condensed') === 'true');
    assert.equal(await title.textContent(), 'Travel kit');
    assert.ok((await toolbar.boundingBox())!.y < 40);
    await f.page.getByRole('button', { name: 'Search', exact: true }).click();
    assert.equal(await toolbar.locator('[data-catalog-navigation-actions]').isVisible(), false, 'search owns its foreground controls');
    await f.page.getByRole('button', { name: 'Close search', exact: true }).click();
    assert.equal(await title.getAttribute('data-condensed'), 'true', 'return preserves the scrolled place');
    await viewport.evaluate(element => { element.scrollTop = 0; });
    await f.page.waitForFunction(() => document.querySelector('[data-catalog-toolbar-title]')?.getAttribute('data-condensed') === 'false');
    await (await navigationAction(f.page, 'Component bank')).click();
    assert.equal(await title.getAttribute('data-condensed'), 'false', 'new destination starts with its own heading');
    await viewport.evaluate(element => { element.scrollTop = 320; });
    await f.page.waitForFunction(() => document.querySelector('[data-catalog-toolbar-title]')?.textContent === 'Component bank'
      && document.querySelector('[data-catalog-toolbar-title]')?.getAttribute('data-condensed') === 'true');
    await settle(f.page);
    await evidence(f.page, `place-toolbar-${width}`, { width });
  } finally { await f.close(); }
});

for (const width of [390, 1280]) test(`sidebar toggle belongs to its header; settings to its footer at ${width}px`, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width, height: 840 });
    await navigationAction(f.page, 'Travel kit');
    const nav = f.page.locator('[data-catalog-navigation]:visible');
    const trigger = nav.getByRole('button', { name: 'Hide navigation', exact: true });
    assert.equal(await nav.locator('[data-slot="sidebar-header"]').getByRole('button', { name: 'Hide navigation', exact: true }).count(), 1);
    const name = (await nav.locator('[data-product-name]').boundingBox())!, toggle = (await trigger.boundingBox())!;
    assert.ok(Math.abs(name.y + name.height / 2 - toggle.y - toggle.height / 2) < 2);
    assert.ok(toggle.x > name.x + name.width);
    assert.notEqual(await trigger.evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await nav.locator('[data-slot="sidebar-footer"]').getByRole('button', { name: 'Settings', exact: true }).count(), 1);
    await trigger.click(); await settle(f.page);
    const opener = f.page.getByRole('button', { name: 'Show navigation', exact: true });
    assert.equal(await f.page.locator('[data-catalog-place-toolbar]').getByRole('button', { name: 'Show navigation', exact: true }).count(), 1);
    assert.ok((await opener.boundingBox())!.y < 40);
    assert.equal(await f.page.locator('[data-catalog-navigation-dock]').count(), 0);
    await opener.click(); await settle(f.page);
    await evidence(f.page, `sidebar-header-toggle-${width}`, { width });
  } finally { await f.close(); }
});

test('title handoff follows a resized heading and detail navigation, including reduced motion', async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 840 });
    await f.page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    await (await navigationAction(f.page, 'Travel kit')).click();
    const viewport = f.page.locator('[data-catalog-scroll]');
    const heading = f.page.locator('[data-local-exercises] [data-place-title]');
    await heading.evaluate(element => { element.style.minHeight = '250px'; });
    await viewport.evaluate(element => { element.scrollTop = 150; });
    await settle(f.page);
    const title = f.page.locator('[data-catalog-toolbar-title]');
    assert.equal(await title.getAttribute('data-condensed'), 'false', 'a tall heading still owns its title after 150px');
    await heading.evaluate(element => { element.style.minHeight = ''; });
    await f.page.waitForFunction(() => document.querySelector('[data-catalog-toolbar-title]')?.getAttribute('data-condensed') === 'true');
    assert.equal(await title.evaluate(element => getComputedStyle(element).transitionDuration), '0s');
    await (await navigationAction(f.page, 'Landmarks')).click();
    await f.page.getByRole('button', { name: 'Learn More', exact: true }).click();
    await f.page.locator('[data-catalog-detail-title]').waitFor();
    assert.equal(await title.getAttribute('data-condensed'), 'false', 'detail starts with a large title below the image');
    await viewport.evaluate(element => { element.scrollTop = 900; });
    await f.page.waitForFunction(() => document.querySelector('[data-catalog-toolbar-title]')?.textContent === 'Mount Fuji'
      && document.querySelector('[data-catalog-toolbar-title]')?.getAttribute('data-condensed') === 'true');
    const toolbar = f.page.locator('[data-catalog-place-toolbar]');
    const back = toolbar.getByRole('button', { name: 'Back', exact: true });
    const toggle = toolbar.getByRole('button', { name: 'Show navigation', exact: true });
    const backBox = (await back.boundingBox())!, toggleBox = (await toggle.boundingBox())!;
    assert.ok(toggleBox.x + toggleBox.width < backBox.x, 'Back and sidebar actions never overlap');
    await f.page.setViewportSize({ width: 1280, height: 840 });
    await settle(f.page);
    await f.page.waitForFunction(() => {
      const heading = document.querySelector('[data-catalog-detail-title]')!.getBoundingClientRect();
      const toolbar = document.querySelector('[data-catalog-place-toolbar] .toolbar-row')!.getBoundingClientRect();
      return document.querySelector('[data-catalog-toolbar-title]')?.getAttribute('data-condensed') === String(heading.bottom <= toolbar.bottom);
    });
    await back.click();
    await f.page.locator('[data-catalog-detail-title]').waitFor({ state: 'detached' });
    await f.page.waitForFunction(() => document.querySelector('[data-catalog-toolbar-title]')?.textContent === ''
      && document.querySelector('[data-catalog-toolbar-title]')?.getAttribute('data-condensed') === 'false');
    assert.equal(await title.textContent(), '', 'home does not inherit the previous detail title');
  } finally { await f.close(); }
});
