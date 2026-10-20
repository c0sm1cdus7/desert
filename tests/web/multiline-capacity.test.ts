import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogLifecycleFixture as publicCatalogFixture } from './catalog-lifecycle-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

// Autosizing must yield to the Place's reading capacity. Native editor scroll
// keeps the insertion point visible without discarding text or hiding its label.
test('Multiline writing keeps the final line visible in a short enlarged-text Place', async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(`${f.origin}/?place=bank`);
    await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '2'));
    await settle(page);
    await page.getByRole('searchbox', { name: 'Find component', exact: true }).focus();
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); await settle(page); }
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'TEXTAREA');
    await page.keyboard.press('ControlOrMeta+A');
    const value = 'First line\nSecond line\nThird line\nFourth line\nFifth line\nLast line';
    await page.keyboard.insertText(value);
    await page.keyboard.press('x');
    await settle(page);
    await page.evaluate(async () => { for (let i = 0; i < 10; i++) await new Promise(requestAnimationFrame); });
    const state = await page.evaluate(() => {
      const editor = document.activeElement as HTMLTextAreaElement;
      const bounds = editor.getBoundingClientRect(), style = getComputedStyle(editor);
      const well = editor.closest('.field-well')!.getBoundingClientRect();
      const header = document.querySelector('[data-place-header]')!.getBoundingClientRect();
      return { value: editor.value, selection: editor.selectionEnd, scroll: editor.scrollTop,
        bottom: bounds.bottom, wellTop: well.top, headerBottom: header.bottom,
        rowEnd: bounds.top + parseFloat(style.paddingTop) + 6 * parseFloat(style.lineHeight) - editor.scrollTop };
    });
    assert.equal(state.value, value + 'x');
    assert.equal(state.selection, value.length + 1);
    assert.ok(state.rowEnd <= 386, `Caret line ends below the viewport: ${state.rowEnd}`);
    assert.ok(state.bottom <= 386, `Editor extends below the viewport: ${state.bottom}`);
    assert.ok(state.wellTop >= state.headerBottom + 4, `The label and clear action remain below chrome: ${JSON.stringify(state)}`);
    assert.ok(state.scroll > 0, 'Overflow belongs to the native editor');
  } finally { await f.close(); }
});
