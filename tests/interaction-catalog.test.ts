import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { InteractionCatalog, requireCatalog } from "../src/interaction/catalog.ts";
import { deriveForm } from "../src/interaction/form.ts";

test("the interaction bank is versioned, closed and shared rather than copied per renderer", () => {
  const surface = compile(Notebook).surface("human");
  assert.deepEqual(surface.catalog, InteractionCatalog);
  assert.equal(Object.isFrozen(surface.catalog), true);
  assert.throws(() => requireCatalog({ ...InteractionCatalog, version: "invented" }), /CATALOG_MISMATCH/);
  assert.throws(() => requireCatalog({ ...InteractionCatalog, extra: "variant" }), /CATALOG_MISMATCH/);
  assert.equal(new Set(InteractionCatalog.entries.map(entry => entry.id)).size, InteractionCatalog.entries.length);
});

test("form needs come from the command and declared presentation, never field position", () => {
  const surface = compile(Notebook).surface("human");
  const create = surface.journeys.find(journey => journey.kind === "mutation" && !journey.subject)!;
  if (create.kind !== "mutation") throw new Error("Missing create journey");
  const fields = deriveForm(create, surface.inputs ?? {});
  assert.deepEqual(fields.map(field => [field.name, field.primitive, field.required]), [
    ["title", "input.text", true], ["body", "input.multiline", true],
  ]);
  assert.equal(fields[0]!.schema, create.inputSchema.properties.title);
  assert.equal(deriveForm({ ...create, inputFields: ["body", "title"] }, surface.inputs ?? {})[0]!.primitive, "input.multiline");
});

test("unknown product presentation and presentations of unexposed inputs fail compilation", () => {
  for (const inputs of [{ "note.body": "rainbow" }, { "note.owner": "input.text" }]) {
    const product = structuredClone(Notebook);
    Object.assign(product.surfaces[0]!, { inputs });
    assert.throws(() => compile(product));
  }
});

test("product contracts cannot tunnel component classes, styles or arbitrary variants into the renderer", () => {
  for (const presentation of [{ class: "custom-layout" }, { style: "color:red" },
    { inputs: { "note.body": { primitive: "input.multiline", variant: "special" } } }]) {
    const product = structuredClone(Notebook);
    Object.assign(product.surfaces[0]!, presentation);
    assert.throws(() => compile(product));
  }
});
