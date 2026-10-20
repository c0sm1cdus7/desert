import test from "node:test";
import assert from "node:assert/strict";
import { compilePublicCatalog, publicCatalogSurface, publicCatalogSchemas } from "../src/public-catalog/index.ts";
import { createShapeValidator } from "../src/validation.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";

const input = { version: "desert.bank-node/1", kind: "input.text", name: "draft", label: "Draft",
  value: "", required: false, disabled: false } as const;
const exercises = { title: "Travel kit", subtitle: "Local session draft only.",
  stacks: [{ id: "packing", title: "Packing", description: "Try a local input.", items: [input] }] };

test("authored exercises compile through the canonical bank and derive their semantic requirements", () => {
  const compiled = compilePublicCatalog({ ...catalogFixture(), exercises });
  assert.deepEqual(compiled.surface.exercises, exercises);
  assert.ok(Object.isFrozen(compiled.surface.exercises?.stacks[0]?.items));
  assert.ok(compiled.surface.requirements.nodes.includes("input.text"));
  assert.ok(compiled.surface.requirements.events.includes("input.change"));
  assert.ok(compiled.surface.requirements.features.includes("bank.local-draft"));
  assert.deepEqual(publicCatalogSurface(JSON.parse(JSON.stringify(compiled.surface))), compiled.surface);
});

test("catalog authoring, serialized surfaces and portable schemas reject collapsible content", () => {
  const summary = { version: "desert.bank-node/1", kind: "fact", details: {
    kind: "facts", object: "draft", fields: ["storage"], labels: { "draft.storage": "Storage" }, facts: { storage: "This tab" },
  } } as const;
  const legacy = { ...exercises, stacks: [{ ...exercises.stacks[0], items: [
    { kind: "disclosure", summary, items: [input] },
  ] }] };
  const validate = createShapeValidator(publicCatalogSchemas().exercises);
  assert.equal(validate(exercises).valid, true);
  assert.equal(validate(legacy).valid, false);
  assert.throws(() => compilePublicCatalog({ ...catalogFixture(), exercises: legacy }),
    { message: "INVALID_PUBLIC_CATALOG_DEFINITION" });
  const surface = compilePublicCatalog({ ...catalogFixture(), exercises }).surface;
  assert.throws(() => publicCatalogSurface({ ...surface, exercises: legacy }),
    { message: "INVALID_PUBLIC_CATALOG_SURFACE" });
});

test("local exercises reject ambiguous identity, host markup and business acceptance", () => {
  for (const invalid of [
    { ...exercises, stacks: [...exercises.stacks, ...exercises.stacks] },
    { ...exercises, stacks: [{ ...exercises.stacks[0], items: [input, input] }] },
    { ...exercises, class: "layout" },
    { ...exercises, stacks: [{ ...exercises.stacks[0], items: [{ ...input, onchange: () => {} }] }] },
    { ...exercises, stacks: [{ ...exercises.stacks[0], items: [{ version: "desert.bank-node/1", kind: "action", role: "primary",
      action: { intent: { kind: "accept" }, icon: "save", label: "Save", state: "ready" } }] }] },
  ]) assert.throws(() => compilePublicCatalog({ ...catalogFixture(), exercises: invalid }), /INVALID|JSON/);
});

test("exercise media uses declared logical assets and rejects legacy host paths", () => {
  const media = { version: "desert.bank-node/1", kind: "control.image", control: {
    version: "desert.control/1", kind: "image", id: "photo", label: "Photo", disabled: false,
    source: { asset: "parks.lake" }, alt: "A blue lake", aspect: "landscape",
  } } as const;
  const withMedia = (source: unknown) => ({ ...catalogFixture(), exercises: { ...exercises,
    stacks: [{ ...exercises.stacks[0], items: [{ ...media, control: { ...media.control, source } }] }],
  } });
  const compiled = compilePublicCatalog(withMedia({ asset: "parks.lake" }));
  assert.ok(compiled.surface.requirements.nodes.includes("control.image"));
  assert.deepEqual(publicCatalogSurface(JSON.parse(JSON.stringify(compiled.surface))), compiled.surface);
  assert.throws(() => compilePublicCatalog(withMedia({ asset: "missing" })), /INVALID_CATALOG_EXERCISE_ASSET/);
  assert.throws(() => compilePublicCatalog(withMedia("/local/path.jpg")), /INVALID_CATALOG_EXERCISE_HOST_MEDIA/);
});

test('place descriptions are required and inspiration can only open a declared public record', () => {
  const fixture = catalogFixture();
  assert.throws(() => compilePublicCatalog({ ...fixture, description: '' }), /INVALID_PUBLIC_CATALOG_DEFINITION/);
  const record = fixture.source.records[0]!;
  const hero = { version: 'desert.bank-node/1', kind: 'catalog.card', presentation: 'featured',
    record: record.id, title: 'Lake', eyebrow: 'Inspiration', actionLabel: 'Explore',
    image: { asset: record.image, alt: 'A lake' } };
  const compose = (node: unknown) => ({ ...fixture, exercises: { ...exercises,
    stacks: [{ id: 'inspiration', title: 'Inspiration', items: [node] }] } });
  const compiled = compilePublicCatalog(compose(hero));
  assert.equal(compiled.surface.description, fixture.description);
  assert.throws(() => compilePublicCatalog(compose({ ...hero, record: 'unknown' })), /EXERCISE_RECORD_REFERENCE/);
  assert.throws(() => compilePublicCatalog(compose({ ...hero, image: { ...hero.image, asset: 'unknown' } })), /EXERCISE_ASSET_REFERENCE/);
  const surface = JSON.parse(JSON.stringify(compiled.surface));
  surface.exercises.stacks[0].items[0].record = 'unknown';
  assert.throws(() => publicCatalogSurface(surface), /EXERCISE_RECORD_REFERENCE/);
});
