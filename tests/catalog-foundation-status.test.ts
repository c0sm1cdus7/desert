// Status: why there is nothing to show, as a centred block (the vendor empty family) or a compact caption.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("status: the contract offers a title, description, status glyph, tone, size and heading role, nothing else", async () => {
  assert.deepEqual(await contractShape("status"), {
    title: "text", "description?": "text", "icon?": ["info", "search", "image-off"], tone: ["neutral", "offline", "note"],
    size: ["regular", "compact"], heading: "boolean",
  });
});

test("status: every tone × size has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("status"), []);
});

test("status: a block titles itself as a level-2 heading; offline announces itself, a note is a note; compact is a caption", async () => {
  const f = await mounted(`<Catalog.Status title="Nothing here yet." description="Use “New note” to get started." tone="neutral" size="regular" heading icon="search" />
<Catalog.Status title="Controller unavailable." description="Reconnect to load this content." tone="offline" size="regular" heading />
<Catalog.Status title="Execution adapter required" description="Needs the local adapter." tone="note" size="compact" heading={false} icon="info" />`);
  try {
    const blocks = await f.page.locator("[data-status]").evaluateAll(nodes => nodes.map(node => ({
      tone: node.getAttribute("data-status"), role: node.getAttribute("role"), empty: node.getAttribute("data-slot") === "empty",
      heading: node.querySelector("[role=heading]")?.getAttribute("aria-level") ?? null, glyph: node.querySelector("svg") !== null,
      size: getComputedStyle(node.querySelector("[data-slot=empty-title], strong")!).fontSize,
    })));
    assert.deepEqual(blocks, [
      { tone: "neutral", role: null, empty: true, heading: "2", glyph: true, size: "16px" },
      { tone: "offline", role: "status", empty: true, heading: "2", glyph: false, size: "16px" },
      { tone: "note", role: "note", empty: false, heading: null, glyph: true, size: "11px" },
    ]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
