import test from 'node:test';
import assert from 'node:assert/strict';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { settleMotion } from './web/fixture.ts';

for (const reduced of [false, true]) test(`View panel preserves draft and presence across resize (${reduced ? 'reduced' : 'full'} motion)`, async () => {
  const fixture = await svelteBrowser(`<script lang="ts">
    import Panel from '@desert/svelte/views/Panel.svelte';
    import AdaptiveSurfaceLayout from '@desert/svelte/pieces/AdaptiveSurfaceLayout.svelte';
    import {surfaceFrame} from '@desert/interaction/surface-frame.ts';
    import {viewEventOwnership} from '@desert/web/client/view-events.ts';
    const ownership=viewEventOwnership();
    let open=$state(false), value=$state(''), generation=$state(0);
    let owner=$derived(ownership.sync([generation],true).panel);
    let frame=$derived(surfaceFrame({version:'desert.surface-frame/6',kind:'journey',top:{title:'Draft fixture'},
      content:{kind:'form',submit:'save',fields:[{name:'title',label:'Title',primitive:'input.text',value,required:false}]},
      bottom:{primary:{intent:{kind:'journey',journey:'save'},label:'Save',icon:'save',state:'ready'}}}));
    function event(envelope) {
      const event=ownership.read(envelope);
      if(!event) return;
      if(event.kind==='input.change') value=event.value;
      else if(event.kind==='transient.close' || event.kind==='surface.invoke' && event.intent.kind==='close') open=false;
    }
  </script>
  <AdaptiveSurfaceLayout>
    <button onclick={()=>{generation++;open=true;}}>Open fixture</button>
    <Panel panel={open?{frame,label:'Draft fixture',locked:false,owner}:null} onevent={event}/>
  </AdaptiveSurfaceLayout>`);
  try {
    const { page } = fixture;
    await page.setViewportSize({ width: 1600, height: 844 });
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.addStyleTag({ content: await rendererCss() });
    await page.getByRole('button', { name: 'Open fixture' }).click();
    const pane = page.locator('.drawer');
    await pane.waitFor();
    await settleMotion(page);
    const input = pane.getByRole('textbox', { name: 'Title' });
    await input.fill('Keep this draft');
    await input.evaluate((node: HTMLInputElement) => { node.focus(); node.setSelectionRange(5, 9); });
    const handle = await input.elementHandle(), paneHandle = await pane.elementHandle();
    for (const [width, edge, presentation] of [[390, 'bottom', 'transient'], [1200, 'right', 'transient'], [1600, 'right', 'docked']] as const) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForFunction(([edge, presentation]) => {
        const node = document.querySelector('.drawer');
        return node?.getAttribute('data-edge') === edge && node?.getAttribute('data-presentation') === presentation;
      }, [edge, presentation]);
      assert.equal(await paneHandle!.evaluate(node => node === document.querySelector('.drawer')), true);
      assert.equal(await handle!.evaluate(node => node.isConnected && node === document.activeElement), true);
      assert.equal(await input.inputValue(), 'Keep this draft');
      assert.deepEqual(await input.evaluate((node: HTMLInputElement) => [node.selectionStart, node.selectionEnd]), [5, 9]);
      assert.equal(await pane.evaluate(node => node.getAnimations().length), 0, 'Resizing an open pane never replays entry');
      assert.equal(await pane.evaluate(node => getComputedStyle(node).opacity), '1');
    }
    await pane.getByRole('button', { name: 'Close', exact: true }).first().click();
    await pane.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Open fixture' }).click();
    await pane.waitFor(); await settleMotion(page);
    assert.equal(await input.inputValue(), 'Keep this draft');
    if (reduced) assert.equal(await pane.evaluate(node => getComputedStyle(node).transitionDuration), '0s');
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});
