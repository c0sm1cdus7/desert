import test from 'node:test';
import assert from 'node:assert/strict';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

// Loading does not introduce an accent: the icon inherits its immediate context.
// Availability is the one passive spinner; collection loading is a skeleton (collection-loading-connection).
for (const colorScheme of ['light', 'dark'] as const) test(`passive spinners inherit their context (${colorScheme})`, async () => {
  const fixture = await svelteBrowser(`<script lang="ts">
    import Availability from '@desert/svelte/catalog/foundations/availability/Availability.svelte';
    import CollectionState from '@desert/svelte/catalog/compositions/collection-state/CollectionState.svelte';
  </script>
  <Availability state="unknown" label="Example: unknown. No controller is connected." />
  <CollectionState loaded={false} createLabel="Create record" />`);
  try {
    await fixture.page.addStyleTag({ content: await rendererCss() });
    await fixture.page.emulateMedia({ colorScheme });
    const observed = await fixture.page.locator('[data-slot="spinner"]').evaluateAll(icons => icons.map(icon => ({
      color: getComputedStyle(icon).color, stroke: getComputedStyle(icon).stroke,
      context: getComputedStyle(icon.parentElement!).color,
    })));
    assert.equal(observed.length, 1);
    const loading = fixture.page.locator('[aria-label="Collection state"]:has([data-loading="lines"])');
    assert.equal(await loading.count(), 1);
    assert.equal(await loading.locator('[data-slot="spinner"]').count(), 0);
    for (const icon of observed) {
      assert.equal(icon.color, icon.context, 'Spinner must not set its own accent');
      assert.equal(icon.stroke, icon.context, 'Stroke follows currentColor');
    }
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});
