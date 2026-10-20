import test from "node:test";
import assert from "node:assert/strict";
import { bankNode } from "../src/interaction/bank-node.ts";
import { surfaceFrame } from "../src/interaction/surface-frame.ts";

test("facts require a real label for every exposed field in standalone and composed slots", () => {
  const details = { kind: "facts", object: "place", fields: ["region"], facts: { region: "Asia" }, labels: { "place.region": "Region" } };
  assert.doesNotThrow(() => bankNode({ version: "desert.bank-node/1", kind: "fact", details }));
  for (const labels of [{}, { region: "Region" }, { "place.region": " " }]) {
    const invalid = { ...details, labels };
    assert.throws(() => bankNode({ version: "desert.bank-node/1", kind: "fact", details: invalid }), /INVALID_SURFACE_FRAME_LABELS/);
    assert.throws(() => surfaceFrame({ version: "desert.surface-frame/6", kind: "context", top: { title: "Place" },
      content: { kind: "context", details: invalid, actions: [] }, bottom: {} }), /INVALID_SURFACE_FRAME_LABELS/);
  }
});
