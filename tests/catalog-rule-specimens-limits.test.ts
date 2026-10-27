// Rule J: `variantLimits` lets one axis value limit another axis (Choice: a menu and swatches choose one; only a menu has
// a trigger), so specimens exist exactly for the combinations the contract can type.
import assert from "node:assert/strict";
import test from "node:test";
import { ruleJ } from "../src/authoring/catalog/gate/specimens.ts";
import { codes, contextOf } from "./support/catalog-context.ts";

const folder = "src/svelte/catalog/foundations/choice";
const catalog = `${folder}/choice.catalog.ts`, contractPath = `${folder}/choice.contract.ts`, specimensPath = `${folder}/choice.specimens.ts`;
const limits = `{ presentation: { menu: { cardinality: ["one"] }, rows: { trigger: [] } } }`;
const declaration = (variantLimits = limits) => `import { defineFoundation } from "x";
import { ChoiceContract } from "./choice.contract.ts";
export const Choice = defineFoundation({ id: "choice", purpose: "x", owner: { entry: "Choice.svelte" }, shape: "none",
  states: ["default"], variants: { presentation: ["rows", "menu"], cardinality: ["one", "many"], trigger: ["well", "inline"] },
  variantLimits: ${variantLimits}, approval: "required", contract: ChoiceContract } as const);\n`;
const contract = `import { Type } from "@sinclair/typebox";
export const ChoiceContract = { props: Type.Union([
  Type.Object({ presentation: Type.Literal("rows"), cardinality: Type.Union([Type.Literal("one"), Type.Literal("many")]) }, { additionalProperties: false }),
  Type.Object({ presentation: Type.Literal("menu"), cardinality: Type.Literal("one"),
    trigger: Type.Union([Type.Literal("well"), Type.Literal("inline")]) }, { additionalProperties: false }),
]) } as const;\n`;
const specimen = (variants: string) => `  { state: "default", variants: { ${variants} }, props: {} },`;
const complete = [specimen(`presentation: "rows", cardinality: "one"`), specimen(`presentation: "rows", cardinality: "many"`),
  specimen(`presentation: "menu", cardinality: "one", trigger: "well"`), specimen(`presentation: "menu", cardinality: "one", trigger: "inline"`)];
const specimensFile = (lines: readonly string[]) => `export const ChoiceSpecimens = [\n${lines.join("\n")}\n] as const;\n`;
const found = (files: Record<string, string> = {}) => codes(ruleJ(contextOf({ [catalog]: declaration(), [contractPath]: contract,
  [`${folder}/Choice.svelte`]: "<div></div>\n", [specimensPath]: specimensFile(complete), ...files })));

test("positive control: one specimen per combination the limits leave, an axis that does not apply named nowhere", () => {
  assert.deepEqual(found(), []);
});

test("a limited combination is required, and one the limits exclude is refused", () => {
  assert.deepEqual(found({ [specimensPath]: specimensFile(complete.slice(1)) }),
    [`VARIANT_WITHOUT_SPECIMEN ${specimensPath} choice has no specimen for default|cardinality=one,presentation=rows`]);
  assert.deepEqual(found({ [specimensPath]: specimensFile([...complete, specimen(`presentation: "menu", cardinality: "many", trigger: "well"`)]) }),
    [`VARIANT_WITHOUT_SPECIMEN ${specimensPath} choice specimen default|cardinality=many,presentation=menu,trigger=well witnesses a combination variantLimits excludes`]);
});

test("an axis a value removes may not be named there, and one it keeps must be", () => {
  assert.deepEqual(found({ [specimensPath]: specimensFile([...complete.slice(1), specimen(`presentation: "rows", cardinality: "one", trigger: "well"`)]) }), [
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} choice specimen default|cardinality=one,presentation=rows,trigger=well names axis trigger, which presentation=rows removes`,
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} choice has no specimen for default|cardinality=one,presentation=rows`]);
  assert.deepEqual(found({ [specimensPath]: specimensFile([...complete.slice(0, 3), specimen(`presentation: "menu", cardinality: "one"`)]) }), [
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} choice specimen default|cardinality=one,presentation=menu names no value for axis trigger`,
    `VARIANT_WITHOUT_SPECIMEN ${specimensPath} choice has no specimen for default|cardinality=one,presentation=menu,trigger=inline`]);
});

test("variantLimits names only declared axes and values, and never limits an axis by itself", () => {
  const wrong = `{ tone: { loud: { cardinality: ["one"] } }, presentation: { rows: { trigger: [] }, cards: { cardinality: ["one"] },
    menu: { cardinality: ["one"], size: ["large"], trigger: ["few"], presentation: ["rows"] } } }`;
  assert.deepEqual(found({ [catalog]: declaration(wrong) }), [
    `VARIANT_WITHOUT_SPECIMEN ${catalog} choice variantLimits names undeclared axis tone`,
    `VARIANT_WITHOUT_SPECIMEN ${catalog} choice variantLimits.presentation names undeclared value cards`,
    `VARIANT_WITHOUT_SPECIMEN ${catalog} choice variantLimits.presentation.menu names undeclared axis size`,
    `VARIANT_WITHOUT_SPECIMEN ${catalog} choice variantLimits.presentation.menu names undeclared value few of axis trigger`,
    `VARIANT_WITHOUT_SPECIMEN ${catalog} choice variantLimits.presentation.menu limits its own axis presentation`]);
});

test("an axis a variant does not have may be spelled Optional(Undefined) there, so the entry can destructure it", () => {
  const spelled = contract.replace(`cardinality: Type.Union([Type.Literal("one"), Type.Literal("many")]) }`,
    `cardinality: Type.Union([Type.Literal("one"), Type.Literal("many")]), trigger: Type.Optional(Type.Undefined()) }`);
  assert.notEqual(spelled, contract);
  assert.deepEqual(found({ [contractPath]: spelled }), []);
  const nullable = contract.replace(`Type.Literal("inline")]) }`, `Type.Literal("inline"), Type.Null()]) }`);
  assert.deepEqual(found({ [contractPath]: nullable }),
    [`VARIANT_WITHOUT_SPECIMEN ${contractPath} choice axis trigger: declaration names inline, well, contract props.trigger is not a string-literal union`]);
});
