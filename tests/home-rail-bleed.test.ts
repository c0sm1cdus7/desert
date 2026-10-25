// A home stack's card rail scrolls edge to edge (third review of the slice 3 package): shown inside another page, the
// rail stopped at that page's content margin and cut its cards mid-word («Secor»). It bleeds to the surface's edge, over
// the margin its page leaves, while its first card stays on the axis of the rail's title.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

const card = { version: "desert.bank-node/1", kind: "catalog.card", presentation: "item", title: "Notebook cover",
  image: { asset: "notebook-cover", alt: "Notebook" } } as const;
test("a nested home rail bleeds to the surface's edge, its first card on its title's axis", async () => {
  const items = ["one", "two", "three", "four"].map(record => ({ ...card, record }));
  const f = await mounted(`<div class="place-insets-compact" style="width:390px">
    <div data-surface style="padding:0 var(--place-surface-inset)">
      <Catalog.StackItem kind="catalog.home" placement="surface">
        <CatalogHome node={{ version: "desert.bank-node/1", kind: "catalog.home", featured: { ...items[0], presentation: "featured", eyebrow: "Examples" },
          groups: [{ id: "illustrations", title: "Illustrations", items }] }} bodyOnly onevent={() => {}} />
      </Catalog.StackItem>
    </div></div>`, `  import CatalogHome from "@desert/svelte/catalog/compositions/catalog-home/CatalogHome.svelte";
  const card = ${JSON.stringify(card)};
  const items = ${JSON.stringify(items)};`);
  try {
    await f.page.setViewportSize({ width: 390, height: 800 });
    const seen = await f.page.evaluate(() => {
      const surface = document.querySelector("[data-surface]")!.getBoundingClientRect(), rail = document.querySelector('[role="region"][aria-label="Illustrations"]')!;
      const box = rail.getBoundingClientRect(), first = rail.firstElementChild!.getBoundingClientRect();
      const range = document.createRange(), heading = [...document.querySelectorAll("h2, h3, h4")].find(node => node.textContent?.trim() === "Illustrations")!;
      range.selectNodeContents(heading);
      return { surface: [surface.left, surface.right], rail: [box.left, box.right], first: first.left, title: range.getBoundingClientRect().left,
        scrolls: rail.scrollWidth > rail.clientWidth };
    });
    const shown = JSON.stringify(seen);
    assert.ok(seen.scrolls, `the four cards overflow the rail: ${shown}`);
    assert.deepEqual(seen.rail, seen.surface, `the rail scrolls from the surface's edge to its edge: ${shown}`);
    assert.ok(Math.abs(seen.first - seen.title) <= .5, `its first card starts on its title's axis: ${shown}`);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
