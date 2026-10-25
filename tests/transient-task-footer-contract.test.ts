import test from 'node:test';
import assert from 'node:assert/strict';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { saveFixedEvidence } from './web/fixed-toolbar-expectations.ts';

const source = `<script lang="ts">
  import TransientNode from "@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte";
  import { surfaceFrame, SurfaceFrameVersion } from "@desert/interaction/surface-frame.ts";
  import { toolbarAction } from "@desert/interaction/toolbar.ts";
  let open = $state(false), observed = $state("");
  const frame = surfaceFrame({ version: SurfaceFrameVersion, kind:"journey", navigation:"steps",
    top:{ title:"Independent task" }, content:{ kind:"message",text:"A task with a real next action." },
    bottom:{primary:toolbarAction({kind:"accept"},"Continue","confirm")} });
</script>
<button onclick={() => open = true}>Open independent task</button>
<output data-observed>{observed}</output>
<TransientNode node={{ version: "desert.bank-node/1", kind: "transient", label: "Independent task", open, locked: false, frame }}
  onevent={event => { if (event.kind === "transient.close") open = false; else if (event.kind === "surface.invoke") observed = JSON.stringify(event.intent); }} />`;

for (const width of [390, 1280]) test(`a real Continue footer remains executable at ${width}px`, async () => {
  const f = await svelteBrowser(source); const { page } = f;
  try {
    await page.addStyleTag({ content: await rendererCss() });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 900 });
    const opener = page.getByRole('button', { name: 'Open independent task', exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Independent task', exact: true });
    await dialog.waitFor();
    const footer = dialog.locator('[data-surface-slot="bottom"]');
    const next = footer.getByRole('button', { name: 'Continue', exact: true });
    assert.equal(await next.count(), 1, 'Removing a lone dismissal must not remove real task actions');
    const close=footer.getByRole('button',{name:'Close',exact:true});
    const left=await close.boundingBox(), right=await next.boundingBox();
    assert.ok(left && right && Math.abs(left.width-right.width)<1,'Wizard navigation divides its rail equally');
    await next.click();
    assert.deepEqual(JSON.parse(await page.locator('[data-observed]').innerText()), { kind: 'accept' });
    assert.equal(await dialog.isVisible(), true, 'The renderer does not fake task completion');
    await saveFixedEvidence(page, `source-continue-${width}`, { sourceFixture: true, width, intent: { kind: 'accept' } });
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    assert.ok(await opener.evaluate(element => element === document.activeElement));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
