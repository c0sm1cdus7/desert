import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

// At narrow widths, a clear accessory must not steal the label's reading column.
// These expectations describe the visible anatomy, not a particular grid or DOM.
for (const kind of ['input.text', 'input.multiline', 'control.money']) {
  test(`${kind}: large-text label owns the well width without sacrificing clear or editing`, async () => {
    const f = await publicCatalogFixture();
    try {
      const { page } = f;
      await page.setViewportSize({ width: 320, height: 950 });
      await page.goto(`${f.origin}/?place=bank`);
      await page.evaluate(() => document.documentElement.style.setProperty('--text-scale', '2'));
      await page.getByRole('searchbox', { name: 'Find component', exact: true }).fill(kind);
      const specimen = page.locator(`[data-specimen="${kind}:${kind === 'control.money' ? 'empty' : 'value'}"]`);
      const editor = specimen.getByRole('textbox');
      const well = specimen.locator('[data-floating-field]');
      const clear = specimen.locator('[data-input-clear]');
      await editor.fill(kind === 'control.money' ? '1234,56' : 'A thought worth keeping');
      await well.scrollIntoViewIfNeeded(); await settle(page);
      const geometry = await well.evaluate(element => {
        const label = element.querySelector('[data-field-well] > [data-slot="field-label"]')!;
        const editor = element.querySelector('input,textarea')!;
        const clear = element.querySelector('[data-input-clear]')!;
        const rect = (node: Element) => node.getBoundingClientRect().toJSON();
        const words: { word: string; lines: number }[] = [];
        for (const node of label.childNodes) if (node.nodeType === Node.TEXT_NODE) {
          for (const match of node.textContent!.matchAll(/\S+/g)) {
            const range = document.createRange(); range.setStart(node, match.index!); range.setEnd(node, match.index! + match[0].length);
            words.push({ word: match[0], lines: range.getClientRects().length });
          }
        }
        const style = getComputedStyle(editor);
        return { well: rect(element), label: rect(label), editor: rect(editor), clear: rect(clear), words,
          horizontalInset: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
          labelFor: label.getAttribute('for'), editorId: editor.id,
          scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
      });
      const failures: string[] = [];
      if (geometry.label.width < geometry.well.width - geometry.horizontalInset - 2)
        failures.push('The label loses usable well width to the clear accessory');
      if (geometry.label.bottom > Math.min(geometry.editor.top, geometry.clear.top) + 1)
        failures.push('The narrow label must be above the editor and clear row');
      if (geometry.words.some(word => word.lines > 1)) failures.push('A short label word splits mid-word');
      if (geometry.clear.width < 44 || geometry.clear.height < 44) failures.push('Clear target is smaller than44px');
      if (kind === 'input.multiline') {
        if (geometry.editor.width < geometry.well.width - 2) failures.push('The multiline editor loses full-height writing width to its clear accessory');
        if (geometry.clear.top < geometry.editor.bottom - 1) failures.push('A narrow multiline clear belongs below the writing area');
      }
      const horizontalOverlap = Math.min(geometry.editor.right, geometry.clear.right) - Math.max(geometry.editor.left, geometry.clear.left);
      const verticalOverlap = Math.min(geometry.editor.bottom, geometry.clear.bottom) - Math.max(geometry.editor.top, geometry.clear.top);
      if (horizontalOverlap > 1 && verticalOverlap > 1) failures.push('Editor and clear hit regions overlap');
      if (geometry.scrollWidth > geometry.clientWidth + 1) failures.push('Well overflows horizontally');
      assert.equal(geometry.labelFor, geometry.editorId, 'The visible label remains associated with the editor');
      const directory = `artifacts/field-well-large-text/${process.env.DESERT_CATALOG_BUILD?.split('/').pop()}`;
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: `${directory}/${kind}.png` });
      await writeFile(`${directory}/${kind}.json`, JSON.stringify({ geometry, failures }, null, 2));
      const value = await editor.inputValue();
      await editor.click();
      await editor.press('ControlOrMeta+a'); await editor.press('ArrowLeft');
      for (let index = 0; index < 2; index++) await editor.press('ArrowRight');
      for (let index = 0; index < 3; index++) await editor.press('Shift+ArrowRight');
      await page.keyboard.press('Tab');
      const bounds = await well.boundingBox(); assert.ok(bounds);
      // Compound money's top row belongs to its currency picker, not the editor.
      const point = kind === 'control.money'
        ? { x: bounds.x + 2, y: geometry.label.top + 2 }
        : { x: bounds.x + bounds.width / 2, y: bounds.y + 2 };
      await page.mouse.click(point.x, point.y);
      assert.ok(await editor.evaluate(element => element === document.activeElement), 'Writing-area padding still focuses the editor');
      assert.deepEqual(await editor.evaluate(element => [(element as HTMLInputElement).selectionStart, (element as HTMLInputElement).selectionEnd]), [2, 5], 'Padding focus preserves existing selection');
      assert.equal(await editor.inputValue(), value);
      await clear.click();
      assert.equal(await editor.inputValue(), '', 'Clear follows the ordinary editing pipeline');
      assert.ok(await editor.evaluate(element => element === document.activeElement), 'Clear restores editor focus');
      await editor.press('ControlOrMeta+z');
      assert.equal(await editor.inputValue(), value, 'The ordinary undo pipeline restores cleared writing, including a masked amount');
      assert.deepEqual(failures, [], 'Large-text well anatomy remains readable; see measured evidence');
    } finally { await f.close(); }
  });
}
