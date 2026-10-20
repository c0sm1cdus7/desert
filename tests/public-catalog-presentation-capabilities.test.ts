import test from "node:test";
import assert from "node:assert/strict";
import { bankNode } from "../src/interaction/bank-node.ts";
import type { Face } from "../src/interaction/face.ts";
import { publicCatalogRequirements, requirePublicCatalogCapabilities } from "../src/public-catalog/capabilities.ts";
import { compilePublicCatalog, publicCatalogSurface } from "../src/public-catalog/index.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";

const baseFeatures = ["catalog.browse", "catalog.search.local", "assets.logical"];
const legacy = (nodes: string[], events: string[]) => ({
  protocol: "desert.renderer-requirements/1", bank: "desert.bank-node/1",
  nodes: ["catalog.card", "catalog.home", "catalog.detail", ...nodes],
  events: ["catalog.open", "catalog.back", "catalog.search", ...events],
  features: [...baseFeatures, "bank.local-draft"],
});
const input = { version: "desert.bank-node/1", kind: "input.text", name: "draft", label: "Draft",
  value: "", required: false, disabled: false } as const;
const select = (face?: Face) => bankNode({ version: "desert.bank-node/1", kind: "control.select", control: {
  version: "desert.control/1", kind: "select", id: "choice", label: "Choice", required: false,
  value: "one", disabled: false, options: [{ value: "one", label: "One", disabled: false, ...(face ? { face } : {}) }],
} });
const money = (face?: Face) => bankNode({ version: "desert.bank-node/1", kind: "control.money", control: {
  version: "desert.control/1", kind: "money", id: "amount", label: "Amount", required: false,
  currency: "USD", minorUnits: "100", disabled: false,
  currencies: [{ code: "USD", scale: 2, ...(face ? { face } : {}) }],
} });

test("unmasked text and ordinary selection retain exactly their existing capability contracts", () => {
  assert.deepEqual(publicCatalogRequirements(), { ...legacy([], []), features: baseFeatures });
  assert.deepEqual(publicCatalogRequirements([bankNode(input)]), legacy(["input.text"], ["input.change"]));
  assert.deepEqual(publicCatalogRequirements([select()]), legacy(["control.select"], ["select.change"]));
});

test("decimal input masks reject old input-only renderers and accept an explicit mask capability", () => {
  const masked = bankNode({ ...input, mask: { kind: "decimal", locale: "de-DE", scale: 2 } });
  const requirements = publicCatalogRequirements([masked]);
  const candidate = legacy(["input.text"], ["input.change"]);
  assert.deepEqual(requirements.features, [...candidate.features, "input.mask.decimal"]);
  assert.throws(() => requirePublicCatalogCapabilities(candidate, requirements), /MISSING_RENDERER_CAPABILITY:features:input.mask.decimal/);
  assert.doesNotThrow(() => requirePublicCatalogCapabilities({ ...candidate,
    features: [...candidate.features, "input.mask.decimal"] }, requirements));
});

test("money requires decimal editing support even with no locale or face declared", () => {
  const requirements = publicCatalogRequirements([money()]);
  const candidate = legacy(["control.money"], ["money.change"]);
  assert.deepEqual(requirements.features, [...candidate.features, "input.mask.decimal"]);
  assert.throws(() => requirePublicCatalogCapabilities(candidate, requirements), /MISSING_RENDERER_CAPABILITY:features:input.mask.decimal/);
  assert.doesNotThrow(() => requirePublicCatalogCapabilities({ ...candidate,
    features: [...candidate.features, "input.mask.decimal"] }, requirements));
});

test("generic dropdown faces and new face kinds are independently negotiated", () => {
  for (const face of [{ kind: "document" }, { kind: "status", severity: "warning" },
    { kind: "symbol", text: "€" }, { kind: "flag", region: "EU" }] satisfies Face[]) {
    const requirements = publicCatalogRequirements([select(face)]);
    const candidate = legacy(["control.select"], ["select.change"]);
    const faceKinds = face.kind === "symbol" ? ["face.symbol"] : face.kind === "flag" ? ["face.flag"] : [];
    assert.deepEqual(requirements.features, [...candidate.features, "selection.faces", ...faceKinds]);
    assert.throws(() => requirePublicCatalogCapabilities(candidate, requirements), /MISSING_RENDERER_CAPABILITY:features:selection.faces/);
    const selectionCapable = { ...candidate, features: [...candidate.features, "selection.faces"] };
    if (faceKinds.length) assert.throws(() => requirePublicCatalogCapabilities(selectionCapable, requirements),
      new RegExp(`MISSING_RENDERER_CAPABILITY:features:face.${face.kind}`));
    assert.doesNotThrow(() => requirePublicCatalogCapabilities({ ...selectionCapable,
      features: [...selectionCapable.features, ...faceKinds] }, requirements));
  }
});

test("money faces combine editing and selection requirements without duplicating shared features", () => {
  const requirements = publicCatalogRequirements([money({ kind: "flag", region: "US" }),
    select({ kind: "flag", region: "AR" }), bankNode({ ...input, mask: { kind: "decimal", locale: "en-US", scale: 2 } })]);
  const candidate = legacy(["control.money", "control.select", "input.text"], ["money.change", "select.change", "input.change"]);
  const expected = [...candidate.features, "input.mask.decimal", "selection.faces", "face.flag"];
  assert.deepEqual(requirements.features, expected);
  for (const missing of ["input.mask.decimal", "selection.faces", "face.flag"]) {
    assert.throws(() => requirePublicCatalogCapabilities({ ...candidate, features: expected.filter(value => value !== missing) }, requirements),
      new RegExp(`MISSING_RENDERER_CAPABILITY:features:${missing}`));
  }
  assert.doesNotThrow(() => requirePublicCatalogCapabilities({ ...candidate, features: expected }, requirements));
});

test("shared toolbar faces require their new representation without claiming dropdown support", () => {
  for (const face of [{ kind: "symbol", text: "✦" }, { kind: "flag", region: "AR" }, { kind: "document" }] satisfies Face[]) {
    const node = bankNode({ version: "desert.bank-node/1", kind: "transient", label: "Details", open: false, locked: false,
      frame: { version: "desert.surface-frame/6", kind: "message", top: { title: "Details", face },
        content: { kind: "message", text: "Detail content" }, bottom: {} } });
    const requirements = publicCatalogRequirements([node]);
    const candidate = legacy(["transient"], []);
    const added = face.kind === "document" ? [] : [`face.${face.kind}`];
    assert.deepEqual(requirements.features, [...candidate.features, ...added]);
    if (added.length) assert.throws(() => requirePublicCatalogCapabilities(candidate, requirements),
      new RegExp(`MISSING_RENDERER_CAPABILITY:features:face.${face.kind}`));
    assert.doesNotThrow(() => requirePublicCatalogCapabilities({ ...candidate, features: [...candidate.features, ...added] }, requirements));
  }
});

test("compiled catalog surfaces publish required features and reject a stale requirement declaration", () => {
  const nodes = [bankNode({ ...input, mask: { kind: "decimal", locale: "en-US", scale: 2 } }), money({ kind: "symbol", text: "$" })];
  const compiled = compilePublicCatalog({ ...catalogFixture(), exercises: { title: "Numbers", subtitle: "Local values",
    stacks: [{ id: "numbers", title: "Numbers", description: "Edit values", items: nodes }] } });
  assert.deepEqual(compiled.surface.requirements.features,
    [...baseFeatures, "bank.local-draft", "input.mask.decimal", "selection.faces", "face.symbol"]);
  assert.deepEqual(publicCatalogSurface(JSON.parse(JSON.stringify(compiled.surface))), compiled.surface);
  assert.throws(() => publicCatalogSurface({ ...compiled.surface, requirements: {
    ...compiled.surface.requirements, features: [...baseFeatures, "bank.local-draft"],
  } }), /MISSING_RENDERER_CAPABILITY:features:input.mask.decimal/);
});
