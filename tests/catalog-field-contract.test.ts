// Field, the rename of text-input that absorbs the well, its label, the masked editor, the clear control, the counter,
// the measured box and the search well (design §1.3): its closed contract, declaration, specimens and owner rules, and
// Form's new `fill`. Raises nothing: a regression fails these assertions by name.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readContract } from "../src/authoring/catalog/read-contract.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { ruleE } from "../src/authoring/catalog/gate/presentation.ts";
import { ruleF } from "../src/authoring/catalog/gate/owner-imports.ts";
import { ruleI } from "../src/authoring/catalog/gate/dom-access.ts";
import { ruleJ } from "../src/authoring/catalog/gate/specimens.ts";
import { formatViolation } from "../src/authoring/catalog/gate/violation.ts";
import { realContext } from "./support/real-tree.ts";

const root = resolve(import.meta.dirname, "..");
const folder = "src/svelte/catalog/foundations/field";
const read = (path: string) => readFile(resolve(root, path), "utf8");
const declaration = (id: string) => {
  const found = realContext().declarations.find(item => item.declaration.id === id)?.declaration;
  assert.ok(found?.kind === "foundation", `${id} is a declared foundation`);
  return found;
};

test("field: the contract is closed: a shared part and exclusive variants by primitive, its events and marks", async () => {
  const contract = readContract(`${folder}/field.contract.ts`, await read(`${folder}/field.contract.ts`), DesertLayout);
  assert.equal(contract.closed, true);
  if (!contract.closed) return;
  assert.deepEqual(Object.keys(contract.props), ["label", "labelVisibility", "required", "invalid", "disabled", "helper", "error", "identity",
    "measure", "primitive", "purpose", "value", "placeholder", "mask", "maxLength", "counter", "clear", "focus", "controls", "display", "disclosure"]);
  // A single line names what it controls (the bar search its results); the other primitives declare it absent.
  assert.deepEqual(contract.props.controls, { schema: { kind: "union", members: [{ kind: "string" }, { kind: "undefined" }] }, optional: true });
  const required = Object.entries(contract.props).filter(([, item]) => !item.optional).map(([name]) => name);
  assert.deepEqual(required, ["label", "labelVisibility", "required", "invalid", "disabled", "measure", "primitive"]);
  assert.deepEqual(contract.props.primitive?.schema, { kind: "union", members: [{ kind: "literal", value: "input.text" },
    { kind: "literal", value: "input.multiline" }, { kind: "literal", value: "trigger" }] });
  assert.deepEqual(Object.keys(contract.events), ["change", "masked", "open"]);
  assert.deepEqual(contract.marks, ["data-field", "data-field-filled", "data-measure"]);
});

test("field: it owns the five writing vendor families, renders both input kinds, and text-input owns neither any more", () => {
  const field = declaration("field"), textInput = declaration("text-input");
  assert.deepEqual(field.owner.vendor, ["field", "input", "input-group", "label", "textarea"]);
  assert.deepEqual(field.renders, ["input.text", "input.multiline"]);
  assert.equal(textInput.owner.vendor, undefined);
  assert.equal(textInput.renders, undefined);
  assert.deepEqual(field.states, ["empty", "value", "invalid", "disabled", "masked"]);
  assert.deepEqual(field.variants, { primitive: ["input.text", "input.multiline", "trigger"], measure: ["writing", "choice", "date", "amount", "fill"] });
  assert.deepEqual(field.stateVariants, { masked: { primitive: ["input.text"] } });
  assert.deepEqual(field.slots, { accessory: { accepts: ["action"] }, prefix: { accepts: ["choice"] } });
  assert.deepEqual(field.owner.parts, ["FieldWell.svelte", "FieldLabel.svelte", "FieldEditor.svelte", "FieldTrigger.svelte", "SearchWell.svelte",
    "MaskedInput.svelte", "input-edit-history.ts", "ClearInput.svelte", "CharacterCounter.svelte", "editor-capacity.ts", "field.css", "field-measure.css"]);
});

test("field: every state × primitive × measure has its specimen, and the folder passes the owner, DOM and props rules", () => {
  const context = realContext();
  const mine = (rule: typeof ruleJ) => rule(context).filter(item => item.path.startsWith(`${folder}/`)).map(formatViolation);
  assert.deepEqual(mine(ruleJ), []);
  assert.deepEqual(mine(ruleF), []);
  assert.deepEqual(mine(ruleI), []);
  assert.deepEqual(ruleE(context).map(formatViolation).filter(line => /contract of field|contract: field/.test(line)), []);
});

test("field: the stylesheets moved into the field folder, and the control-measure mechanism is gone", async () => {
  const theme = await read("src/svelte/theme.css");
  assert.match(theme, /@import "\.\/catalog\/foundations\/field\/field\.css";/);
  assert.match(theme, /@import "\.\/catalog\/foundations\/field\/field-measure\.css";/);
  assert.doesNotMatch(theme, /field-well\.css|search-field\.css|control-measure\.css/);
  assert.equal(realContext().declarations.some(item => item.declaration.id === "control-measure"), false);
  const css = await read(`${folder}/field.css`);
  assert.match(css, /\[data-search-field\] \{ min-height:44px; border-radius:var\(--radius\);/, "search shares the radius family");
  assert.doesNotMatch(css, /999px/);
});

test("form: `fill` is a declared boolean, witnessed both ways", async () => {
  const contract = readContract("src/svelte/catalog/foundations/form/form.contract.ts", await read("src/svelte/catalog/foundations/form/form.contract.ts"), DesertLayout);
  assert.ok(contract.closed);
  if (!contract.closed) return;
  assert.deepEqual(contract.props.fill, { schema: { kind: "boolean" }, optional: false });
  const specimens = await read("src/svelte/catalog/foundations/form/form.specimens.ts");
  assert.match(specimens, /fill: true/);
  assert.match(specimens, /fill: false/);
});
