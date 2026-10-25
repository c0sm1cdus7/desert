// One content axis on a Visual Catalog page (slice 3 package): an unframed example (an avatar, a tag rail, a color bullet,
// an attention indicator) starts where its stack's titles and text start, the 1rem row inset; a framed one (a field)
// keeps its frame on the stack's edge, its content on that same axis. A home stack's rails start on its featured entry.
import assert from "node:assert/strict";
import test from "node:test";
import { mounted } from "./support/foundation.ts";

// Each owner's example, by the mark of the piece it shows, and where its box starts in a 354px stack.
const examples = [
  ["AvatarShuffle", "button", 16], ["SeedAvatar", "[data-avatar-seed]", 16], ["LabelRail", "[data-tag]", 16],
  ["ColorBullet", ".color-bullet", 16], ["ReferenceValues", "[data-tag]", 16], ["AttentionIndicator", "[data-attention-indicator]", 16],
  ["ReferenceSelector", "[data-slot]", 0],
] as const;

test("shared owner examples: an unframed example starts on the axis of the stack's text; a framed one on its edge", async () => {
  const f = await mounted(examples.map(([owner]) => `<div style="width:354px" data-probe-owner="${owner}">
  <Catalog.SharedOwnerSpecimen owner="${owner}" /></div>`).join("\n"));
  try {
    const read = await f.page.locator("[data-probe-owner]").evaluateAll((hosts, marks) => hosts.map((host, index) => {
      const left = host.getBoundingClientRect().left, region = host.querySelector("[data-view-item^='owner:'] > div")!;
      // The interaction notice is the region's last stack: its text reads at its paragraph's inline padding.
      const notice = region.lastElementChild!.querySelector("p")!, piece = region.querySelector(marks[index]!)!;
      return { example: Math.round(piece.getBoundingClientRect().left - left),
        text: Math.round(notice.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(notice).paddingLeft) - left) };
    }), examples.map(([, mark]) => mark));
    assert.deepEqual(read.map(item => item.text), examples.map(() => 16), "every notice reads on the row inset");
    assert.deepEqual(read.map((item, index) => [examples[index]![0], item.example]), examples.map(([owner, , left]) => [owner, left]));
  } finally { await f.close(); }
});

test("a home stack's rail starts on the axis of its title and featured entry, and still scrolls edge to edge", async () => {
  const f = await mounted(`<div style="width:354px" data-probe-host><Catalog.StackItem placement="surface" kind="catalog.home">
  <Catalog.CatalogHome node={inspectionCatalog.home} /></Catalog.StackItem></div>`,
  `  import { inspectionCatalog } from "@desert/svelte/catalog/compositions/inspection/inspection-fixture.ts";`);
  try {
    const read = await f.page.locator("[data-probe-host]").evaluate(host => {
      const left = host.getBoundingClientRect().left, at = (node: Element) => Math.round(node.getBoundingClientRect().left - left);
      const rail = host.querySelector("[role=region]")!, cards = [...host.querySelectorAll("[data-card]")]
        .filter(card => !card.parentElement!.closest("[data-card]"));
      return { featured: at(cards[0]!), heading: at(host.querySelector("h2, h3")!), first: at(cards[1]!), rail: at(rail),
        width: Math.round(rail.getBoundingClientRect().width) };
    });
    assert.deepEqual(read, { featured: 16, heading: 16, first: 16, rail: 0, width: 354 });
  } finally { await f.close(); }
});
