// Surface (slice 3, F1.9, DESIGN §1.6): the rename of place, absorbing scroll-edges and SurfaceFrame's section and
// viewport. Instance methods replace the bindable owner and viewport elements; a frame provides the surface host and its
// toolbar scrolling. Each role draws what place or surface-frame drew.
import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

/** The markup of each matched case in a canonical form: attributes sorted (their order is the template's, not a
 * difference), generated ids dropped, and the vendor sidebar slot the navigation viewport no longer writes (no
 * stylesheet or test selects it) left out. */
const canonicalMarkup = (cases: import("playwright").Locator) => cases.evaluateAll(items => {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof Element)) return "";
    const attributes = [...node.attributes].filter(attribute => !["id", "for", "aria-describedby"].includes(attribute.name)
      && !(attribute.name === "data-slot" && attribute.value === "sidebar-content"))
      .map(attribute => `${attribute.name}="${attribute.value}"`).sort().join(" ");
    return `<${node.localName} ${attributes}>${[...node.childNodes].map(walk).join("")}</${node.localName}>`;
  };
  return items.map(item => [...item.childNodes].map(walk).join(""));
});

const places = `<script lang="ts">
  import Place from "@desert/svelte/catalog/foundations/place/Place.svelte";
  import Surface from "@desert/svelte/catalog/foundations/surface/Surface.svelte";
  import Bar from "@desert/svelte/catalog/foundations/bar/Bar.svelte";
  let surface = $state<{ scrollToTop(): void; scrollTop(): number; scrollTo(top: number): void } | undefined>();
  let composing = $state<boolean[]>([]);
  Reflect.set(window, "surface", () => surface);
  Reflect.set(window, "composing", () => composing);
</script>
{#snippet top()}<Bar edge="top" purpose="commands" identity={{title:"Notes"}} identityRole="heading" trailing={[]} settingsPlaceholder={false} inert={false} />{/snippet}
{#snippet content()}<div style="height:2400px">Weekly plan</div>{/snippet}
<section data-case="main" style="height:400px;position:relative"><Place landmark="main" destination="notes" label="Notes" searching={false} {top} {content} /></section>
<section data-case="main" style="height:400px;position:relative"><Surface bind:this={surface} role="main" destination="notes" label="Notes" searching={false}
  oncomposition={active => composing = [...composing, active]} {top} {content} /></section>
<section data-case="navigation" style="height:400px;position:relative"><Place landmark="navigation" label="Main navigation" {top} {content} /></section>
<section data-case="navigation" style="height:400px;position:relative"><Surface role="navigation" label="Main navigation" searching={false} {top} {content} /></section>`;

test("main and navigation surfaces draw the place markup and pixels", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(places);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 800, height: 1800 });
    await f.page.evaluate(async () => { await document.fonts.ready; await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))); });
    for (const name of ["main", "navigation"]) {
      const cases = f.page.locator(`[data-case="${name}"]`);
      const [before, after] = await canonicalMarkup(cases);
      assert.equal(after, before, `${name}: markup`);
      assert.ok((await cases.nth(0).screenshot()).equals(await cases.nth(1).screenshot()), `${name}: pixels`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("the instance scrolls the viewport: scrollTo, scrollTop and scrollToTop; the top bar returns to the top", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(places);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const viewport = f.page.locator('[data-case="main"]').nth(1).locator("[data-catalog-scroll]");
    await f.page.evaluate(() => Reflect.get(window, "surface")().scrollTo(300));
    assert.equal(await f.page.evaluate(() => Reflect.get(window, "surface")().scrollTop()), 300);
    assert.equal(await viewport.evaluate(element => element.scrollTop), 300);
    const bar = f.page.locator('[data-case="main"]').nth(1).locator('[data-toolbar="top"]');
    await bar.locator("[data-toolbar-scroll-top]").waitFor({ state: "attached" });
    await f.page.evaluate(() => Reflect.get(window, "surface")().scrollToTop());
    assert.equal(await viewport.evaluate(element => element.scrollTop), 0);
    await f.page.evaluate(() => Reflect.get(window, "surface")().scrollTo(500));
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await bar.locator("[data-toolbar-heading]").click();
    await f.page.waitForFunction(() => document.querySelectorAll("[data-catalog-scroll]")[1]?.scrollTop === 0);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("text composition inside a place surface is raised as an event", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(places);
  try {
    const owner = f.page.locator('[data-case="main"]').nth(1).locator("[data-scroll-owner]");
    await owner.dispatchEvent("compositionstart");
    await owner.dispatchEvent("compositionend");
    assert.deepEqual(await f.page.evaluate(() => Reflect.get(window, "composing")()), [true, false]);
  } finally { await f.close(); }
});

const frames = `<script lang="ts">
  import SurfaceFrame from "@desert/svelte/catalog/compositions/surface-frame/SurfaceFrame.svelte";
  import Surface from "@desert/svelte/catalog/foundations/surface/Surface.svelte";
  import Toolbar from "@desert/svelte/catalog/compositions/toolbar/Toolbar.svelte";
  import FrameBody from "@desert/svelte/catalog/renderer/frame-body/FrameBody.svelte";
  const frame = { version: "desert.surface-frame/6", kind: "confirmation", top: { title: "Move note to Trash?" },
    content: { kind: "message", text: "You can restore the note from Trash." },
    bottom: { secondary: { label: "Cancel", icon: "back", state: "ready", intent: { kind: "back" } },
      primary: { label: "Move to Trash", icon: "archive", state: "ready", intent: { kind: "accept" } } } } as const;
  let submitted = $state(0);
  Reflect.set(window, "submitted", () => submitted);
</script>
<section data-case="frame" style="width:420px;height:320px;display:flex"><SurfaceFrame {frame} invoke={() => {}} /></section>
<section data-case="frame" style="width:420px;height:320px;display:flex"><Surface role="frame" presentation="standard" searching={false}>
  {#snippet top()}<Toolbar toolbar={{ edge: "top", ...frame.top }} invoke={() => {}} />{/snippet}
  {#snippet content()}<FrameBody content={frame.content} invoke={() => {}} edit={() => {}} messageDialog={false} />{/snippet}
  {#snippet bottom()}<Toolbar toolbar={{ edge: "bottom", ...frame.bottom }} invoke={() => {}} />{/snippet}
</Surface></section>
<section data-case="form" style="width:420px;height:320px;display:flex"><Surface role="frame" label="Journey" form={{ label: "Edit note" }} searching={false}
  onsubmit={() => submitted++}>
  {#snippet top()}<Toolbar toolbar={{ edge: "top", title: "Edit note", primary: { label: "Save", icon: "save", state: "ready", intent: { kind: "journey", journey: "edit" } } }}
    invoke={() => {}} submit="edit" />{/snippet}
  {#snippet content()}<p>Body</p>{/snippet}
</Surface></section>`;

test("a frame surface draws the surface-frame section, viewport and toolbars, pixel for pixel", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(frames);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.evaluate(async () => { await document.fonts.ready; await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))); });
    assert.deepEqual(f.errors, []);
    const cases = f.page.locator('[data-case="frame"]');
    const [before, after] = await canonicalMarkup(cases);
    // Surface marks the frame by presence; the composition wrote the frame schema version there (selected by presence only).
    assert.equal(after, before?.replace('data-surface-frame="desert.surface-frame/6"', 'data-surface-frame=""'));
    assert.ok((await cases.nth(0).screenshot()).equals(await cases.nth(1).screenshot()), "pixels");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a frame with a form submits it once through the submit event, never by navigation", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(frames);
  try {
    const form = f.page.getByRole("form", { name: "Edit note" });
    assert.equal(await form.count(), 1);
    assert.equal(await f.page.getByRole("region", { name: "Journey" }).count(), 1);
    await form.getByRole("button", { name: "Save" }).click();
    assert.equal(await f.page.evaluate(() => Reflect.get(window, "submitted")()), 1);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a page surface lays the access experience over its backdrop", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
  import Surface from "@desert/svelte/catalog/foundations/surface/Surface.svelte";
</script>
<Surface role="page" backdrop="mist" searching={false}>
  {#snippet top()}<h1>VOID</h1>{/snippet}
  {#snippet content()}<p>Unlock</p>{/snippet}
</Surface>`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const page = f.page.locator('[data-surface="page"]');
    assert.equal(await page.locator("[data-surface-backdrop] > *").count() > 0, true, "the backdrop draws its wallpaper");
    assert.equal(await page.locator("header[data-surface-page-top]").textContent(), "VOID");
    assert.equal(await page.locator("main[data-surface-page-content]").textContent(), "Unlock");
    assert.equal(await page.evaluate(element => getComputedStyle(element.querySelector("[data-surface-page-content]")!).display), "flex");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
