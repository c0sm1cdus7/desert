// Loading: skeleton lines or a spinner (the vendor skeleton and spinner families), hidden from assistive technology,
// announced by the label instead.
import assert from "node:assert/strict";
import test from "node:test";
import { contractShape, mounted, specimenFindings } from "./support/foundation.ts";

test("loading: the contract offers a kind and the announced label, nothing else", async () => {
  assert.deepEqual(await contractShape("loading"), { kind: ["lines", "spinner"], label: "text" });
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
