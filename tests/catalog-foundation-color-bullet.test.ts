// ColorBullet: the dot that shows a reference's color beside its text. It takes only the finite reference colors, and each
// has its own paint.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("color-bullet: the contract takes a reference color, the one closed list, nothing else", async () => {
  assert.deepEqual(await contractShape("color-bullet"), { color: "ReferenceColorSchema" });
});

test("color-bullet: its one state has its specimen", async () => {
  assert.deepEqual(await specimenFindings("color-bullet"), []);
});

test("color-bullet: every reference color paints a distinct, hidden, circular dot", async () => {
  const f = await mounted(`<div data-probe-host>{#each colors as color}<Catalog.ColorBullet {color} />{/each}</div>`,
    `  const colors = ["blue", "violet", "rose", "green", "amber", "slate"] as const;`);
  try {
    const dots = await f.page.locator("[data-probe-host] > span").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node), box = node.getBoundingClientRect();
      return { paint: style.backgroundColor, hidden: node.getAttribute("aria-hidden"), round: style.borderRadius, square: box.width === box.height };
    }));
    assert.equal(dots.length, 6);
    assert.equal(new Set(dots.map(dot => dot.paint)).size, 6);
    for (const dot of dots) assert.deepEqual({ ...dot, paint: undefined }, { paint: undefined, hidden: "true", round: "50%", square: true });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
