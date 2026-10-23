// The catalog declaration API and its literal reader share one schema: what defineFoundation accepts at
// authoring time is exactly what the gate reads as data from source, without evaluating the file.
import assert from "node:assert/strict";
import test from "node:test";
import { defineComposition, defineFoundation, defineMechanism, validateDeclaration } from "../src/authoring/catalog/define.ts";
import { readDeclarations } from "../src/authoring/catalog/read-declaration.ts";

const FieldContract = Object.freeze({ props: {}, events: {} });
const field = {
  id: "field", purpose: "A labelled single-field well.",
  owner: { entry: "Field.svelte", parts: ["field.css"], vendor: ["input-group"], mechanisms: ["pane-material"] },
  shape: "radius", states: ["empty", "value"], variants: { purpose: ["text", "current-password"] },
  approval: "required", contract: FieldContract,
} as const;

test("a valid foundation declaration is returned frozen with its kind", () => {
  const declared = defineFoundation(field);
  assert.equal(declared.kind, "foundation");
  assert.equal(declared.id, "field");
  assert.ok(Object.isFrozen(declared) && Object.isFrozen(declared.owner));
});

test("a foundation declaration rejects unknown fields, foreign shapes, malformed ids and optional approval", () => {
  const invalid: readonly unknown[] = [{ ...field, colour: "red" }, { ...field, shape: "pill" }, { ...field, id: "Field" },
    { ...field, approval: "none" }, { ...field, states: [] }];
  for (const value of invalid) assert.throws(() => validateDeclaration("foundation", value), /CATALOG_DECLARATION/);
});

test("a composition names the pieces it uses and has no shape", () => {
  const declared = defineComposition({ id: "lock-screen", purpose: "Unlock the selected identity.",
    owner: { entry: "LockScreen.svelte" }, uses: ["field", "button"], approval: "required", contract: FieldContract });
  assert.equal(declared.kind, "composition");
  const shaped: unknown = { id: "x", purpose: "x", owner: { entry: "X.svelte" }, uses: [], approval: "none",
    contract: FieldContract, shape: "radius" };
  assert.throws(() => validateDeclaration("composition", shaped), /CATALOG_DECLARATION/);
});

test("a mechanism has exactly one owner", () => {
  assert.equal(defineMechanism({ id: "pane-material", owner: "theme", files: ["pane-material.css"] }).kind, "mechanism");
  const ownerless: unknown = { id: "pane-material", owner: "", files: [] };
  assert.throws(() => validateDeclaration("mechanism", ownerless), /CATALOG_DECLARATION/);
});

const source = `import { defineFoundation } from "@desert/authoring/catalog/define.ts";
import { FieldContract } from "./field.contract.ts";
export const Field = defineFoundation({
  id: "field", purpose: "A labelled single-field well.",
  owner: { entry: "Field.svelte", parts: ["field.css"], vendor: ["input-group"], mechanisms: ["pane-material"] },
  shape: "radius", states: ["empty", "value"], variants: { purpose: ["text", "current-password"] },
  approval: "required", contract: FieldContract,
} as const);
`;

test("the reader returns the same data the declaration API accepts, without evaluating the file", () => {
  const [read] = readDeclarations("field.catalog.ts", source);
  assert.ok(read);
  assert.equal(read.kind, "foundation");
  assert.equal(read.binding, "Field");
  assert.deepEqual(read.contract, { identifier: "FieldContract" });
  const { kind, contract, ...data } = defineFoundation(field);
  const { kind: readKind, contract: readContract, binding, ...readData } = read;
  assert.deepEqual(readData, data);
});

test("the reader refuses anything that is not a literal declaration", () => {
  const variants = [
    source.replace('"field", purpose', '`f${"ield"}`, purpose'),
    source.replace('shape: "radius"', "shape: chosenShape()"),
    source.replace("owner: {", "...base, owner: {"),
    source.replace('id: "field"', '["id"]: "field"'),
    source.replace("} as const);", "});"),
    source.replace("defineFoundation({", "defineFoundation(Object.assign({"),
  ];
  for (const variant of variants) assert.throws(() => readDeclarations("field.catalog.ts", variant), /CATALOG_DECLARATION/);
});
