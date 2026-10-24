// Loading: skeleton lines or a spinner (the vendor skeleton and spinner families), hidden from assistive technology,
// announced by the label instead.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("loading: the contract offers a kind, the announced label, an inset and an id, nothing else", async () => {
  assert.deepEqual(await contractShape("loading"), { kind: ["lines", "spinner"], label: "text", "inset?": ["none", "block"], "id?": "string" });
});

test("loading: the block inset pads it like a status block, and the id names it for a card's description", async () => {
  const f = await mounted(`<div style="width:320px"><Catalog.Loading kind="lines" label="Loading content…" inset="block" id="pending" /></div>
<div style="width:320px"><Catalog.Loading kind="lines" label="Loading content…" /></div>
<div style="width:320px"><Catalog.Status title="Nothing here yet." tone="neutral" size="regular" heading={false} /></div>`);
  try {
    const [block, bare, status] = await f.page.evaluate(() => [...document.querySelectorAll("[data-loading], [data-status]")].map(node => {
      const style = getComputedStyle(node);
      return { id: node.id, padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft] };
    }));
    assert.deepEqual(block, { id: "pending", padding: status?.padding }, "the status block's 24px padding");
    assert.deepEqual(bare, { id: "", padding: ["0px", "0px", "0px", "0px"] });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("loading: every kind has exactly one specimen", async () => {
  assert.deepEqual(await specimenFindings("loading"), []);
});

test("loading: the drawing is hidden and the label is the one status; Availability's spinner is a Loading", async () => {
  const f = await mounted(`<Catalog.Loading kind="lines" label="Loading content…" />
<Catalog.Loading kind="spinner" label="Connecting…" />
<Catalog.Availability state="unknown" label="Checking the controller" />`);
  try {
    const loading = await f.page.locator("[data-loading]").evaluateAll(nodes => nodes.map(node => ({
      kind: node.getAttribute("data-loading"), skeletons: node.querySelectorAll("[data-slot=skeleton][aria-hidden=true]").length,
      spinner: node.querySelector("[data-slot=spinner]")?.getAttribute("aria-hidden") ?? null,
      status: [...node.querySelectorAll("[role=status]:not([aria-hidden=true])")].map(item => `${item.textContent}:${item.classList.contains("sr-only")}`),
    })));
    assert.deepEqual(loading, [
      { kind: "lines", skeletons: 2, spinner: null, status: ["Loading content…:true"] },
      { kind: "spinner", skeletons: 0, spinner: "true", status: ["Connecting…:true"] },
      { kind: "spinner", skeletons: 0, spinner: "true", status: ["Checking the controller:true"] },
    ]);
    assert.equal(await f.page.locator("[data-primitive=availability] [data-slot=spinner]").evaluate(node => getComputedStyle(node).width), "16px", "the spinning glyph keeps its 1rem box");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
