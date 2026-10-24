import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { navigationAction, settle } from './public-catalog-expectations.ts';
import { wellPoints } from './field-well-expectations.ts';

for (const width of [1280, 390]) test(`compiled writing wells have no dead padding at ${width}px`, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width, height: 900 });
    await f.page.emulateMedia({ reducedMotion: 'reduce' });
    await (await navigationAction(f.page, 'Component bank')).click();
    const search = f.page.getByRole('searchbox', { name: 'Find component', exact: true });
    for (const kind of ['input.text', 'input.multiline']) {
      await search.fill(kind);
      const specimen = f.page.locator(`[data-view-item="specimen:${kind}:empty"]`);
      const input = specimen.getByRole('textbox');
      const well = specimen.locator('[data-floating-field]');
      await well.scrollIntoViewIfNeeded(); await settle(f.page);
      for (const region of ['top padding', 'leading padding', 'bottom padding'] as const) {
        await input.evaluate(el => (el as HTMLElement).blur());
        const point = (await wellPoints(well))[region];
        await f.page.mouse.click(point.x, point.y);
        assert.ok(await input.evaluate(el => el === document.activeElement), `${kind}/${region}`);
        assert.equal(await input.inputValue(), '');
      }
      await input.pressSequentially('Retained writing');
      await input.evaluate(el => (el as HTMLElement).blur());
      const point = (await wellPoints(well))['top padding'];
      await f.page.mouse.click(point.x, point.y);
      assert.ok(await input.evaluate(el => el === document.activeElement));
      assert.equal(await input.inputValue(), 'Retained writing');
    }
  } finally { await f.close(); }
});
