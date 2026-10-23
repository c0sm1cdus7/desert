import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

for (const composition of ["retained-bank", "view-panel"] as const) {
  test(`first transient entry preserves the installed motion: ${composition}`, async () => {
    const fixture = await svelteBrowser(`<script lang="ts">
      import Panel from '@desert/svelte/views/Panel.svelte';
      import BankRenderer from '@desert/svelte/BankRenderer.svelte';
      import {surfaceFrame} from '@desert/interaction/surface-frame.ts';
      import {viewEventOwnership} from '@desert/web/client/view-events.ts';
      const ownership=viewEventOwnership();
      const owner=ownership.sync(['entry'],true).panel;
      let open=$state(false);
      const frame=surfaceFrame({version:'desert.surface-frame/6',kind:'message',top:{title:'Entry fixture'},
        content:{kind:'message',text:'Same frame, same primitive, same first-open motion.'},bottom:{}});
    </script>
    <button onclick={()=>open=true}>Open fixture</button>
    ${composition === "view-panel"
      ? '<Panel panel={open?{frame,label:"Entry fixture",locked:false,owner}:null} onevent={()=>open=false} />'
      : '<BankRenderer node={{version:"desert.bank-node/1",kind:"transient",label:"Entry fixture",frame,open,locked:false}} onevent={()=>open=false} />'}`);
    try {
      await fixture.page.setViewportSize({ width: 390, height: 844 });
      await fixture.page.emulateMedia({ reducedMotion: "no-preference" });
      await fixture.page.addStyleTag({ content: await rendererCss() });
      const recording = fixture.page.evaluate(async () => {
        const frames = [];
        for (let index = 0; index < 40; index++) {
          await new Promise(requestAnimationFrame);
          const pane = document.querySelector<HTMLElement>('.drawer');
          if (!pane) { frames.push({ index, present: false }); continue; }
          const style = getComputedStyle(pane);
          frames.push({ index, present: true, opacity: Number(style.opacity), translate: style.translate,
            starting: pane.hasAttribute('data-starting-style'), animations: pane.getAnimations().map(animation => {
              const timing = animation.effect?.getComputedTiming();
              return { progress: timing?.progress, duration: timing?.duration, state: animation.playState };
            }) });
        }
        return frames;
      });
      await fixture.page.getByRole("button", { name: "Open fixture", exact: true }).click();
      const frames = await recording;
      const directory = process.env.DESERT_PANEL_ENTRY_EVIDENCE;
      if (directory) {
        await mkdir(directory, { recursive: true });
        await writeFile(`${directory}/${composition}.json`, JSON.stringify(frames, null, 2));
      }
      assert.ok(frames.some(frame => frame.present && frame.opacity! > 0 && frame.opacity! < 1),
        "First mount must visibly enter, not appear already opaque");
      assert.ok(frames.some(frame => frame.animations?.some(animation => animation.progress! > 0 && animation.progress! < 1)),
        "Entry must traverse semantic motion progress, independent of frame timing");
      assert.equal(frames.at(-1)?.opacity, 1, "Entry settles at the visible endpoint");
      assert.deepEqual(fixture.errors, []);
    } finally { await fixture.close(); }
  });
}
