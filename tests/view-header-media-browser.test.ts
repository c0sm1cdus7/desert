import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import type { Route } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { program, surface } from "./fixtures/view-program.ts";

const candidate = { ...program, views: program.views.map((view, index) =>
  index !== 0 && index !== 4 ? view : { ...view, content: view.content.map(item => item.kind === "header" ? {
    ...item, media: index ? { kind: "image", asset: "forest", alt: "A forest" } : { kind: "gallery", images: [
      { asset: "coast", alt: "A coast" }, { asset: "peak", alt: "A peak" },
    ] },
  } : item) }) };
const source = `<script>
  import Workspace from './src/svelte/catalog/renderer/workspace/Workspace.svelte';
  import { viewProgramModel } from './src/web/client/view-program.ts';
  import { onDestroy } from 'svelte';
  const model=viewProgramModel(${JSON.stringify(candidate)},${JSON.stringify(surface)},()=>true);
  let snapshot=$state.raw(model.snapshot());
  const unsubscribe=model.subscribe(()=>snapshot=model.snapshot());
  let mounted=$state(false);
  onDestroy(()=>{unsubscribe();model.stop();});
  globalThis.openOther=()=>model.navigate('catalog');
</script><button onclick={()=>mounted=true}>Mount fixture</button>
{#if mounted}<Workspace {...snapshot} onevent={model.event} onnavigate={model.navigate}/>{/if}`;

for (const width of [390, 1280]) test(`authored header shares gallery, silent loading and viewer at ${width}px`, async () => {
  const fixture = await svelteBrowser(source, {}, "http://header.test/");
  const held: Route[] = [], requests: string[] = [];
  try {
    const { page } = fixture;
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.route("**/media/**", route => {
      const asset = new URL(route.request().url()).pathname;
      requests.push(asset);
      if (asset === "/media/peak" || asset === "/media/forest") { held.push(route); return; }
      return route.fulfill({ contentType: "image/svg+xml", body:
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#69867a"/></svg>' });
    });
    await page.addStyleTag({ content: await rendererCss() });
    const prefetched = page.waitForRequest(request => new URL(request.url()).pathname === "/media/peak");
    await page.getByRole("button", { name: "Mount fixture", exact: true }).click();
    const header = page.locator("[data-place-header]"), image = header.locator("[data-media-image]");
    await header.locator('[data-image-state="ready"]').waitFor();
    await prefetched;
    assert.ok(requests.includes("/media/peak"), "Neighbor image prefetch uses shared owner");
    const dots = header.locator("[data-media-dots] button");
    const first = (await dots.nth(0).boundingBox())!, second = (await dots.nth(1).boundingBox())!;
    assert.equal(second.x - first.x, 24);
    assert.equal(first.height, 44);
    await dots.nth(1).click();
    await page.waitForFunction(() => document.querySelector('[data-place-header] img')?.getAttribute('src')?.includes('peak'));
    assert.equal(await image.getAttribute("data-image-state"), "loading");
    assert.equal(await image.locator("img").evaluate(item => getComputedStyle(item).visibility), "hidden");
    assert.equal(await header.locator('[role="status"],[role="progressbar"]').count(), 0);
    assert.equal(await page.getByText("Loading image", { exact: true }).count(), 0);
    await header.locator("[data-media-open]").click();
    const viewer = page.locator("[data-media-viewer]");
    await viewer.waitFor();
    assert.equal(await viewer.locator("[data-toolbar-subtitle]").textContent(), "2 / 2");
    assert.equal(await viewer.locator("[data-media-stage] img").evaluate(item => getComputedStyle(item).visibility), "hidden");
    await viewer.getByRole("button", { name: "Previous media", exact: true }).click();
    await viewer.locator('[data-image-state="ready"]').first().waitFor();
    await viewer.getByRole("button", { name: "Zoom in", exact: true }).click();
    // The reset is an icon action now (DESIGN §7.7): the zoom is read from the image itself.
    assert.match(await viewer.locator("[data-media-stage] img").evaluate(item => item instanceof HTMLElement ? item.style.transform : ""), /scale\(2\)/);
    await viewer.getByRole("button", { name: "Close media viewer", exact: true }).click();
    await viewer.waitFor({ state: "detached" });
    assert.ok(await header.locator("[data-media-open]").evaluate(button => button === document.activeElement));
    await page.evaluate(() => (globalThis as any).openOther());
    await page.waitForFunction(() => document.querySelector('[data-place-header] img')?.getAttribute('src')?.includes('forest'));
    assert.equal(await header.locator("[data-media-dots]").count(), 0);
    assert.equal(await image.locator("img").evaluate(item => getComputedStyle(item).visibility), "hidden");
    await mkdir("artifacts/view-header-media", { recursive: true });
    await page.screenshot({ path: `artifacts/view-header-media/${width}-silent.png` });
    assert.deepEqual(fixture.errors, []);
  } finally {
    await Promise.all(held.map(route => route.abort().catch(() => {})));
    await fixture.close();
  }
});
