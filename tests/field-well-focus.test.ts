import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { textClearSource, moneyClearSource, updateClear, clearEvents } from './fixtures/input-clear.ts';
import { wellPoints } from './web/field-well-expectations.ts';

for (const primitive of ['input.text', 'input.multiline']) {
  test(`${primitive}: padding, label and footer focus the editor without an edit`, async () => {
    const f = await svelteBrowser(textClearSource);
    try {
      await f.page.addStyleTag({ content: await rendererCss() });
      await f.page.emulateMedia({ reducedMotion: 'reduce' });
      await updateClear(f.page, { primitive });
      const input = f.page.getByRole('textbox', { name: 'Writing', exact: true });
      const well = f.page.locator('[data-floating-field]');
      const outside = f.page.getByRole('button', { name: 'Outside' });
      for (const width of [900, 390]) for (const value of ['', 'Retained writing']) {
        await f.page.setViewportSize({ width, height: 900 });
        await updateClear(f.page, { value });
        for (const [region, point] of Object.entries(await wellPoints(well))) {
          // The trailing accessory remains a separate clear action when present.
          if (value && region === 'chevron') continue;
          await outside.focus();
          const beforeFocus = await clearEvents(f.page);
          await f.page.mouse.click(point.x, point.y);
          assert.ok(await input.evaluate(el => el === document.activeElement), `${width}/${value}/${region}`);
          assert.equal(await input.inputValue(), value);
          assert.deepEqual(await clearEvents(f.page), beforeFocus, 'focusing does not publish an edit');
        }
      }
      await updateClear(f.page, { disabled: true });
      await outside.focus();
      const point = (await wellPoints(well))['top padding'];
      await f.page.mouse.click(point.x, point.y);
      assert.equal(await input.evaluate(el => el === document.activeElement), false);
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}

test('compound well focuses its amount without swallowing the currency selector or clear action', async () => {
  const f = await svelteBrowser(moneyClearSource);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await updateClear(f.page, { minorUnits: '12345' });
    const input = f.page.getByRole('textbox', { name: 'Amount', exact: true });
    const content = f.page.locator('[data-field-well]');
    const box = (await content.boundingBox())!;
    await f.page.mouse.click(box.x + box.width / 2, box.y + 2);
    assert.ok(await input.evaluate(el => el === document.activeElement));
    assert.deepEqual(await clearEvents(f.page), []);
    await f.page.getByRole('button', { name: 'ARS · Amount currency', exact: true }).click();
    await f.page.getByRole('listbox').waitFor();
    assert.equal(await input.evaluate(el => el === document.activeElement), false);
    await f.page.keyboard.press('Escape');
    await f.page.getByRole('button', { name: 'Clear Amount', exact: true }).click();
    assert.equal(await input.inputValue(), '');
    assert.equal((await clearEvents(f.page)).length, 1);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
