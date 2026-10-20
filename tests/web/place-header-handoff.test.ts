import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

// Owner's approved anatomy, recorded before implementation: identity transfers;
// media and primary actions stay in content. No expanded search in the toolbar.
for (const width of [390, 1280]) test(`place identity and media have separate lifetimes at ${width}`, async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.setViewportSize({ width, height: 800 }); await settle(page);
    assert.equal(await page.locator('[data-place-header] h1').textContent(), 'Landmarks');
    assert.ok((await page.locator('[data-place-subtitle]').textContent())!.trim());
    assert.equal(await page.locator('[data-place-header] img').count(), 1);
    assert.equal(await page.locator('[data-place-header] button,[data-media-hero]').count(), 0);
    const scroller = page.locator('[data-catalog-scroll]');
    await scroller.evaluate(el => el.scrollTop = 500); await settle(page);
    const compact = page.locator('[data-toolbar-identity]');
    assert.equal(await compact.locator('[data-identity-title]').textContent(), 'Landmarks');
    assert.equal(await compact.evaluate(el => getComputedStyle(el).opacity), '1');
    assert.equal(await page.locator('[data-place-toolbar] [data-primitive="action"]').count(), 0);
    assert.equal(await compact.evaluate(el => getComputedStyle(el).textAlign), 'start');
    await scroller.evaluate(el => el.scrollTop = 0); await settle(page);
    assert.equal(await compact.evaluate(el => getComputedStyle(el).opacity), '0');
  } finally { await fixture.close(); }
});

test('unavailable hero media keeps its title and working action in both themes', async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto(fixture.origin); await settle(page);
      const hero = page.locator('[data-place-header]');
      await hero.locator('img').dispatchEvent('error'); await settle(page);
      assert.equal(await hero.getAttribute('data-media-unavailable'), 'true');
      assert.equal(await hero.locator('h1').textContent(), 'Landmarks');
      assert.equal(await hero.locator('img').count(), 0);
      assert.equal(await hero.locator('.place-heading-copy').evaluate(el => getComputedStyle(el).textShadow), 'none');
      await page.getByRole('button', { name: 'Mount Fuji', exact: true }).first().click(); await settle(page);
      assert.equal(await page.locator('[data-place-header] h1').textContent(), 'Mount Fuji');
    }
  } finally { await fixture.close(); }
});

test('approved draft copy and inspiration are ordinary content', async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.goto(`${fixture.origin}/?place=travel-kit`); await settle(page);
    const draft = page.locator('[data-place-stack="draft"]');
    assert.equal(await draft.locator('button').count(), 0);
    assert.ok((await draft.textContent())!.includes('Only in this tab'));
    assert.ok((await draft.textContent())!.includes('Closing or reloading this tab discards'));
    assert.equal(await draft.getByText('Storage', { exact: true }).count(), 0);
    const hero = page.locator('[data-place-stack="inspiration"]');
    await hero.getByRole('button', { name: 'Mount Fuji', exact: true }).click(); await settle(page);
    assert.equal(await page.locator('[data-place-header] h1').textContent(), 'Mount Fuji');
  } finally { await fixture.close(); }
});

for (const reducedMotion of ['reduce', 'no-preference'] as const) test(`handoff settles, reverses and respects editing (${reducedMotion})`, async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.emulateMedia({ reducedMotion });
    await page.goto(`${fixture.origin}/?place=travel-kit`); await settle(page);
    const viewport = page.locator('[data-catalog-scroll]');
    const end = Number(await page.locator('[data-place-header]').getAttribute('data-handoff-end'));
    const start = Number(await page.locator('[data-place-header]').getAttribute('data-handoff-start'));
    for (const [progress, expected] of [[.7, end], [.3, start]]) {
      await viewport.dispatchEvent('wheel', { deltaY: 1 });
      await viewport.evaluate((el, value) => el.scrollTop = value, start + (end - start) * progress!);
      await viewport.dispatchEvent('scrollend');
      await page.waitForFunction(target => Math.abs(document.querySelector('[data-catalog-scroll]')!.scrollTop - target!) < 1, expected);
      assert.equal(await page.locator('[data-toolbar-identity]').evaluate(el => getComputedStyle(el).opacity), expected === start ? '0' : '1');
    }
    // Explicit scrolling settles even with an editor focused; the draft and focus survive.
    const input = page.getByRole('textbox', { name: 'Trip name', exact: false });
    await input.fill('A retained draft');
    await viewport.dispatchEvent('wheel', { deltaY: 1 });
    await viewport.evaluate((el, value) => el.scrollTop = value, start + (end - start) * .6);
    await viewport.dispatchEvent('scrollend');
    await page.waitForFunction(target => Math.abs(document.querySelector('[data-catalog-scroll]')!.scrollTop - target) < 1, end);
    assert.equal(await input.evaluate(el => el === document.activeElement), true);
    assert.equal(await input.inputValue(), 'A retained draft');
  } finally { await fixture.close(); }
});
