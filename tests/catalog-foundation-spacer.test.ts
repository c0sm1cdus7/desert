// Spacer: an empty space of one spacing step, or the space left over in a row.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("spacer: the contract offers a spacing step or fill, nothing else", async () => {
  assert.deepEqual(await contractShape("spacer"), { size: ["snug", "close", "regular", "relaxed", "section", "fill"] });
});

test("spacer: every size has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("spacer"), []);
});

test("spacer: a step is a square of its length, hidden from assistive technology; fill takes what a row leaves", async () => {
  const f = await mounted(`<div data-probe-steps style="display:flex;align-items:flex-start">{#each steps as size}<Catalog.Spacer {size} />{/each}</div>
<div data-probe-row style="display:flex;width:400px"><span style="width:100px">a</span><Catalog.Spacer size="fill" /><span style="width:50px">b</span></div>`,
  `  const steps = ["snug", "close", "regular", "relaxed", "section"] as const;`);
  try {
    const steps = await f.page.locator("[data-probe-steps] > div").evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return `${box.width}x${box.height}:${node.getAttribute("aria-hidden")}`;
    }));
    assert.deepEqual(steps, ["8x8:true", "12x12:true", "16x16:true", "24x24:true", "32x32:true"]);
    assert.equal(await f.page.locator("[data-probe-row] > div").evaluate(node => node.getBoundingClientRect().width), 250);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
