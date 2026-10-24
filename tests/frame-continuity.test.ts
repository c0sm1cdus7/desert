import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { settleMotion } from "./web/fixture.ts";

const source = `<script>
  import { frameContinuity } from '@desert/svelte/infra/frame-continuity.svelte.ts';
  import { intentKey } from '@desert/interaction/intent.ts';
  let panel=$state(null), owner=$state({}), kind=$state('context'), open=$state(true);
  const archive={kind:'journey',journey:'archive-note',recordId:'one'};
  const continuity=frameContinuity(()=>panel,()=>owner,()=>({kind}),()=>undefined);
  function replace(next,intent){if(intent)continuity.invoking(intent);kind=next;owner={};}
  globalThis.frameContinuityTest={
    replace:()=>replace('context'),
    disable:()=>{document.activeElement.disabled=true;},
    outside:()=>{replace('context');document.querySelector('[data-outside]').focus();},
    close:()=>{replace('context');open=false;},
    repeat:()=>{replace('review');replace('context');}
  };
</script>
<button data-outside>Outside</button>
<div bind:this={panel} data-state={open?'open':'closed'}>
{#key owner}<section data-surface-frame tabindex="-1" aria-label={kind}>
  {#if kind==='context'}
    <div data-toolbar-command={intentKey(archive)}><button onclick={()=>replace('review',archive)}>Archive</button></div>
  {:else}
    <button onclick={()=>replace('context',{kind:'back'})}>Back</button>
    <button onclick={()=>replace('context',{kind:'accept'})}>Accept</button>
  {/if}
</section>{/key}
</div>`;

async function settle(f: Awaited<ReturnType<typeof svelteBrowser>>) {
  await f.page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test("retained Panel post-effects preserve focus and scroll after replacing the real keyed Drawer frame", async () => {
  const f = await svelteBrowser(`<script>
    import Panel from '@desert/svelte/catalog/renderer/panel/Panel.svelte';
    import AdaptiveSurfaceLayout from '@desert/svelte/catalog/compositions/catalog-workspace/AdaptiveSurfaceLayout.svelte';
    import { surfaceFrame } from '@desert/interaction/surface-frame.ts';
    import { viewEventOwnership } from '@desert/web/client/view-events.ts';
    import { provideFrameActivation } from '@desert/svelte/infra/frame-continuity.svelte.ts';
    const activateFrame=provideFrameActivation();
    const ownership=viewEventOwnership(),readingIdentity='reading-1';
    const action={intent:{kind:'journey',journey:'archive-note'},label:'Archive note',icon:'archive',state:'ready'};
    const details={kind:'facts',object:'note',fields:['body'],facts:{body:'Reading needs continuity.\\n\\n'.repeat(80)},labels:{'note.body':'Content'},multiline:['body']};
    let phase=$state('context');
    let owner=$derived(ownership.sync([phase],true).panel);
    globalThis.resolveDelayedFrame=()=>phase='review';
    let frame=$derived(surfaceFrame(phase==='context'
      ?{version:'desert.surface-frame/6',kind:'context',top:{title:'Reading',trailing:[action]},content:details,bottom:{}}
      :{version:'desert.surface-frame/6',kind:'journey',top:{title:'Review'},content:{kind:'message',text:'Review this operation.'},
        bottom:{secondary:{intent:{kind:'back'},label:'Back',icon:'back',state:'ready'}}}));
    function receive(envelope){const event=ownership.read(envelope);if(event?.kind==='surface.invoke')phase=event.intent.kind==='back'?'context':'review';}
  </script><AdaptiveSurfaceLayout>
    <button onclick={()=>activateFrame(owner,()=>phase='review')}>Open from main</button>
    <button onclick={()=>activateFrame(owner,()=>{})}>Delayed opening</button>
    <button>Unrelated destination</button>
    <Panel panel={{frame,label:phase,locked:false,owner,
    readingIdentity:phase==='context'?readingIdentity:undefined}} onevent={receive}/></AdaptiveSurfaceLayout>`);
  try {
    await f.page.setViewportSize({ width: 1600, height: 900 });
    await f.page.addStyleTag({ content: await rendererCss() });
    const pane = f.page.locator('[data-adaptive-surface]');
    await pane.waitFor(); await settleMotion(f.page);
    const host = await pane.elementHandle(), scroll = pane.locator('[data-surface-slot="content"]');
    await scroll.evaluate(element => { element.scrollTop = 120; });
    await pane.getByRole('button', { name: 'Archive note', exact: true }).click();
    await pane.locator('[data-toolbar-title]').getByText('Review', { exact: true }).waitFor();
    await settleMotion(f.page);
    assert.equal(await pane.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true);
    await pane.locator('[data-surface-slot="top"]').getByRole('button', { name: 'Back', exact: true }).click();
    await pane.getByRole('button', { name: 'Archive note', exact: true }).waitFor();
    await settleMotion(f.page);
    assert.equal(await host!.evaluate(node => node === document.querySelector('[data-adaptive-surface]')), true);
    assert.equal(await scroll.evaluate(element => element.scrollTop), 120);
    assert.equal(await pane.getByRole('button', { name: 'Archive note', exact: true }).evaluate(node => node === document.activeElement), true);
    await pane.getByRole('button', { name: 'Archive note', exact: true }).click();
    await pane.locator('[data-toolbar-title]').getByText('Review', { exact: true }).waitFor();
    await f.page.setViewportSize({ width: 390, height: 844 });
    await settleMotion(f.page);
    const overlay = await f.page.locator('[data-slot="dialog-overlay"]').boundingBox();
    assert.ok(overlay); await f.page.mouse.click(overlay.x + 8, overlay.y + 80);
    await pane.getByRole('button', { name: 'Archive note', exact: true }).waitFor();
    await settleMotion(f.page);
    assert.equal(await pane.getByRole('button', { name: 'Archive note', exact: true }).evaluate(node => node === document.activeElement), true,
      "the surface's scrim returns focus; it is not an unrelated external destination");
    await f.page.setViewportSize({ width: 1600, height: 900 }); await settleMotion(f.page);
    await f.page.getByRole('button', { name: 'Open from main', exact: true }).click();
    await pane.locator('[data-toolbar-title]').getByText('Review', { exact: true }).waitFor(); await settleMotion(f.page);
    assert.equal(await pane.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true,
      "a causal main action enters its new frame without reopening the retained pane");
    await pane.locator('[data-surface-slot="top"]').getByRole('button', { name: 'Back', exact: true }).click();
    await pane.getByRole('button', { name: 'Archive note', exact: true }).waitFor();
    await f.page.getByRole('button', { name: 'Delayed opening', exact: true }).click();
    const outside = f.page.getByRole('button', { name: 'Unrelated destination', exact: true });
    await outside.click();
    await f.page.evaluate(() => (globalThis as any).resolveDelayedFrame()); await settleMotion(f.page);
    assert.equal(await outside.evaluate(node => node === document.activeElement), true,
      "a later response cannot replay an expired opening over a newer focus destination");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a replaced frame retains focus and Back restores the exact semantic command", async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.getByRole("button", { name: "Archive", exact: true }).click();
    await settle(f);
    assert.equal(await f.page.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true,
      await f.page.evaluate(() => document.activeElement?.outerHTML));
    await f.page.getByRole("button", { name: "Back", exact: true }).click();
    await settle(f);
    assert.equal(await f.page.getByRole("button", { name: "Archive", exact: true }).evaluate(node => node === document.activeElement), true);
    await f.page.getByRole("button", { name: "Archive", exact: true }).click();
    await f.page.getByRole("button", { name: "Accept", exact: true }).click();
    await settle(f);
    assert.equal(await f.page.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true,
      "acceptance focuses the new reading frame rather than replaying its old command");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("frame replacement never takes focus from another owner or a closing surface", async () => {
  const f = await svelteBrowser(source);
  try {
    const outside = f.page.getByRole("button", { name: "Outside", exact: true });
    await outside.focus();
    await f.page.evaluate(() => (globalThis as any).frameContinuityTest.replace());
    await settle(f);
    assert.equal(await outside.evaluate(node => node === document.activeElement), true);
    await f.page.getByRole("button", { name: "Archive", exact: true }).focus();
    await f.page.evaluate(() => (globalThis as any).frameContinuityTest.outside());
    await settle(f);
    assert.equal(await outside.evaluate(node => node === document.activeElement), true);
    await f.page.getByRole("button", { name: "Archive", exact: true }).focus();
    await f.page.evaluate(() => (globalThis as any).frameContinuityTest.close());
    await settle(f);
    assert.equal(await f.page.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), false);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a pending command that disables its focused button retains focus ownership until an outside interaction", async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.getByRole("button", { name: "Archive", exact: true }).focus();
    await f.page.evaluate(() => (globalThis as any).frameContinuityTest.disable());
    await settle(f);
    assert.equal(await f.page.evaluate(() => document.activeElement === document.body), true);
    await f.page.evaluate(() => (globalThis as any).frameContinuityTest.replace());
    await settle(f);
    assert.equal(await f.page.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true);
    await f.page.getByRole("button", { name: "Archive", exact: true }).focus();
    await f.page.evaluate(() => (globalThis as any).frameContinuityTest.disable());
    await f.page.getByRole("button", { name: "Outside", exact: true }).click();
    await f.page.evaluate(() => (globalThis as any).frameContinuityTest.replace());
    await settle(f);
    assert.equal(await f.page.getByRole("button", { name: "Outside", exact: true }).evaluate(node => node === document.activeElement), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a command in a portaled descendant keeps the parent frame's focus continuity", async () => {
  const f = await svelteBrowser(`<script>
    import * as Dialog from '@desert/svelte/vendor/components/ui/dialog/index.js';
    import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
    import { frameContinuity } from '@desert/svelte/infra/frame-continuity.svelte.ts';
    let panel=$state(null),owner=$state({}),kind=$state('context');
    const continuity=frameContinuity(()=>panel,()=>owner,()=>({kind}),()=>undefined);
    function review(){continuity.invoking({kind:'journey',journey:'archive-note'});kind='journey';owner={};}
  </script>
  <Dialog.Root open={true}><Dialog.Content bind:ref={panel} showCloseButton={false} trapFocus={false}>
    <Dialog.Title>Parent</Dialog.Title><Dialog.Description>A retained reading panel.</Dialog.Description>
    {#key owner}<section data-surface-frame tabindex="-1">
      {#if kind==='context'}<Popover.Root><Popover.Trigger>More actions</Popover.Trigger>
        <Popover.Content role="dialog" aria-label="Actions"><button onclick={review}>Archive</button></Popover.Content>
      </Popover.Root>{:else}<button>Back</button>{/if}
    </section>{/key}
  </Dialog.Content></Dialog.Root>`);
  try {
    await f.page.getByRole("button", { name: "More actions", exact: true }).click();
    await f.page.getByRole("button", { name: "Archive", exact: true }).click();
    await settle(f);
    assert.equal(await f.page.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true,
      await f.page.evaluate(() => document.activeElement?.outerHTML));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("one suspended reading position belongs only to its opaque subject identity", async () => {
  const f = await svelteBrowser(`<script>
    import { tick } from 'svelte';
    import { frameContinuity } from '@desert/svelte/infra/frame-continuity.svelte.ts';
    const first='reading-1',second='reading-2';
    let panel=$state(null),owner=$state({}),reading=$state.raw(first),kind=$state('context');
    frameContinuity(()=>panel,()=>owner,()=>({kind}),()=>reading);
    globalThis.readingContinuity={
      leave:()=>{kind='journey';reading=undefined;owner={};},
      resume:async(other=false)=>{kind='context';owner={};await tick();reading=other?second:first;},
    };
  </script><button>Outside</button><div bind:this={panel} data-state="open">
    {#key owner}<section data-surface-frame tabindex="-1">
      <div data-surface-slot="content" style="height:80px;overflow:auto"><div style="height:600px">{kind}</div></div>
    </section>{/key}
  </div>`);
  try {
    const content = f.page.locator('[data-surface-slot="content"]');
    await content.evaluate(element => { element.scrollTop = 120; });
    await f.page.evaluate(() => (globalThis as any).readingContinuity.leave());
    await settle(f);
    assert.equal(await content.evaluate(element => element.scrollTop), 0);
    await f.page.evaluate(() => (globalThis as any).readingContinuity.resume());
    await settle(f);
    assert.equal(await content.evaluate(element => element.scrollTop), 120);
    await f.page.evaluate(() => (globalThis as any).readingContinuity.leave());
    await settle(f);
    await f.page.evaluate(() => (globalThis as any).readingContinuity.resume(true));
    await settle(f);
    assert.equal(await content.evaluate(element => element.scrollTop), 0, "a different object never inherits the previous reading position");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
