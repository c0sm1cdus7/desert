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
