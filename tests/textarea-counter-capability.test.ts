import test from "node:test";
import assert from "node:assert/strict";
import { bankNode } from "../src/interaction/bank-node.ts";
import { publicCatalogRequirements, requirePublicCatalogCapabilities } from "../src/public-catalog/capabilities.ts";
import { compilePublicCatalog, publicCatalogSurface } from "../src/public-catalog/index.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";

const base = { version: "desert.bank-node/1", kind: "input.multiline", name: "notes", label: "Notes",
  value: "", required: false, disabled: false } as const;
const feature = "input.length-hint";

test("authored multiline maxima require an advisory length-hint capability, including zero", () => {
  for (const maxLength of [0, 280]) {
    const requirements = publicCatalogRequirements([bankNode({ ...base, maxLength })]);
    assert.ok(requirements.features.includes(feature), `Maximum ${maxLength} needs an explicit renderer hint capability`);
    const olderHost = { ...requirements, features: requirements.features.filter(value => value !== feature) };
    assert.throws(() => requirePublicCatalogCapabilities(olderHost, requirements),
      /MISSING_RENDERER_CAPABILITY:features:input.length-hint/);
    assert.doesNotThrow(() => requirePublicCatalogCapabilities(requirements, requirements));
    assert.equal(requirements.features.filter(value => value === feature).length, 1);
  }
});

test("unlimited multiline and single-line metadata do not claim a length-hint requirement", () => {
  for (const node of [base, { ...base, kind: "input.text", maxLength: 0 },
    { ...base, kind: "input.text", maxLength: 280 }]) {
    assert.equal(publicCatalogRequirements([bankNode(node)]).features.includes(feature), false);
  }
});

test("portable catalog exercises retain length-hint requirements after serialization", () => {
  const nodes = [bankNode({ ...base, maxLength: 0 }), bankNode({ ...base, name: "summary", maxLength: 280 })];
  const compiled = compilePublicCatalog({ ...catalogFixture(), exercises: { title: "Writing", subtitle: "Local drafts",
    stacks: [{ id: "writing", title: "Writing", description: "Write locally", items: nodes }] } });
  assert.ok(compiled.surface.requirements.features.includes(feature));
  assert.equal(compiled.surface.requirements.features.filter(value => value === feature).length, 1);
  assert.deepEqual(publicCatalogSurface(JSON.parse(JSON.stringify(compiled.surface))), compiled.surface);
  assert.throws(() => publicCatalogSurface({ ...compiled.surface, requirements: { ...compiled.surface.requirements,
    features: compiled.surface.requirements.features.filter(value => value !== feature),
  } }), /MISSING_RENDERER_CAPABILITY:features:input.length-hint/);
});
