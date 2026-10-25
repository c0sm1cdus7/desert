// Slice 3 (lane D): the media and catalog compositions are composed of foundations only, and they keep the pixels of the
// trees they replace, rendered live beside their frozen sources (tests/fixtures/media-compositions-before.ts) at a catalog
// workspace's insets. The differences are DESIGN's: the media list item's label takes the row's medium weight (§1.4); the
// catalog rails' title margins become Column gaps (§7.3: 24px above a rail's title, 12px under it, 12px between cards
// where the rail drew 14px); and the rail and detail titles return to the content axis the theme's heading margins gave
// them before F1a removed those margins.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { squareCorners, withoutRadius } from "./fixtures/curvature-family.ts";
import type { Page } from "playwright";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { measureProbes, renderCases, settle, type Probes } from "./fixtures/parity.ts";
import { mediaCompositionsBefore, mediaCompositionsBeforeOverrides, nestedCatalogFeaturedInsetBefore } from "./fixtures/media-compositions-before.ts";
import { mediaPage } from "./fixtures/media-compositions-cases.ts";
import { controlsBefore } from "./fixtures/controls-before.ts";
import { pixelDifference } from "./fixtures/pixel-difference.ts";

// The catalog card as the foundation it was before lane B recomposed it over Card (its folder is gone): the frozen trees
// mount it through the dispatcher, at the composition's path (the same depth, so its relative imports resolve).
const catalogCard = "src/svelte/catalog/foundations/catalog-card/CatalogCard.svelte";
const frozenCard = { [resolve(import.meta.dirname, "..", "src/svelte/catalog/compositions/catalog-card/CatalogCard.svelte")]: controlsBefore[catalogCard] ?? "" };

/** Probe selectors per side: the frozen tree's marks, and today's foundation marks. */
const probes = (side: "before" | "after"): Probes => {
  const was = side === "before";
  return {
    list: { artwork: "[data-media-image], [data-media-artwork-placeholder]", dot: "[data-attention-indicator]",
      label: was ? "text:[data-media-row-description]" : "text:.row-label" },
    "home-nested": { featured: was ? "[data-catalog-card]" : "[data-card]", card: was ? "[data-catalog-rail] [data-catalog-card]" : '[role="region"] [data-card]',
      title: "h2" },
    "home-page": { card: was ? "[data-catalog-card]" : "[data-card]", title: "h2" },
    detail: { gallery: "[data-photo-collection]", legend: "text:legend", prose: was ? "text:[data-catalog-prose] p" : 'text:[data-view-item="about"] p' },
  };
};
type Measured = Awaited<ReturnType<typeof measureProbes>>;
const boxes = (value: Measured, name: string, probe: string) => (value[name]?.[probe] ?? []).map(item => item.box);
const caseShot = (page: Page, name: string) => page.locator(`[data-case="${name}"]`).screenshot({ animations: "disabled" });

test("media and catalog compositions keep the frozen trees' pixels, but for DESIGN's rail rhythm and row weight", { timeout: 120000 }, async () => {
  const css = await rendererCss([...Object.values(mediaCompositionsBefore), ...Object.values(frozenCard)]);
  const [was, is] = [await renderCases(mediaPage, { ...mediaCompositionsBeforeOverrides, ...frozenCard }, css + nestedCatalogFeaturedInsetBefore),
    await renderCases(mediaPage, {}, css)];
  try {
    for (const f of [was, is]) {
      // No image is served here: each public image settles on its fallback before anything is measured (a private one
      // waits for its lease in both trees alike).
      await f.page.waitForFunction(() => ["tiles", "list", "image", "object-image", "detail"].every(name =>
        document.querySelector(`[data-case="${name}"] [data-image-state="error"]`) !== null));
      await settle(f.page);
    }
    // Law 9e (slice 3): an artwork placeholder is a face, the theme's face primitive (white ground, its own hairline), where
    // the frozen tree drew a muted ground, and its corner is its frame's (the frame clipped it before); face-material.test.ts
    // measures it. Both trees set ground, hairline and corner aside here, so
    // everything else still compares. The avatar is a seed drawing now, never initials (avatar-identity.test.ts): it has no
    // frozen pixels to keep.
    for (const f of [was, is]) await f.page.addStyleTag({ content: "[data-media-artwork-placeholder] { background:none !important; position:static !important; border-radius:0 !important; }"
      + " [data-media-artwork-placeholder]::after { content:none !important; }" });
    // Design §7.1 radius exception (law 9d): both sides square their corners; tests/curvature-family.test.ts owns them.
    for (const f of [was, is]) await f.page.addStyleTag({ content: squareCorners });
    // Grids, covers, controls and media objects: the same pixels (a grid's rounded corners antialias a level or two apart).
    for (const name of ["tiles", "covers", "tag", "image", "object-image", "object-missing"]) {
      const [a, b] = [await caseShot(was.page, name), await caseShot(is.page, name)];
      assert.deepEqual(await pixelDifference(is.page, a, b, 2), { count: 0, within: true }, `${name}: the same pixels`);
    }
    const [old, now] = [withoutRadius(await measureProbes(was.page, probes("before"))), withoutRadius(await measureProbes(is.page, probes("after")))];
    // The media list: the same artwork, attention dot and label boxes; the label is the row's medium weight (§1.4).
    for (const probe of ["artwork", "dot"]) assert.deepEqual(now.list?.[probe], old.list?.[probe], `list/${probe}`);
    assert.deepEqual(boxes(now, "list", "label").map(box => box.slice(0, 2)), boxes(old, "list", "label").map(box => box.slice(0, 2)));
    assert.deepEqual(now.list?.label?.map(item => item.style["font-weight"]), ["500", "500", "500"]);
    // A nested catalog: its featured entry keeps the stack item's content inset.
    // (The stack item now caps the card at its width, max-width 100%, which the featured card's box never reaches.)
    assert.deepEqual(boxes(now, "home-nested", "featured")[0], boxes(old, "home-nested", "featured")[0], "featured entry (the first card)");
    for (const [name, axis] of [["home-nested", 16], ["home-page", 40 + 42]] as const) {
      const cards = boxes(now, name, "card"), titles = boxes(now, name, "title"), before = boxes(old, name, "card");
      // Titles sit on the content axis (the place's content inset, past the leading inset on a page); cards keep the rail's.
      assert.deepEqual(titles.map(box => box[0]), titles.map(() => axis), `${name}: titles on the content axis`);
      assert.deepEqual(cards.map(box => box[2]), before.map(box => box[2]), `${name}: card sizes`);
      assert.equal(cards[0]?.[0], before[0]?.[0], `${name}: the rail starts where it did`);
      assert.equal((cards[1]?.[0] ?? 0) - ((cards[0]?.[0] ?? 0) + (cards[0]?.[2] ?? 0)), 12, `${name}: 12px between cards`);
      // §7.3: a rail's title sits 12px over its cards, and each rail 24px under what precedes it.
      for (const [index, [, top = 0, , height = 0] = []] of titles.entries()) {
        const rail = cards.find(box => (box[1] ?? 0) > top);
        assert.equal(Math.round((rail?.[1] ?? 0) - (top + height)), 12, `${name}: title ${index} to its rail`);
      }
      assert.equal(Math.round((titles[1]?.[1] ?? 0) - ((cards[1]?.[1] ?? 0) + (cards[1]?.[3] ?? 0))), 24, `${name}: 24px between rails`);
    }
    assert.equal(Math.round((boxes(now, "home-page", "title")[0]?.[1] ?? 0)), 24, "the rails' section starts 24px under the place heading");
    // A detail: the photograph is unchanged; its reading keeps its axis, 8px lower under the title (its margin as a gap).
    assert.deepEqual(now.detail?.gallery, old.detail?.gallery, "detail photograph");
    for (const probe of ["legend", "prose"]) {
      const [then, today] = [boxes(old, "detail", probe)[0] ?? [], boxes(now, "detail", probe)[0] ?? []];
      assert.deepEqual([today[0], today[2], today[3], (today[1] ?? 0) - (then[1] ?? 0)], [then[0], then[2], then[3], 8], `detail ${probe}`);
    }
    assert.deepEqual([was.errors, is.errors], [[], []]);
  } finally { await was.close(); await is.close(); }
});
