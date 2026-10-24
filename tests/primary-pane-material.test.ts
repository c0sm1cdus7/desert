import test from 'node:test';
import assert from 'node:assert/strict';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

const source = `<script lang="ts">
  import Action from '@desert/svelte/catalog/foundations/action/Action.svelte';
  import { Button } from '@desert/svelte/vendor/components/ui/button/index.js';
  import Field from '@desert/svelte/catalog/foundations/field/Field.svelte';
  let state = $state('ready');
</script>
<div data-test-controls>{#each ['ready','unavailable','pending'] as value}
  <button onclick={() => state = value}>{value}</button>{/each}</div>
<main>
  <Action label="Save note" icon="save" emphasis="primary" {state} face="fit" type="button"/>
  <Action label="Close" icon="close" state="ready" emphasis="secondary" face="fit" type="button"/>
  <Button href="#preview" data-variant="secondary">Primary link</Button>
  <Button variant="secondary" data-variant="default">Neutral role</Button>
  <Field primitive="input.text" labelVisibility="visible" measure="writing" required={false} invalid={false} disabled={false} purpose="text" clear label="Title" value="" onchange={() => {}}/>
</main>`;

// Independent owner requirement: primary color is a pane tint, not colored ink.
// Every pane keeps the approved opacity, blur and perimeter in every state.
test('primary buttons share the pane recipe and retain emphasis during pending', async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.emulateMedia({ reducedMotion: 'reduce' });
    const cdp = await f.page.context().newCDPSession(f.page);
    for (const theme of ['light','dark']) for (const access of ['glass','contrast','opaque']) {
      await cdp.send('Emulation.setEmulatedMedia', { features: [
        { name: 'prefers-color-scheme', value: theme },
        { name: 'prefers-contrast', value: access === 'contrast' ? 'more' : 'no-preference' },
        { name: 'prefers-reduced-transparency', value: access === 'opaque' ? 'reduce' : 'no-preference' },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ] });
      for (const state of ['ready','unavailable','pending']) {
        await f.page.locator('[data-test-controls]').getByRole('button', { name: state, exact: true }).click();
        const panes = await f.page.locator('[data-material="pane"]').evaluateAll(nodes => {
          const canvas = document.createElement('canvas').getContext('2d')!;
          const rgba = (color: string) => {
            canvas.clearRect(0,0,1,1); canvas.fillStyle = color; canvas.fillRect(0,0,1,1);
            return [...canvas.getImageData(0,0,1,1).data];
          };
          return nodes.map(node => {
            const style = getComputedStyle(node);
            return { name: node.getAttribute('aria-label') ?? node.textContent?.trim(),
              fill: rgba(style.backgroundColor), ink: rgba(style.color), blur: style.backdropFilter,
              border: [style.borderTopWidth, style.borderTopStyle, style.borderTopColor], opacity: style.opacity };
          });
        });
        const primary = panes.find(p => p.name === 'Save note')!, secondary = panes.find(p => p.name === 'Close')!;
        const link = panes.find(p => p.name === 'Primary link')!;
        assert.deepEqual(primary.fill, link.fill, `${theme}/${access}/${state}: button and link share primary tint`);
        assert.deepEqual(primary.ink, [255,255,255,255]);
        assert.ok(primary.fill[2]! - primary.fill[0]! > 100, 'primary tint must be perceptible');
        assert.notDeepEqual(primary.fill, secondary.fill, 'primary cannot be neutral');
        for (const pane of panes) {
          assert.ok(Math.abs(pane.fill[3]! / 255 - (access === 'glass' ? .88 : 1)) < .005);
          assert.equal(pane.blur, access === 'glass' ? 'blur(24px)' : 'none');
          assert.deepEqual(pane.border, secondary.border);
          assert.equal(pane.opacity, '1');
          if (pane !== primary && pane !== link) assert.deepEqual(pane.fill, secondary.fill);
        }
      }
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
