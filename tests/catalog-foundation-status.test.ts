// Status: why there is nothing to show, as a centred block (the vendor empty family) or a compact caption.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("status: the contract offers a title, description, status glyph, tone, size and heading role, nothing else", async () => {
  assert.deepEqual(await contractShape("status"), {
    title: "text", "description?": "text", "icon?": ["info", "search", "image-off"], tone: ["neutral", "offline", "note"],
    size: ["regular", "compact", "prompt"], heading: "boolean", "label?": "text",
  });
});

test("status: a labelled block is named by its label; an unlabelled one has no name of its own", async () => {
  const f = await mounted(`<Catalog.Status title="Execution adapter required" description="Needs the local adapter." tone="note" size="compact" heading={false} icon="info" label="Specimen unavailable" />
<Catalog.Status title="Execution adapter required" description="Needs the local adapter." tone="note" size="regular" heading={false} label="Specimen unavailable" />
<Catalog.Status title="Nothing here yet." tone="note" size="compact" heading={false} />`);
  try {
    assert.equal(await f.page.getByRole("note", { name: "Specimen unavailable", exact: true }).count(), 2);
    assert.deepEqual(await f.page.locator("[data-status]").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-label"))),
      ["Specimen unavailable", "Specimen unavailable", null]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
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

test("status: a prompt (a search before its query) sets its title in the page role over a large glyph", async () => {
  const f = await mounted(`<Catalog.Status title="Search in Notes" description="Find content in this destination." tone="neutral" size="prompt" heading icon="search" />
<Catalog.Status title="Nothing here yet." description="Use “New note” to get started." tone="neutral" size="regular" heading icon="search" />`);
  try {
    const [prompt, regular] = await f.page.locator("[data-status]").evaluateAll(nodes => nodes.map(node => {
      const title = node.querySelector("[role=heading]")!, text = title.querySelector("span") ?? title;
      const header = node.querySelector("[data-slot=empty-header]")!, description = node.querySelector("[data-slot=empty-description]")!;
      return { size: getComputedStyle(text).fontSize, weight: getComputedStyle(text).fontWeight, level: title.getAttribute("aria-level"),
        glyph: Math.round(node.querySelector("svg")!.getBoundingClientRect().width), gap: getComputedStyle(header).rowGap,
        measure: getComputedStyle(header).maxWidth, copy: getComputedStyle(description).maxWidth };
    }));
    assert.deepEqual(prompt, { size: "22px", weight: "600", level: "2", glyph: 32, gap: "12px", measure: "512px", copy: "448px" });
    assert.equal(regular!.size, "16px", "a regular block keeps the section role");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
