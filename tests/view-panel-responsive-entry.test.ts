import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

// First mount has no retained host measurement. The entry must still use its
// final responsive axis from its first painted frame, without a diagonal turn.
for (const width of [390, 1200, 1600]) {
  test(`new View panel enters on its responsive axis at ${width}px`, async () => {
    const fixture = await svelteBrowser(`<script lang="ts">
      import Panel from '@desert/svelte/views/Panel.svelte';
      import AdaptiveSurfaceLayout from '@desert/svelte/pieces/AdaptiveSurfaceLayout.svelte';
      import {surfaceFrame} from '@desert/interaction/surface-frame.ts';
      import {viewEventOwnership} from '@desert/web/client/view-events.ts';
      const ownership=viewEventOwnership();
      let open=$state(false), generation=$state(0);
      let owner=$derived(ownership.sync([generation],true).panel);
      const frame=surfaceFrame({version:'desert.surface-frame/6',kind:'message',top:{title:'Entry fixture'},
        content:{kind:'message',text:'The existing pane enters along one axis.'},bottom:{}});
    </script>
    <AdaptiveSurfaceLayout>
      <button onclick={()=>{generation++;open=true;}}>Open fixture</button>
      <Panel panel={open?{frame,label:'Entry fixture',locked:false,owner}:null} onevent={()=>open=false}/>
    </AdaptiveSurfaceLayout>`);
    try {
      const { page } = fixture;
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.addStyleTag({ content: await rendererCss() });
      for (const attempt of ['first', 'reopened']) {
        const frames = await page.getByRole("button", { name: "Open fixture" }).evaluate(async trigger => {
          const frames: { edge: string | null; opacity: number; dx: number; dy: number; x: number; y: number }[] = [];
          (trigger as HTMLButtonElement).click();
          for (let index = 0; index < 40; index++) {
            await new Promise(requestAnimationFrame);
            const pane = document.querySelector<HTMLElement>('.drawer');
            if (!pane) continue;
            const style = getComputedStyle(pane), rect = pane.getBoundingClientRect();
            const [dx = 0, dy = 0] = style.translate.split(' ').map(value => Number.parseFloat(value) || 0);
            frames.push({ edge: pane.getAttribute('data-edge'), opacity: Number(style.opacity), dx, dy, x: rect.x, y: rect.y });
          }
          return frames;
        });
        if (process.env.DESERT_PANEL_ENTRY_EVIDENCE) {
          const directory = process.env.DESERT_PANEL_ENTRY_EVIDENCE;
          await mkdir(directory, { recursive: true });
          await writeFile(`${directory}/responsive-${width}-${attempt}.json`, JSON.stringify(frames, null, 2));
        }
        const endpoint = frames.at(-1)!;
        // Percentage translations serialize as calc(...) while transitioning;
        // parseFloat is not a pixel measurement. Assert the painted travel.
        const entering = frames.filter(frame => width === 390
          ? frame.opacity > 0 && frame.opacity < 1 : frame.x - endpoint.x > .1);
        assert.ok(entering.length > 2, 'Entry paints intermediate frames, not an instant final pane');
        if (width !== 390) assert.ok(entering.every(frame => frame.opacity === 1),
          'lateral panes use the approved navigation translation without a separate opacity curve');
        const edge = width === 390 ? 'bottom' : 'right';
        assert.ok(entering.every(frame => frame.edge === edge), `All entry frames use ${edge}`);
        assert.ok(entering.every(frame => Math.abs(width === 390 ? frame.dx : frame.dy) < .1),
          'Entry never travels on the other axis');
        assert.ok(entering.some(frame => (width === 390 ? frame.y - endpoint.y : frame.x - endpoint.x) > 4), 'Entry has visible travel');
        assert.equal(endpoint.opacity, 1);
        assert.ok(entering.every(frame => Math.abs(width === 390 ? frame.x - endpoint.x : frame.y - endpoint.y) < .25),
          'Responsive host geometry is already stable while the pane enters');
        await page.locator('.drawer').getByRole('button', { name: 'Close', exact: true }).click();
        await page.locator('.drawer').waitFor({ state: 'detached' });
      }
      assert.deepEqual(fixture.errors, []);
    } finally { await fixture.close(); }
  });
}
