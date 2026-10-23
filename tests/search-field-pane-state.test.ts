import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

test('disabled search dims content once without changing its glass pane', async () => {
  const f = await svelteBrowser(`<script>
    import SearchField from '@desert/svelte/catalog/foundations/search-field/SearchField.svelte';
    let disabled = $state(false);
  </script><button onclick={() => disabled = !disabled}>Toggle disabled</button>
  <SearchField {disabled} aria-label="Search specimen" value="A query" />`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const pane = f.page.locator('[data-search-field]');
    const material = () => pane.evaluate(e => {
      const s = getComputedStyle(e);
      return { fill: s.backgroundColor, blur: s.backdropFilter, border: s.border,
        opacity: s.opacity, bounds: e.getBoundingClientRect().toJSON() };
    });
    for (const theme of ['light', 'dark']) {
      await f.page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      const ready = await material();
      await f.page.getByRole('button', { name: 'Toggle disabled', exact: true }).click();
      assert.deepEqual(await material(), ready, theme + ': pane and geometry remain unchanged');
      const contents = await pane.evaluate(e => {
        const expected = Number(getComputedStyle(e).getPropertyValue('--disabled-opacity'));
        return { expected, opacities: [...e.children].map(child => Number(getComputedStyle(child).opacity)),
          clearContent: getComputedStyle(e.querySelector('[data-button-content]')!).opacity };
      });
      assert.equal(ready.opacity, '1');
      assert.deepEqual(contents.opacities, [contents.expected, contents.expected, contents.expected]);
      assert.equal(contents.clearContent, '1', 'nested clear action does not fade a second time');
      assert.equal(await f.page.getByRole('searchbox').isDisabled(), true);
      assert.equal(await f.page.getByRole('button', { name: 'Clear search', exact: true }).isDisabled(), true);
      await f.page.getByRole('button', { name: 'Toggle disabled', exact: true }).click();
      assert.deepEqual(await material(), ready);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
