// Grid: auto-fitted tracks of one recipe with a gap from the spacing scale.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("grid: the contract offers a track recipe and a gap step, nothing else", async () => {
  assert.deepEqual(await contractShape("grid"), { tracks: ["tiles", "collections", "cards", "covers", "results"], gap: "GapSchema" });
});

test("grid: every track recipe has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("grid"), []);
});

test("grid: tiles and collections keep 18rem columns, cards 8rem, covers three equal columns", async () => {
  const f = await mounted(`<div style="width:900px" data-probe-host>
  {#each recipes as tracks}<Catalog.Grid {tracks} gap="regular"><span>a</span><span>b</span></Catalog.Grid>{/each}
</div>`, `  const recipes = ["tiles", "collections", "cards", "covers"] as const;`);
  try {
    const grids = await f.page.locator("[data-probe-host] > div").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return { columns: style.gridTemplateColumns.split(" ").filter(track => track !== "0px").length, gap: style.columnGap };
    }));
    // 900px at a 16px gap: three 18rem tracks fit (auto-fill keeps the empty one); two 8rem cards stretch (auto-fit collapses
    // the empty tracks to 0px).
    assert.deepEqual(grids, [{ columns: 3, gap: "16px" }, { columns: 3, gap: "16px" }, { columns: 2, gap: "16px" }, { columns: 3, gap: "16px" }]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("grid: results are three equal columns that become one when the grid's container is narrower than 37.75rem", async () => {
  const f = await mounted(`{#each [1280, 604, 603, 354] as width}<div style="width:{width}px" data-probe-host>
  <Catalog.Grid tracks="results" gap="close"><span>a</span><span>b</span><span>c</span></Catalog.Grid></div>{/each}`);
  try {
    const columns = await f.page.locator("[data-probe-host]").evaluateAll(hosts => hosts.map(host =>
      new Set([...host.querySelectorAll("span")].map(item => Math.round(item.getBoundingClientRect().left))).size));
    assert.deepEqual(columns, [3, 3, 1, 1]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("grid: no recipe lets its pieces overlap or leave the grid at any width; covers keep a cover's width per column", { timeout: 60000 }, async () => {
  // The evidence filler (the first three card specimens: two featured covers and a placeholder) in every recipe, from a
  // narrow column to a wide pane. A piece is laid out in its own track: never over its neighbour, never past the grid's edge.
  const widths = [280, 320, 358, 600, 900, 1248];
  const f = await mounted(`{#each recipes as tracks}{#each widths as width}<div style="width:{width}px" data-probe-host data-tracks={tracks}>
  <Catalog.Grid {tracks} gap="close">{#each cards as card, at (at)}<Catalog.Card {...card.props} />{/each}</Catalog.Grid></div>{/each}{/each}`,
  `  import { CardSpecimens } from "@desert/svelte/catalog/foundations/card/card.specimens.ts";
  const recipes = ["tiles", "collections", "cards", "covers", "results"] as const, widths = ${JSON.stringify(widths)};
  const cards = CardSpecimens.slice(0, 3);`);
  try {
    const found = await f.page.locator("[data-probe-host]").evaluateAll(hosts => hosts.map(host => {
      const grid = host.querySelector(".grid")!, box = grid.getBoundingClientRect();
      const items = [...grid.children].map(item => item.getBoundingClientRect());
      const outside = items.filter(item => item.left < box.left - .5 || item.right > box.right + .5).length;
      let overlaps = 0;
      for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
        const [p, q] = [items[a]!, items[b]!];
        if (Math.min(p.right, q.right) - Math.max(p.left, q.left) > .5 && Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top) > .5) overlaps++;
      }
      return { tracks: host.getAttribute("data-tracks"), width: host.getBoundingClientRect().width, outside, overlaps,
        columns: new Set(items.map(item => Math.round(item.left))).size, narrowest: Math.min(...items.map(item => item.width)) };
    }));
    assert.deepEqual(found.filter(item => item.outside || item.overlaps), [], "every piece stays in its own track");
    const cover = await f.page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement("div"));
      probe.style.width = "calc(var(--catalog-media-height) * 1.4)";
      const width = probe.getBoundingClientRect().width; probe.remove(); return width;
    });
    const covers = found.filter(item => item.tracks === "covers");
    // At most three columns, each at least a cover wide (a single column narrower than a cover fills the grid).
    assert.deepEqual(covers.map(item => item.columns), covers.map(item => Math.max(1, Math.min(3, Math.floor((item.width + 12) / (cover + 12))))));
    for (const item of covers) assert.ok(item.narrowest >= Math.min(cover, item.width) - .5, `covers at ${item.width}px keep a cover's width`);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
