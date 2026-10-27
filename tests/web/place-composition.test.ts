import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

for (const width of [390, 1280]) {
test(`shared sidebar toolbar alignment and target sizes at ${width}`, async () => {
  const f = await publicCatalogFixture();
  const output = `artifacts/place-composition-v1/${width}`;
  await mkdir(output, { recursive: true });
  try {
    await f.page.setViewportSize({ width, height: 900 });
    await navigationAction(f.page, 'Travel kit');
    await settle(f.page);
    const nav = f.page.locator('[data-catalog-navigation]:visible');
    assert.equal(await nav.locator('[data-navigation-product-icon]').count(), 0);
    assert.equal(await nav.locator('[data-toolbar]').count(), 2);
    const hide = nav.getByRole('button', { name: 'Hide navigation', exact: true });
    const settings = nav.getByRole('button', { name: 'Settings', exact: true });
    const a = (await hide.boundingBox())!, b = (await settings.boundingBox())!;
    assert.ok(Math.abs(a.x + a.width - b.x - b.width) < 1, 'toolbar actions share their trailing alignment');
    assert.ok(Math.abs(a.width - b.width) < 1,
      `toolbar actions share their target size: navigation ${a.width}px, settings ${b.width}px`);
    await nav.screenshot({ path: `${output}/sidebar.png` });
  } finally { await f.close(); }
});

test(`Travel kit uses always-visible titled sibling stacks at ${width}`, async () => {
  const f = await publicCatalogFixture();
  const output = `artifacts/place-composition-v1/${width}`;
  await mkdir(output, { recursive: true });
  try {
    await f.page.setViewportSize({ width, height: 900 });
    await (await navigationAction(f.page, 'Travel kit')).click();
    await settle(f.page);
    const content = f.page.locator('[data-place-content]');
    const place = f.page.locator('[data-catalog-content]');
    assert.equal(await place.getByRole('heading', { level: 1, name: 'Travel kit', exact: true }).count(), 1);
    assert.equal(await content.getByRole('heading', { level: 1 }).count(), 0,
      'The body-only exercise composition does not repeat its outer Place heading');
    const budget = content.getByRole('group', { name: 'Budget', exact: true });
    assert.equal(await budget.getByRole('textbox', { name: 'Estimated budget', exact: true }).count(), 1);
    assert.equal(await content.locator('[data-view-item]').count(), 8);
    assert.deepEqual(await content.locator('[data-view-item] .place-stack-title h2').allTextContents(), [
      'Your next visit', 'Notes', 'Travel pace*', 'Interests', 'Budget',
      'Travel documents', 'About this draft', 'A little inspiration',
    ]);
    assert.equal(await content.locator('[data-view-item] [data-view-item]').count(), 0);
    await f.page.screenshot({ path: `${output}/start.png` });
    await content.locator('[data-view-item="pace"]').scrollIntoViewIfNeeded();
    await f.page.screenshot({ path: `${output}/groups.png` });
    await budget.getByRole('textbox', { name: 'Estimated budget', exact: true }).fill('120');
    const draft = content.locator('[data-view-item="draft"]');
    await draft.scrollIntoViewIfNeeded();
    await settle(f.page);
    assert.equal(await draft.getByRole('heading', { name: 'About this draft', exact: true }).isVisible(), true);
    assert.equal(await draft.getByText('Only in this tab', { exact: true }).isVisible(), true);
    assert.equal(await draft.getByText('Nothing is booked, uploaded or saved to an account. Closing or reloading this tab discards the draft and local file references.', { exact: true }).isVisible(), true);
    assert.equal(await draft.getByRole('button').count(), 0, 'Draft lifetime is reading content, not a disclosure');
    assert.equal(await content.locator('details, summary, [data-stack-kind="disclosure"], [data-slot^="collapsible"], [data-slot^="accordion"], .stack-disclosure').count(), 0,
      'No content section requires expanding; unrelated navigation and picker controls remain valid');
    const identity = place.locator('[data-toolbar-identity]');
    assert.equal(await identity.locator('[data-identity-title]').textContent(), 'Travel kit');
    assert.equal(await identity.locator('[data-identity-subtitle]').textContent(), 'Plan your next visit. Your draft stays in this tab.');
    assert.equal(await identity.getAttribute('aria-hidden'), 'true', 'The toolbar continuation does not announce a duplicate heading');
    assert.equal(await f.page.locator('[data-catalog-content]').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
  } finally { await f.close(); }
});
}
