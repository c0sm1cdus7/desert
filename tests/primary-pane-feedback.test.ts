import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

const contrast = (rgb: number[]) => 1.05 / (.05 + rgb.map(v => v / 255)
  .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, value, i) => sum + value * [.2126,.7152,.0722][i]!, 0));

// Test painted pixels over both extreme backdrops, not CSS alpha alone.
test('primary pane keeps readable white labels and neutral press feedback over bright backdrops', async t => {
  const f = await svelteBrowser(`<script lang="ts">
    import Action from '@desert/svelte/catalog/foundations/action/Action.svelte';
  </script><main style="padding:80px"><Action label="Save note" icon="save" emphasis="primary"/></main>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.emulateMedia({ reducedMotion: 'reduce' });
    const button = f.page.getByRole('button', { name: 'Save note' });
    const content = button.locator('[data-button-content]');
    const failures: string[] = [];
    for (const theme of ['light','dark']) for (const backdrop of ['white','black']) {
      await f.page.evaluate(({ theme, backdrop }) => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.background = backdrop;
        document.body.style.background = backdrop;
      }, { theme, backdrop });
      const paints: Record<string, number[]> = {};
      for (const state of ['idle','hover','pressed']) {
        await f.page.mouse.move(0,0);
        if (state !== 'idle') await button.hover();
        if (state === 'pressed') await f.page.mouse.down();
        assert.equal(await button.evaluate(e => getComputedStyle(e).color), 'rgb(255, 255, 255)');
        const bounds = (await button.boundingBox())!;
        await content.evaluate(e => e.style.visibility = 'hidden');
        const { data, info } = await sharp(await f.page.screenshot()).raw().toBuffer({ resolveWithObject: true });
        await content.evaluate(e => e.style.removeProperty('visibility'));
        const offset = (Math.floor(bounds.y + bounds.height / 2) * info.width + Math.floor(bounds.x + bounds.width / 2)) * info.channels;
        const rgb = [...data.subarray(offset, offset + 3)];
        const ratio = contrast(rgb);
        if (ratio < 4.5) failures.push(`${theme}/${backdrop}/${state}: ${ratio.toFixed(2)}:1`);
        t.diagnostic(`${theme}/${backdrop}/${state}: ${ratio.toFixed(2)}:1`);
        paints[state] = rgb;
        if (state === 'pressed') { await f.page.mouse.move(0,0); await f.page.mouse.up(); }
      }
      assert.notDeepEqual(paints.idle, paints.hover, 'hover remains perceptible');
      assert.notDeepEqual(paints.hover, paints.pressed, 'press remains perceptible');
    }
    assert.deepEqual(failures, []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
