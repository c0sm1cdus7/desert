// Column: a vertical stack whose gap is a step of the theme's spacing scale, at a measure and an inline alignment.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { GapSchema } from "../src/interaction/spacing.ts";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

const steps = ["snug", "close", "regular", "loose", "relaxed", "section"];

test("column: the contract offers a gap step, a measure and an alignment, nothing else", async () => {
  assert.deepEqual(await contractShape("column"), { gap: steps, "measure?": ["reading", "narrow", "wide"], "align?": ["start", "center", "stretch"] });
});

test("column: its gap axis, GapSchema and the theme's spacing tokens name the same steps", async () => {
  assert.deepEqual(GapSchema.anyOf.map(member => member.const), steps);
  const tokens = await readFile("src/svelte/catalog/mechanisms/theme/tokens.css", "utf8");
  assert.deepEqual([...tokens.matchAll(/--spacing-([a-z]+):/g)].map(match => match[1]), steps);
});

test("column: every gap × measure × alignment has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("column"), []);
});

test("column: gaps are the spacing steps; measures cap the width; alignment places pieces and centred text", async () => {
  const f = await mounted(`<div style="width:900px" data-probe-host>
  {#each gaps as gap}<Catalog.Column {gap}><span>a</span><span>b</span></Catalog.Column>{/each}
  <Catalog.Column gap="regular" measure="reading"><span>reading</span></Catalog.Column>
  <Catalog.Column gap="regular" measure="narrow" align="center"><span>narrow</span></Catalog.Column>
  <Catalog.Column gap="regular" measure="wide" align="start"><span>wide</span></Catalog.Column>
</div>`, `  const gaps = ["snug", "close", "regular", "loose", "relaxed", "section"] as const;`);
  try {
    const columns = await f.page.locator("[data-probe-host] > div").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node), box = node.getBoundingClientRect(), host = node.parentElement!.getBoundingClientRect();
      return { gap: style.rowGap, width: Math.round(box.width), left: Math.round(box.left - host.left), justify: style.justifyItems,
        text: style.textAlign, reading: node.hasAttribute("data-reading-measure") };
    }));
    assert.deepEqual(columns.slice(0, 6).map(column => column.gap), ["8px", "12px", "16px", "20px", "24px", "32px"]);
    assert.deepEqual(columns.slice(6).map(({ width, left, reading }) => ({ width, left, reading })),
      [{ width: 544, left: 0, reading: true }, { width: 480, left: 210, reading: false }, { width: 832, left: 0, reading: false }]);
    assert.deepEqual(columns.slice(7).map(({ justify, text }) => ({ justify, text })), [{ justify: "center", text: "center" }, { justify: "start", text: "start" }]);
    assert.equal(columns[0]?.justify, "normal", "without an alignment a column stretches its pieces, as a grid does");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
