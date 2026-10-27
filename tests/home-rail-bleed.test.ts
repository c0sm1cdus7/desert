// A home stack's card rail scrolls edge to edge (third review of the slice 3 package): shown inside another page, the
// rail stopped at that page's content margin and cut its cards mid-word («Secor»). Inside a retained place, which pads
// its content by its surface inset, the rail bleeds over that padding to the surface's edge while its first card stays
// where it was, on the title's margin (the stack's row inset: the axis of the title and the featured entry); where nothing
// pads it, it bleeds over nothing (it never runs past the surface). The first card on the title's margin is the approved
// look (owner decision V3, 2026-10-25), not a provisional one.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

const card = { version: "desert.bank-node/1", kind: "catalog.card", presentation: "item", title: "Notebook cover",
  image: { asset: "notebook-cover", alt: "Notebook" } } as const;
const items = ["one", "two", "three", "four"].map(record => ({ ...card, record }));
const home = `<Catalog.StackItem kind="catalog.home" placement="surface">
  <CatalogHome node={{ version: "desert.bank-node/1", kind: "catalog.home", featured: { ...items[0], presentation: "featured", eyebrow: "Examples" },
    groups: [{ id: "illustrations", title: "Illustrations", items }] }} bodyOnly onevent={() => {}} /></Catalog.StackItem>`;

test("a nested home rail bleeds to the surface's edge inside a padded place, and over nothing outside one", async () => {
  const f = await mounted(`<div class="place-insets-compact" style="width:390px" data-surface="padded">
      <Catalog.ViewRegion kind="retained" id="nested" inset>${home}</Catalog.ViewRegion></div>
    <div class="place-insets-compact" style="width:390px" data-surface="bare">${home}</div>`,
  `  import CatalogHome from "@desert/svelte/catalog/compositions/catalog-home/CatalogHome.svelte";
  const items = ${JSON.stringify(items)};`);
  try {
    await f.page.setViewportSize({ width: 390, height: 1600 });
    const seen = await f.page.evaluate(() => [...document.querySelectorAll("[data-surface]")].map(scope => {
      const surface = scope.getBoundingClientRect(), rail = scope.querySelector('[role="region"][aria-label="Illustrations"]')!;
      const box = rail.getBoundingClientRect(), first = rail.firstElementChild!.getBoundingClientRect(), stack = scope.querySelector("[data-stack-item]")!.getBoundingClientRect();
      return { surface: [surface.left, surface.right], stack: stack.left, rail: [box.left, box.right], first: first.left,
        scrolls: rail.scrollWidth > rail.clientWidth };
    }));
    const [padded, bare] = seen, shown = JSON.stringify(seen);
    assert.ok(padded!.scrolls && bare!.scrolls, `the four cards overflow the rail: ${shown}`);
    assert.deepEqual(padded!.rail, padded!.surface, `inside a padded place the rail scrolls from the surface's edge to its edge: ${shown}`);
    assert.ok(padded!.stack > padded!.surface[0]! && Math.abs(padded!.first - padded!.stack - 16) <= .5,
      `its first card stays on the stack's row inset: ${shown}`);
    assert.deepEqual(bare!.rail, bare!.surface, `with nothing padding it, the rail spans its stack and never runs past the surface: ${shown}`);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

// Fourth review of the slice 3 package, read on a four-card photo at 1280: inside a padded place whose content stands in a
// narrower reading column (the Visual Catalog's examples, 52rem), the rail stopped at that column's end and cut its fourth
// card mid-word, 156px short of the surface's edge. A rail runs to the place's edge on both sides, whatever column holds it.
test("a nested home rail in a narrower column still runs to the place's edge", async () => {
  const f = await mounted(`<div class="place-insets" style="width:1000px" data-surface="wide">
      <Catalog.ViewRegion kind="retained" id="nested" inset><div style="max-width:520px">${home}</div></Catalog.ViewRegion></div>`,
  `  import CatalogHome from "@desert/svelte/catalog/compositions/catalog-home/CatalogHome.svelte";
  const items = ${JSON.stringify(items)};`);
  try {
    await f.page.setViewportSize({ width: 1000, height: 1600 });
    const seen = await f.page.evaluate(() => { const scope = document.querySelector("[data-surface]")!, surface = scope.getBoundingClientRect();
      const rail = scope.querySelector('[role="region"][aria-label="Illustrations"]')!, box = rail.getBoundingClientRect();
      const stack = scope.querySelector("[data-stack-item]")!.getBoundingClientRect();
      return { surface: [surface.left, surface.right], rail: [box.left, box.right], stack: [stack.left, stack.right],
        first: rail.firstElementChild!.getBoundingClientRect().left, scrolls: rail.scrollWidth > rail.clientWidth }; });
    const shown = JSON.stringify(seen);
    assert.ok(seen.stack[1]! < seen.surface[1]! - 100, `the column is narrower than the place: ${shown}`);
    assert.ok(seen.scrolls, `the four cards overflow the rail: ${shown}`);
    assert.deepEqual(seen.rail, seen.surface, `the rail runs from the place's edge to its edge: ${shown}`);
    assert.ok(Math.abs(seen.first - seen.stack[0]! - 16) <= .5, `its first card stays on the stack's row inset: ${shown}`);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
