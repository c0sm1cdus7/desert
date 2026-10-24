import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { moneyBrowser } from './fixtures/money-mask-browser.ts';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`currency symbols and shared transient toolbar (${colorScheme})`, async () => {
    const f = await moneyBrowser(true);
    try {
      await f.page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const width of [1024, 390, 320]) {
        await f.page.setViewportSize({ width, height: 844 });
        const trigger = f.page.getByRole('button', { name: 'USD · Amount currency', exact: true });
        await trigger.click();
        const options = f.page.getByRole('listbox');
        await options.waitFor();
        for (const [code, expected] of [['USD', '$'], ['ARS', '$'], ['EUR', '€'], ['JPY', '¥']] as const) {
          const option = options.getByRole('option', { name: code, exact: true });
          assert.equal(await option.locator('[data-piece="face"]').count(), 0);
          const symbol = option.locator('[data-currency-symbol]');
          assert.equal(await symbol.innerText(), expected);
          assert.deepEqual(await symbol.evaluate(el => {
            const css = getComputedStyle(el);
            return [css.borderTopWidth, css.backgroundColor];
          }), ['0px', 'rgba(0, 0, 0, 0)']);
        }
        if (width < 448) {
          const sheet = f.page.getByRole('dialog', { name: 'Amount currency', exact: true });
          const toolbar = sheet.locator('[data-piece="toolbar"][data-surface-slot="top"]');
          const close = toolbar.getByRole('button', { name: 'Close Amount currency', exact: true });
          const title = toolbar.getByRole('heading', { name: 'Amount currency', exact: true });
          assert.equal(await close.getAttribute('data-action'), '');
          assert.equal(await close.getAttribute('data-action-face'), 'icon');
          const buttonBox = (await close.boundingBox())!, titleBox = (await title.boundingBox())!;
          assert.ok(buttonBox.x + buttonBox.width <= titleBox.x, 'close precedes the title');
          assert.equal(await toolbar.evaluate(el => getComputedStyle(el).borderBottomWidth), '0px');
          const directory = 'artifacts/picker-toolbar-consistency';
          await mkdir(directory, { recursive: true });
          await f.page.screenshot({ path: `${directory}/${colorScheme}-${width}.png` });
          await close.click();
        } else await f.page.keyboard.press('Escape');
        await options.waitFor({ state: 'hidden' });
        assert.ok(await trigger.evaluate(el => el === document.activeElement));
      }
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}
