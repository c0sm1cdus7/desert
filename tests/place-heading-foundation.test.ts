// PlaceHeading (slice 3, F1.9, DESIGN §1.6) moved from the compositions to the foundations and absorbed place-header:
// `context: "place"` is the old place heading, `context: "embedded"` the old place header. Same markup as before.
import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { placeHeadingBefore, placeHeaderBefore } from "./fixtures/place-heading-before.ts";

const compositions = resolve(import.meta.dirname, "../src/svelte/catalog/compositions");
// The old heading is mounted beside the old header (a folder that still exists, at the same depth as its old one).
const oldHeading = resolve(compositions, "place-header/PlaceHeadingBefore.svelte");
const oldHeader = resolve(compositions, "place-header/PlaceHeader.svelte");
const source = `<script lang="ts">
  import Before from "./src/svelte/catalog/compositions/place-header/PlaceHeadingBefore.svelte";
  import HeaderBefore from "./src/svelte/catalog/compositions/place-header/PlaceHeader.svelte";
  import PlaceHeading from "@desert/svelte/catalog/foundations/place-heading/PlaceHeading.svelte";
  const plain = { title: "Places", subtitle: "Explore places." };
  const pictured = { title: "Lake", subtitle: "A quiet shore.", media: { kind: "image" as const, asset: "lake.jpg", alt: "Lake at dawn" } };
  const background = { asset: "map.jpg", alt: "Map" };
</script>
<section data-case="place"><Before identity={plain} /></section>
<section data-case="place"><PlaceHeading context="place" title={plain.title} subtitle={plain.subtitle} /></section>
<section data-case="media"><Before identity={pictured} /></section>
<section data-case="media"><PlaceHeading context="place" title={pictured.title} subtitle={pictured.subtitle} media={pictured.media} /></section>
<section data-case="embedded"><HeaderBefore title="Component bank" subtitle="Interactive examples." /></section>
<section data-case="embedded"><PlaceHeading context="embedded" title="Component bank" subtitle="Interactive examples." /></section>
<section data-case="background"><HeaderBefore title="Atlas" subtitle="Maps." {background} /></section>
<section data-case="background"><PlaceHeading context="embedded" title="Atlas" subtitle="Maps." {background} /></section>`;

test("each context draws the markup of the composition it replaces", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source, { [oldHeading]: placeHeadingBefore, [oldHeader]: placeHeaderBefore }, "http://desert-place-heading.test/");
  try {
    await f.page.route("**/media/**", route => route.fulfill({ status: 404, body: "" }));
    await f.page.waitForTimeout(300);
    for (const name of ["place", "media", "embedded", "background"]) {
      const [before, after] = await f.page.locator(`[data-case="${name}"]`).evaluateAll(cases => cases.map(item => item.innerHTML.replace(/<!--[^>]*-->/g, "")));
      assert.ok(before && before.length > 40, `${name}: the old composition rendered`);
      assert.equal(after, before, name);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("only the place context is the focusable page title the shell docks", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source, { [oldHeading]: placeHeadingBefore, [oldHeader]: placeHeaderBefore }, "http://desert-place-title.test/");
  try {
    const title = f.page.locator('[data-case="place"]').nth(1).locator("[data-place-title]");
    assert.equal(await title.getAttribute("tabindex"), "-1");
    assert.equal(await f.page.locator('[data-case="place"]').nth(1).locator("[data-dock-above]").count(), 1);
    assert.equal(await f.page.locator('[data-case="embedded"]').nth(1).locator("[data-place-title]").getAttribute("tabindex"), null);
    assert.equal(await f.page.locator('[data-case="embedded"]').nth(1).locator("[data-dock-above]").count(), 0);
  } finally { await f.close(); }
});
