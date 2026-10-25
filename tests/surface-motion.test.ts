import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { settleMotion } from "./web/fixture.ts";

// Independent acceptance: surfaces arrive/depart as one motion family; the grip
// is a slim affordance, not the initially focused action. A drag remains under
// direct control until release, and crossing a threshold can still be cancelled.
const directory = resolve("artifacts/surface-motion", process.env.DESERT_SURFACE_PHASE ?? "source");
async function fixture(reduced = false, locked = false) {
  const f = await svelteBrowser(`<script lang="ts">
    import TransientNode from '@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte';
    import ProblemNode from '@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte';
    import { SurfaceFrameVersion } from '@desert/interaction/surface-frame.ts';
    let panel = $state(false), message = $state(false);
    const frame = {version:SurfaceFrameVersion,kind:'specimen',top:{title:'Context'},
      content:{kind:'information',items:[{kind:'text',text:'Transient content.'}]},bottom:{}};
  </script><main data-surface-host>
    <button onclick={()=>panel=true}>Open panel</button><button onclick={()=>message=true}>Open message</button>
    <TransientNode node={{version:'desert.bank-node/1',kind:'transient',label:'Context',open:panel,locked:${locked},frame}} onevent={event=>{if(event.kind==='transient.close')panel=false;}} />
    <ProblemNode node={{version:'desert.bank-node/1',kind:'problem',open:message,title:'Message',description:'A focused message.',locked:false,severity:'error'}} onevent={event=>{if(event.kind==='problem.close')message=false;}} />
  </main>`);
  await f.page.setViewportSize({ width: 390, height: 740 });
  await f.page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference", colorScheme: "dark" });
  await f.page.addStyleTag({ content: await rendererCss() });
  await mkdir(directory, { recursive: true });
  return f;
}

test("panel and message share visible entrance and exit timing", async () => {
  const f = await fixture();
  const states = [];
  try {
    for (const kind of ["panel", "message"]) {
      // Sample painted geometry, not the implementation choice of keyframes vs
      // transitions. Start before opening so short entrances cannot be missed.
      await f.page.evaluate(() => {
        const samples: { state: string | null; opacity: number; translate: string; duration: string; easing: string }[] = [];
        (window as any).__surfaceSamples = samples;
        (window as any).__surfaceSampling = true;
        function sample() {
          const element = document.querySelector('[role="dialog"]');
          if (element) {
            const style = getComputedStyle(element);
            samples.push({ state: element.getAttribute('data-state'), opacity: Number(style.opacity),
              translate: style.translate, duration: style.transitionDuration, easing: style.transitionTimingFunction });
          }
          if ((window as any).__surfaceSampling) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
      await f.page.getByRole("button", { name: `Open ${kind}`, exact: true }).click();
      const dialog = f.page.getByRole("dialog"); await dialog.waitFor();
      await f.page.waitForFunction(() => {
        const panel = document.querySelector('[role="dialog"]');
        return panel && getComputedStyle(panel).opacity === '1';
      });
      await settleMotion(f.page);
      assert.equal(await dialog.evaluate(element => getComputedStyle(element).opacity), '1');
      await dialog.getByRole("button", { name: "Close", exact: true }).last().click();
      await dialog.waitFor({ state: "hidden" });
      const samples = await f.page.evaluate(() => {
        (window as any).__surfaceSampling = false;
        return (window as any).__surfaceSamples as { state: string; opacity: number; translate: string; duration: string; easing: string }[];
      });
      const entry = samples.filter(sample => sample.state === 'open');
      const exit = samples.filter(sample => sample.state === 'closed');
      await writeFile(resolve(directory, `${kind}-timing.json`), JSON.stringify({entry,exit}, null, 2));
      assert.ok(entry.some(sample => sample.opacity > 0 && sample.opacity < 1), `${kind} has painted intermediate entrance frames`);
      assert.ok(exit.some(sample => sample.opacity > 0 && sample.opacity < 1), `${kind} retains painted exit frames before removal`);
      assert.ok(entry.some(sample => sample.translate !== '0px' && sample.translate !== '0px 0px'), `${kind} moves, not only fades`);
      assert.ok(exit.at(-1)!.opacity < exit[0]!.opacity, `${kind} fades out progressively`);
      states.push({ kind, entry, exit });
    }
    await writeFile(resolve(directory, "surface-timing.json"), JSON.stringify(states, null, 2));
    assert.equal(states[0]!.entry[0]!.duration, states[1]!.entry[0]!.duration, 'shared entrance duration');
    assert.equal(states[0]!.entry[0]!.easing, states[1]!.entry[0]!.easing, 'shared entrance easing');
    assert.equal(states[0]!.exit[0]!.duration, states[1]!.exit[0]!.duration, 'shared exit duration');
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("compact grip has transparent hit region, small mark, and no automatic focus", async () => {
  const f = await fixture(true);
  try {
    await f.page.getByRole("button", { name: "Open panel", exact: true }).click();
    const grip = f.page.getByRole("button", { name: "Close panel", exact: true }); await grip.waitFor();
    const state = await grip.evaluate(element => {
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      const mark = element.querySelector('[data-drawer-grip-mark]')!.getBoundingClientRect();
      return { focused: element === document.activeElement, fill: style.backgroundColor,
        image: style.backgroundImage, width: box.width, height: box.height, markWidth: mark.width, markHeight: mark.height };
    });
    await grip.screenshot({ path: resolve(directory, "grip.png") });
    await writeFile(resolve(directory, "grip.json"), JSON.stringify(state, null, 2));
    assert.equal(state.focused, false, "initial focus belongs to task content, not grip");
    assert.equal(state.fill, "rgba(0, 0, 0, 0)"); assert.equal(state.image, "none");
    assert.ok(state.height >= 44 && state.width >= 44);
    assert.ok(state.markHeight <= 5 && state.markWidth <= 40);
    await grip.focus(); await f.page.keyboard.press("Enter");
    await f.page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

for (const reduced of [false, true]) test(`${reduced ? "reduced" : "full"} motion drag stays held and can reverse before release`, async () => {
  const f = await fixture(reduced);
  try {
    await f.page.getByRole("button", { name: "Open panel", exact: true }).click();
    const dialog = f.page.getByRole("dialog"), grip = f.page.getByRole("button", { name: "Close panel", exact: true });
    await grip.waitFor(); await settleMotion(f.page);
    const box = (await grip.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2;
    await f.page.mouse.move(x, y); await f.page.mouse.down(); await f.page.mouse.move(x, y + 140, { steps: 5 });
    const held = await dialog.isVisible();
    await writeFile(resolve(directory, `drag-${reduced}.json`), JSON.stringify({ heldPastThreshold: held }));
    assert.equal(held, true, "crossing threshold while held must not dismiss");
    const offset = await dialog.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m42);
    assert.ok(Math.abs(offset - 140) < 1, "surface follows pointer one-to-one");
    await f.page.mouse.move(x, y + 20, { steps: 5 }); await f.page.mouse.up();
    await f.page.waitForFunction(() => Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('[role="dialog"]')!).transform).m42) < .1);
    assert.equal(await dialog.isVisible(), true, "reversed drag cancels without closing");
    await f.page.mouse.move(x, y); await f.page.mouse.down(); await f.page.mouse.move(x, y + 140, { steps: 5 });
    await f.page.mouse.up(); await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(f.errors, []);
  } finally { await f.page.mouse.up().catch(() => {}); await f.close(); }
});

test("desktop header blank area drags, while title text and controls retain native interaction", async () => {
  const f = await fixture(true);
  try {
    await f.page.setViewportSize({ width: 1200, height: 900 });
    await f.page.getByRole("button", { name: "Open panel", exact: true }).click();
    const dialog = f.page.getByRole("dialog"); await dialog.waitFor();
    assert.equal(await dialog.getAttribute("data-edge"), "right");
    const title = (await dialog.locator(".toolbar-title").boundingBox())!;
    await f.page.mouse.move(title.x + 3, title.y + title.height / 2); await f.page.mouse.down();
    await f.page.mouse.move(title.x + 80, title.y + title.height / 2); await f.page.mouse.up();
    assert.equal(await dialog.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m41), 0);
    const header = (await dialog.locator(".workspace-header").boundingBox())!;
    const x = header.x + 100, y = header.y + header.height - 5;
    await f.page.mouse.move(x, y); await f.page.mouse.down(); await f.page.mouse.move(x + 140, y);
    assert.equal(await dialog.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m41), 140);
    await f.page.mouse.up(); await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
