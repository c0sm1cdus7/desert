import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { svelteBrowser } from '../fixtures/svelte-browser.ts';
import { rendererCss } from '../fixtures/renderer-css.ts';

// Exercise the actual shared decoration and reading mask, not a copied gradient.
const source = `<script>
 import { onMount } from 'svelte';
 import ScrollEdges from './src/svelte/pieces/ScrollEdges.svelte';
 import { toolbarReadingBoundary } from './src/svelte/pieces/toolbar-reading-boundary.ts';
 let owner, viewport, compact;
 onMount(() => { const boundary = toolbarReadingBoundary(viewport, compact);
   boundary.paint(1); return boundary.dispose; });
</script>
<div bind:this={owner} data-scroll-owner style="position:relative;width:390px;height:500px;background:var(--background)">
 <div data-toolbar="top" style="position:absolute;top:0;height:56px;width:100%"><div bind:this={compact}></div></div>
 <div bind:this={viewport} data-fade-viewport data-surface-slot="content" style="height:500px;overflow-y:auto">
  <div data-fade-probe style="height:2000px;background:var(--background)"></div>
 </div>
 <div data-toolbar="bottom" style="position:absolute;bottom:0;height:56px;width:100%"></div>
 <ScrollEdges {viewport} {owner} />
</div>`;
const css = rendererCss();
const paint = async (page: Awaited<ReturnType<typeof svelteBrowser>>['page']) =>
  page.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); });

async function sample(page: Awaited<ReturnType<typeof svelteBrowser>>['page'], positions: number[]) {
  const screenshot = await page.screenshot();
  return page.evaluate(async ({ encoded, positions }) => {
    const image = new Image(); image.src = 'data:image/png;base64,' + encoded; await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return positions.map(y => [...context.getImageData(180, y, 1, 1).data].slice(0, 3));
  }, { encoded: screenshot.toString('base64'), positions });
}

for (const theme of ['dark', 'light'] as const) test(`toolbar fade resolves to the page background in ${theme}`, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await css });
    await f.page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    await f.page.locator('[data-fade-viewport]').evaluate(e => e.scrollTop = 200);
    await paint(f.page);
    const colors = await sample(f.page, [8, 55, 64, 72, 80, 88, 250, 412, 420, 428, 436, 444, 492]);
    const evidence = 'artifacts/toolbar-background-fade';
    await mkdir(evidence, { recursive: true });
    await f.page.screenshot({ path: `${evidence}/${theme}.png`, clip: { x: 0, y: 0, width: 390, height: 500 } });
    const canvas = colors[6]!;
    // Chromium's premultiplied 8-bit gradient paint can round by one channel step.
    for (const [index, color] of colors.entries()) assert.ok(color.every((channel, i) => Math.abs(channel - canvas[i]!) <= 1),
      `blank canvas must not become darker/lighter beyond 1/255 at sample ${index}: ${JSON.stringify(colors)}`);
    const edges = await f.page.locator('[data-scroll-edge]').evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node), pseudo = getComputedStyle(node, '::after');
      return { edge: node.getAttribute('data-scroll-edge'), active: node.getAttribute('data-active'),
        feather: node.getBoundingClientRect().height - parseFloat(style.getPropertyValue('--edge-core')),
        gradient: pseudo.backgroundImage, filter: pseudo.backdropFilter, opacity: pseudo.opacity };
    }));
    assert.equal(edges.length, 2);
    assert.deepEqual(edges.map(edge => edge.active), ['true', 'true']);
    assert.deepEqual(edges.map(edge => edge.feather), [32, 32]);
    assert.deepEqual(edges.map(edge => edge.filter), ['none', 'none']);
    assert.deepEqual(edges.map(edge => edge.opacity), ['1', '1']);
    const normalize = (gradient: string) => gradient.replace(/to (?:top|bottom),\s*/, '');
    assert.equal(normalize(edges[0]!.gradient), normalize(edges[1]!.gradient), 'same fade mirrored at both edges');

    const probes: number[][][] = [];
    for (const background of ['white', 'black']) {
      await f.page.locator('[data-fade-probe]').evaluate((e, color) => e.style.background = color, background);
      await paint(f.page); probes.push(await sample(f.page, [8, 55, 64, 72, 80, 88, 250]));
    }
    assert.deepEqual(probes[0]![0], colors[0], 'white content is fully masked under the reading core');
    assert.deepEqual(probes[1]![0], colors[0], 'black content is fully masked under the reading core');
    assert.deepEqual(probes[0]![1], probes[1]![1], 'the entire 56px core stays quiet');
    const transmission = probes[0]!.map((rgb, i) => Math.abs(rgb[0]! - probes[1]![i]![0]!));
    assert.equal(transmission[0], 0); assert.equal(transmission[1], 0);
    assert.ok(transmission[2]! > 0 && transmission[2]! < transmission[3]! && transmission[3]! < transmission[4]!
      && transmission[4]! < transmission[5]!, `content returns progressively through the feather: ${transmission}`);
    assert.equal(transmission[5], 255, 'content is fully visible beyond the feather');
    await writeFile(`${evidence}/${theme}.json`, JSON.stringify({ theme, colors, edges, probes, transmission }, null, 2));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
