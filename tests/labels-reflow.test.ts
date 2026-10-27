import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("long labels reflow in editing and published facts at 320px and 200% text", async () => {
  const f = await svelteBrowser(`<script>
    import NodeRenderer from '@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte';
    const values=['🌵'.repeat(64),'x'.repeat(64),'Two words'];
  </script>
  <NodeRenderer node={{version:'desert.bank-node/1',kind:'control.labels',control:{version:'desert.control/1',
    kind:'labels',id:'projects',label:'Projects',disabled:false,values,limits:{maxItems:12,maxLength:64}}}} onevent={()=>{}}/>
  <NodeRenderer node={{version:'desert.bank-node/1',kind:'fact',details:{kind:'facts',object:'task',fields:['projects'],
    labels:{'task.projects':'Projects'},facts:{projects:values},tags:['projects']}}}/>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 320, height: 900 });
    await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
    assert.deepEqual(f.errors, []);
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth), 320);
    const expected = ["🌵".repeat(64), "x".repeat(64), "Two words"];
    // Lane B: the chosen labels are an Inline of Tags inside the control's titled stack (no longer a list named Labels).
    const editing = (await f.page.getByRole('group', { name: 'Projects', exact: true })
      .locator('[data-slot="badge"] > span').allTextContents()).map(value => value.trim());
    const published = await f.page.locator('[data-primitive="fact"] [data-tag] > span').allTextContents();
    assert.deepEqual(editing, expected);
    assert.deepEqual(published, expected);
    for (const label of expected) {
      const remove = f.page.getByRole("button", { name: `Remove ${label}`, exact: true });
      assert.equal(await remove.count(), 1);
      const bounds = await remove.boundingBox();
      assert.ok(bounds && bounds.width === 28 && bounds.height === 28, "rail removal is compact, never a stretched row action");
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("the shared badge keeps short neutral and status labels pixel-identical at normal and enlarged text", async () => {
  const badgePath = resolve(import.meta.dirname, "../src/svelte/vendor/components/ui/badge/badge.svelte");
  const current = await readFile(badgePath, "utf8");
  // The base before the reflow change, with today's corner (law 9d: a chip is a rounded rectangle, not the old capsule),
  // so only the reflow is compared.
  const previous = current.replace(/base: "[^"]*"/, 'base: "[--tag-radius:var(--radius-chip)] [--tag-inset:4px] h-5 gap-1 rounded-[var(--tag-radius)] px-2 py-0.5 text-xs font-medium transition-colors has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap [&>svg]:pointer-events-none"');
  const source = `<script>import NodeRenderer from '@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte';</script>
    {#each ['neutral','accent','success','warning','destructive'] as tone}
      <NodeRenderer node={{version:'desert.bank-node/1',kind:'control.tag',control:{version:'desert.control/1',
        kind:'tag',id:tone,label:'Work',tone,disabled:false}}}/>
    {/each}`;
  const old = await svelteBrowser(source, { [badgePath]: previous });
  const next = await svelteBrowser(source);
  try {
    const css = await rendererCss([previous]);
    for (const f of [old, next]) {
      await f.page.emulateMedia({ reducedMotion: "reduce" });
      await f.page.addStyleTag({ content: css });
    }
    for (const scale of [1, 2]) {
      for (const f of [old, next]) await f.page.evaluate(scale => document.documentElement.style.setProperty("--text-scale", String(scale)), scale);
      for (let index = 0; index < 5; index++) {
        const before = old.page.locator('[data-tag]').nth(index), after = next.page.locator('[data-tag]').nth(index);
        assert.deepEqual(await after.boundingBox(), await before.boundingBox());
        assert.ok((await after.screenshot()).equals(await before.screenshot()), `short badge ${index} at ${scale * 100}% text must remain pixel-identical`);
      }
    }
    assert.deepEqual([...old.errors, ...next.errors], []);
  } finally { await old.close(); await next.close(); }
});
