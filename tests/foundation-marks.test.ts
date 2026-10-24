// Slice 3 (F1.8): Face, Availability, Wallpaper, Icon, Clock and AttentionIndicator style only classes they write, Face
// draws its own round mark instead of the vendor avatar, and theme.css no longer styles `.bank-face` or `.bank-status`.
// Every pixel is unchanged: each case is measured in today's tree and in the frozen sources of 53f9c47.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import type { Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { treeViolations } from "./fixtures/tree-violations.ts";
import { marksBefore } from "./fixtures/marks-before.ts";

const root = resolve(import.meta.dirname, "..");
const folders = ["face", "availability", "wallpaper", "icon", "clock", "attention-indicator"]
  .map(id => `src/svelte/catalog/foundations/${id}/`);
const frozenTheme = marksBefore["src/svelte/theme.css"] ?? "";
const frozen = Object.fromEntries(Object.entries(marksBefore).filter(([path]) => path.endsWith(".svelte"))
  .map(([path, source]) => [resolve(root, path), source]));

const cases = `<script lang="ts">
  import Face from "@desert/svelte/catalog/foundations/face/Face.svelte";
  import Availability from "@desert/svelte/catalog/foundations/availability/Availability.svelte";
  import Wallpaper from "@desert/svelte/catalog/foundations/wallpaper/Wallpaper.svelte";
  import Icon from "@desert/svelte/catalog/foundations/icon/Icon.svelte";
  import Clock from "@desert/svelte/catalog/foundations/clock/Clock.svelte";
  import AttentionIndicator from "@desert/svelte/catalog/foundations/attention-indicator/AttentionIndicator.svelte";
  import DestinationRow from "@desert/svelte/catalog/foundations/destination-row/DestinationRow.svelte";
</script>
<main style="width:600px">
  <div data-case="face-icon"><Face face={{kind:"icon",icon:"catalog"}} /></div>
  <div data-case="face-document"><Face face={{kind:"document"}} /></div>
  <div data-case="face-warning"><Face face={{kind:"status",severity:"warning"}} /></div>
  <div data-case="face-error"><Face face={{kind:"status",severity:"error"}} /></div>
  <div data-case="face-symbol"><Face face={{kind:"symbol",text:"$"}} /></div>
  <div data-case="face-flag"><Face face={{kind:"flag",region:"AR"}} /></div>
  <div data-case="face-compact"><Face face={{kind:"flag",region:"BR"}} compact /></div>
  <div data-case="face-compact-icon"><Face face={{kind:"icon",icon:"open"}} compact /></div>
  <div data-case="face-host" style="--face-size:40px"><Face face={{kind:"symbol",text:"€"}} /></div>
  <div data-case="availability-ready"><Availability state="ready" label="Sync is ready" /></div>
  <div data-case="availability-unavailable"><Availability state="unavailable" label="Sync is unavailable offline" /></div>
  <div data-case="availability-unknown"><Availability state="unknown" label="Checking sync" /></div>
  <div data-case="wallpaper-silk" style="position:relative;width:300px;height:200px"><Wallpaper wallpaper="silk" /></div>
  <div data-case="wallpaper-mist" style="position:relative;width:300px;height:200px"><Wallpaper wallpaper="mist" /></div>
  <div data-case="wallpaper-preview" style="width:300px"><Wallpaper wallpaper="plain" preview /></div>
  <div data-case="chevron" style="display:flex;width:12px"><span>long text</span><Icon name="chevron-right" chevron decorative /></div>
  <div data-case="icon-tone"><Icon name="circle-check" tone="success" decorative /></div>
  <div data-case="clock"><Clock /></div>
  <div data-case="attention-inline" style="display:flex"><AttentionIndicator required placement="inline" /></div>
  <div data-case="face-in-row" style="width:300px"><DestinationRow destination="notes" label="Notes" icon="catalog" available open={()=>{}} /></div>
  <div data-case="attention-overlay" style="position:relative;width:200px;height:100px"><AttentionIndicator required placement="overlay" /></div>
</main>`;

const styleKeys = ["color", "border-radius", "background-color", "background-image", "display", "gap", "font-size", "line-height",
  "font-weight", "font-family", "letter-spacing", "margin-bottom", "padding-right", "position", "top", "right", "overflow",
  "flex-shrink", "align-items", "justify-content", "aspect-ratio", "stroke", "fill", "stroke-width", "box-shadow", "text-wrap",
  "pointer-events", "user-select", "width", "height"];

/** Box and computed style of every element of each case, in document order, plus each one's ::after. */
const measure = (page: Page) => page.evaluate(keys => {
  const read = (element: Element, pseudo?: string) => {
    const style = getComputedStyle(element, pseudo), box = element.getBoundingClientRect();
    return { box: [box.x, box.y, box.width, box.height].map(value => Math.round(value * 100) / 100),
      style: Object.fromEntries(keys.map(key => [key, style.getPropertyValue(key)])) };
  };
  return Object.fromEntries([...document.querySelectorAll("[data-case]")].map(element => [element.getAttribute("data-case"),
    [...element.querySelectorAll("*")].map(node => ({ tag: node.tagName.toLowerCase(), ...read(node),
      after: getComputedStyle(node, "::after").content === "none" ? null : read(node, "::after").style }))]));
}, styleKeys);

async function render(overrides: Readonly<Record<string, string>>, css: string) {
  const f = await svelteBrowser(cases, overrides, undefined, { initialCss: css });
  await f.page.emulateMedia({ reducedMotion: "reduce" });
  await f.page.setViewportSize({ width: 800, height: 1200 });
  return f;
}

test("marks: their folders import no foreign vendor and style no element and nothing global; theme.css styles no face or status", async () => {
  assert.deepEqual(await treeViolations(folders, ["F", "G"]), []);
  const theme = await readFile(resolve(root, "src/svelte/theme.css"), "utf8");
  assert.doesNotMatch(theme, /\.bank-(face|status)\b/, "the face and the availability line own their rules");
});

test("marks: Face draws its own round mark; every mark keeps the pixels of 53f9c47", { timeout: 60000 }, async () => {
  const [before, after] = [await render(frozen, await rendererCss([], frozenTheme)), await render({}, await rendererCss())];
  try {
    assert.equal(await after.page.locator('[data-slot="avatar"]').count(), 0, "Face no longer mounts the vendor avatar");
    assert.equal(await after.page.locator('[data-piece="face"]').count(), 10);
    const [was, is] = [await measure(before.page), await measure(after.page)];
    for (const name of Object.keys(was)) assert.deepEqual(is[name], was[name], name);
    assert.deepEqual([before.errors, after.errors], [[], []]);
  } finally { await before.close(); await after.close(); }
});
