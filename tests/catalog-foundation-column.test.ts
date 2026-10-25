// Column: a vertical stack whose gap is a step of the theme's spacing scale, at a measure and an inline alignment.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { GapSchema } from "../src/interaction/spacing.ts";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

const steps = ["tight", "snug", "close", "regular", "loose", "relaxed", "section"];

test("column: the contract offers a gap step, a measure, an alignment, the place insets and fill, nothing else", async () => {
  assert.deepEqual(await contractShape("column"), { gap: steps, "measure?": ["reading", "narrow", "wide"], "align?": ["start", "center", "stretch"],
    "inset?": ["content", "reading", "block", "section", "row"], "leading?": "boolean", "fill?": "boolean" });
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
</div>`, `  const gaps = ["tight", "snug", "close", "regular", "loose", "relaxed", "section"] as const;`);
  try {
    const columns = await f.page.locator("[data-probe-host] > div").evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node), box = node.getBoundingClientRect(), host = node.parentElement!.getBoundingClientRect();
      return { gap: style.rowGap, width: Math.round(box.width), left: Math.round(box.left - host.left), justify: style.justifyItems,
        text: style.textAlign, reading: node.hasAttribute("data-reading-measure") };
    }));
    assert.deepEqual(columns.slice(0, 7).map(column => column.gap), ["4px", "8px", "12px", "16px", "20px", "24px", "32px"]);
    assert.deepEqual(columns.slice(7).map(({ width, left, reading }) => ({ width, left, reading })),
      [{ width: 544, left: 0, reading: true }, { width: 480, left: 210, reading: false }, { width: 832, left: 0, reading: false }]);
    assert.deepEqual(columns.slice(8).map(({ justify, text }) => ({ justify, text })), [{ justify: "center", text: "center" }, { justify: "start", text: "start" }]);
    assert.equal(columns[0]?.justify, "normal", "without an alignment a column stretches its pieces, as a grid does");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

// Lane D (slice 3): the place insets the catalog compositions took from catalog-media.css (`[data-catalog-group-title]`'s
// content inset, `[data-catalog-prose]`'s reading block, the rails' section padding and the page-level leading inset), as
// Column props.
test("column: the content inset, the reading block, the section and the leading inset are the place's; the row inset is 1rem", async () => {
  const f = await mounted(`<div style="width:900px;--place-content-inset:42px;--place-leading-inset:100px" data-probe-host>
  <Catalog.Column gap="snug" inset="content"><span>title</span></Catalog.Column>
  <Catalog.Column gap="snug" inset="reading"><span>prose</span></Catalog.Column>
  <Catalog.Column gap="snug" inset="reading" leading><span>page prose</span></Catalog.Column>
  <Catalog.Column gap="snug" inset="section"><span>rails</span></Catalog.Column>
  <Catalog.Column gap="snug"><span>plain</span></Catalog.Column>
  <Catalog.Column gap="snug" inset="row"><span>example</span></Catalog.Column>
  <Catalog.Column gap="snug" inset="block"><span>nested document</span></Catalog.Column>
</div>
<div style="width:900px" data-probe-fallback>
  <Catalog.Column gap="snug" inset="content"><span>title</span></Catalog.Column>
  <Catalog.Column gap="snug" inset="reading"><span>prose</span></Catalog.Column>
</div>`);
  try {
    const insets = (host: string) => f.page.locator(`${host} > div`).evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node), span = node.firstElementChild!.getBoundingClientRect(), frame = node.parentElement!.getBoundingClientRect();
      return { padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].join(" "), margin: style.marginLeft,
        text: Math.round(span.left - frame.left) };
    }));
    // A reading block insets by the content inset less the 1rem row inset its stack layouts and items carry.
    assert.deepEqual(await insets("[data-probe-host]"), [
      { padding: "0px 42px 0px 42px", margin: "0px", text: 42 },
      { padding: "24px 26px 48px 26px", margin: "0px", text: 26 },
      { padding: "24px 26px 48px 26px", margin: "100px", text: 126 },
      { padding: "24px 0px 24px 0px", margin: "0px", text: 0 },
      { padding: "0px 0px 0px 0px", margin: "0px", text: 0 },
      // Slice 3 package: an unframed example (an avatar, a tag rail) reads on its stack's 1rem row inset, whatever the place.
      { padding: "0px 16px 0px 16px", margin: "0px", text: 16 },
      // Second review: a document shown inside another page keeps the reading block's padding and its host's axis.
      { padding: "24px 0px 48px 0px", margin: "0px", text: 0 },
    ]);
    // Outside a place the insets keep catalog-media.css's fallbacks: 42px for a rail title, 26px for prose at its row inset.
    assert.deepEqual((await insets("[data-probe-fallback]")).map(item => item.text), [42, 10]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("column: fill takes its container's height and gives what its pieces leave to a block that grows (a status)", async () => {
  const f = await mounted(`<div style="width:600px;height:500px" data-probe-host>
  <Catalog.Column gap="relaxed" fill><Catalog.Heading kind="page" text="Results in Notes" />
    <Catalog.Status title="No matching results" tone="neutral" size="regular" heading={false} /></Catalog.Column>
</div>`);
  try {
    const [column, heading, status] = await f.page.evaluate(() => ["[data-probe-host] > div", "h1", "[data-status]"]
      .map(selector => { const box = document.querySelector(selector)!.getBoundingClientRect(); return { top: Math.round(box.top), height: Math.round(box.height) }; }));
    assert.equal(column!.height, 500, "the column fills its container");
    assert.equal(status!.top, heading!.top + heading!.height + 24, "the pieces keep the column's gap");
    assert.equal(status!.top + status!.height, column!.top + 500, "the growing block takes the rest of the height");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
