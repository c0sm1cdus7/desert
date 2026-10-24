// Rule J: every state × variant of a piece the owner approves has a specimen, and a closed contract offers exactly the
// declared variant values (N46).
import assert from "node:assert/strict";
import test from "node:test";
import { ruleJ, specimenKey } from "../src/authoring/catalog/gate/specimens.ts";
import { codes, contextOf } from "./support/catalog-context.ts";

const folder = "src/svelte/catalog/foundations/field";
const catalog = `${folder}/field.catalog.ts`, contractPath = `${folder}/field.contract.ts`, specimensPath = `${folder}/field.specimens.ts`;
const declaration = (variants = `{ measure: ["writing", "compact"] }`, extra = "") => `import { defineFoundation } from "x";
import { FieldContract } from "./field.contract.ts";
export const Field = defineFoundation({ id: "field", purpose: "x", owner: { entry: "Field.svelte" }, shape: "radius",
  states: ["empty", "value"], variants: ${variants},${extra} approval: "required", contract: FieldContract } as const);\n`;
const closedContract = (measure = `Type.Union([Type.Literal("writing"), Type.Literal("compact")])`) => `import { Type } from "@sinclair/typebox";
export const FieldContract = { props: Type.Object({ measure: ${measure}, label: Type.String() }, { additionalProperties: false }) } as const;\n`;
const specimen = (state: string, measure: string) => `  { state: "${state}", variants: { measure: "${measure}" }, props: { label: label("Title"), measure: "${measure}" } },`;
const allSpecimens = [specimen("empty", "writing"), specimen("empty", "compact"), specimen("value", "writing"), specimen("value", "compact")];
const specimensFile = (lines: readonly string[], binding = "FieldSpecimens") => `import type { CatalogSpecimen } from "../../types.d.ts";
import { label } from "../../infra/labels.ts";
export const ${binding} = [
${lines.join("\n")}
] as const satisfies readonly CatalogSpecimen<"field">[];\n`;
const tree = (files: Record<string, string | undefined> = {}) => {
  const all: Record<string, string | undefined> = { [catalog]: declaration(), [contractPath]: closedContract(), [`${folder}/Field.svelte`]: "<div></div>\n",
    [specimensPath]: specimensFile(allSpecimens), ...files };
  return contextOf(Object.fromEntries(Object.entries(all).flatMap(([path, text]) => text === undefined ? [] : [[path, text]])));
};
const found = (files: Record<string, string | undefined> = {}) => codes(ruleJ(tree(files)));

test("specimen keys sort the axes and drop the bar when a piece has no axis", () => {
  assert.equal(specimenKey("empty", { purpose: "text", measure: "writing" }), "empty|measure=writing,purpose=text");
  assert.equal(specimenKey("default", {}), "default");
});

test("positive control: every state × variant has a specimen and the contract union equals the declared axis", () => {
  assert.deepEqual(found(), []);
});

test("props hold any expression, and the array may end with `as const` alone", () => {
  assert.deepEqual(found({ [specimensPath]: specimensFile(allSpecimens).replace(` satisfies readonly CatalogSpecimen<"field">[]`, "") }), []);
});

test("a required piece without a specimens file fails once, counting the uncovered combinations", () => {
  assert.deepEqual(found({ [specimensPath]: undefined }),
    [`VARIANT_WITHOUT_SPECIMEN ${catalog} field has no field.specimens.ts: 4 state × variant combinations uncovered`]);
});

test("every uncovered combination is named by its ledger key", () => {
  assert.deepEqual(found({ [specimensPath]: specimensFile(allSpecimens.slice(0, 2)) }), [
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} field has no specimen for value|measure=writing`,
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} field has no specimen for value|measure=compact`]);
});

test("a specimen naming an undeclared state, axis or value, or missing an axis, fails and covers nothing", () => {
  const lines = [...allSpecimens, `  { state: "loading", variants: { measure: "writing" }, props: {} },`,
    `  { state: "empty", variants: { measure: "writing", tone: "loud" }, props: {} },`,
    `  { state: "empty", variants: { measure: "access" }, props: {} },`, `  { state: "empty", props: {} },`];
  assert.deepEqual(found({ [specimensPath]: specimensFile(lines) }), [
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} field specimen loading|measure=writing names undeclared state loading`,
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} field specimen empty|measure=writing,tone=loud names undeclared axis tone`,
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} field specimen empty|measure=access names undeclared value access of axis measure`,
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} field specimen empty names no value for axis measure`]);
});

test("the same combination written twice fails (the ledger keys specimens by combination)", () => {
  assert.deepEqual(found({ [specimensPath]: specimensFile([...allSpecimens, specimen("value", "compact")]) }),
    [`VARIANT_WITHOUT_SPECIMEN ${specimensPath} field specimen value|measure=compact is written twice`]);
});

test("N46: a contract union gaining a value the declaration does not name fails on the contract", () => {
  const widened = `Type.Union([Type.Literal("writing"), Type.Literal("compact"), Type.Literal("access")])`;
  assert.deepEqual(found({ [contractPath]: closedContract(widened) }), [
    `VARIANT_WITHOUT_SPECIMEN ${contractPath} field axis measure: declaration names compact, writing, contract props.measure offers access, compact, writing`]);
});

test("N46: the declaration gaining the value without its specimens fails per uncovered combination", () => {
  const widened = `Type.Union([Type.Literal("writing"), Type.Literal("compact"), Type.Literal("access")])`;
  assert.deepEqual(found({ [contractPath]: closedContract(widened), [catalog]: declaration(`{ measure: ["writing", "compact", "access"] }`) }), [
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} field has no specimen for empty|measure=access`,
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} field has no specimen for value|measure=access`]);
});

test("a declared axis absent from the contract props, or not a string-literal union there, fails", () => {
  assert.deepEqual(found({ [contractPath]: closedContract("Type.String()") }),
    [`VARIANT_WITHOUT_SPECIMEN ${contractPath} field axis measure: declaration names compact, writing, contract props.measure is not a string-literal union`]);
  const withoutMeasure = `import { Type } from "@sinclair/typebox";
export const FieldContract = { props: Type.Object({ label: Type.String() }, { additionalProperties: false }) } as const;\n`;
  assert.deepEqual(found({ [contractPath]: withoutMeasure }),
    [`VARIANT_WITHOUT_SPECIMEN ${contractPath} field axis measure: declaration names compact, writing, contract props.measure has no prop`]);
});

test("a union in another order, or an optional union, still equals the axis; a stub contract is not compared yet", () => {
  assert.deepEqual(found({ [contractPath]: closedContract(`Type.Optional(Type.Union([Type.Literal("compact"), Type.Literal("writing")]))`) }), []);
  assert.deepEqual(found({ [contractPath]: "export const FieldContract = {} as const;\n" }), []);
});

test("a specimens file that is not data fails with what is wrong, and coverage is not counted over it", () => {
  const cases: readonly (readonly [string, string])[] = [
    [specimensFile(allSpecimens, "Specimens"), "field specimens: holds imports and one `export const FieldSpecimens` only"],
    [specimensFile(allSpecimens).replace(" as const", ""), "field specimens: FieldSpecimens is an array literal ending with `as const`"],
    [specimensFile([...allSpecimens, "  ...more,"]), "field specimens: a specimen is an object literal"],
    [specimensFile([...allSpecimens, "  { state: states.empty, props: {} },"]), "field specimens: state is a string literal"],
    [specimensFile([...allSpecimens, "  { state: \"empty\", variants: { measure: MEASURE }, props: {} },"]), "field specimens: each variant is `axis: \"value\"`"],
    [specimensFile([...allSpecimens, "  { state: \"empty\", variants: { measure: \"writing\" }, tone: \"x\" },"]), "field specimens: unknown specimen field tone"],
    [specimensFile([...allSpecimens, "  { variants: { measure: \"writing\" } },"]), "field specimens: a specimen names its state"],
  ];
  for (const [source, what] of cases) assert.deepEqual(found({ [specimensPath]: source }), [`VARIANT_WITHOUT_SPECIMEN ${specimensPath} ${what}`]);
});

const compositionFolder = "src/svelte/catalog/compositions/lock-screen";
const compositionTree = (approval: string, specimens?: string) => contextOf({
  [`${compositionFolder}/lock-screen.catalog.ts`]: `import { defineComposition } from "x";
import { C } from "./lock-screen.contract.ts";
export const LockScreen = defineComposition({ id: "lock-screen", purpose: "x", owner: { entry: "LockScreen.svelte" }, uses: [],
  approval: "${approval}", contract: C } as const);\n`,
  [`${compositionFolder}/lock-screen.contract.ts`]: "export const C = {} as const;\n",
  [`${compositionFolder}/LockScreen.svelte`]: "\n",
  ...specimens === undefined ? {} : { [`${compositionFolder}/lock-screen.specimens.ts`]: specimens },
});

test("a required composition has one state, default: it needs that one specimen", () => {
  assert.deepEqual(codes(ruleJ(compositionTree("required"))), [
    `VARIANT_WITHOUT_SPECIMEN ${compositionFolder}/lock-screen.catalog.ts lock-screen has no lock-screen.specimens.ts: 1 state × variant combination uncovered`]);
  assert.deepEqual(codes(ruleJ(compositionTree("required", `export const LockScreenSpecimens = [{ state: "default", props: {} }] as const;\n`))), []);
});

test("a piece without owner approval needs no specimens, but the specimens it has must name declared states", () => {
  assert.deepEqual(codes(ruleJ(compositionTree("none"))), []);
  assert.deepEqual(codes(ruleJ(compositionTree("none", `export const LockScreenSpecimens = [{ state: "locked", props: {} }] as const;\n`))),
    [`VARIANT_WITHOUT_SPECIMEN ${compositionFolder}/lock-screen.specimens.ts lock-screen specimen locked names undeclared state locked`]);
});

test("stateVariants limits a state to some variant values: no specimen is required, or allowed, elsewhere", () => {
  const only = declaration(undefined, ` stateVariants: { value: { measure: ["writing"] } },`);
  const withoutCompactValue = specimensFile(allSpecimens.filter(line => !line.includes(`"value", variants: { measure: "compact"`)));
  assert.deepEqual(found({ [catalog]: only, [specimensPath]: withoutCompactValue }), []);
  assert.deepEqual(found({ [catalog]: only }),
    [`VARIANT_WITHOUT_SPECIMEN ${specimensPath} field specimen value|measure=compact witnesses a combination stateVariants excludes`]);
  assert.deepEqual(found({ [catalog]: only, [specimensPath]: specimensFile(allSpecimens.slice(0, 2)) }),
    [`VARIANT_WITHOUT_SPECIMEN ${specimensPath} field has no specimen for value|measure=writing`]);
});

test("stateVariants names only declared states, axes and values", () => {
  const wrong = declaration(undefined, ` stateVariants: { loading: { measure: ["writing"] }, value: { tone: ["loud"] }, empty: { measure: ["access"] } },`);
  assert.deepEqual(found({ [catalog]: wrong }), [
    `VARIANT_WITHOUT_SPECIMEN ${catalog} field stateVariants names undeclared state loading`,
    `VARIANT_WITHOUT_SPECIMEN ${catalog} field stateVariants.value names undeclared axis tone`,
    `VARIANT_WITHOUT_SPECIMEN ${catalog} field stateVariants.empty names undeclared value access of axis measure`,
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} field specimen empty|measure=writing witnesses a combination stateVariants excludes`,
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} field specimen empty|measure=compact witnesses a combination stateVariants excludes`]);
});
