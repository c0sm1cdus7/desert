// Rule K: every Components key and every ViewContent/ViewItem kind is drawn by an authorable composition named in
// the grammar map; the map names only declared authorable compositions and only keys that exist (N48).
import assert from "node:assert/strict";
import test from "node:test";
import { ruleK } from "../src/authoring/catalog/gate/grammar.ts";
import { codes, composition, contextOf, foundation } from "./support/catalog-context.ts";
import { testLayout } from "./support/catalog-layout.ts";

const componentsPath = "src/views/components.ts", schemaPath = "src/views/schema.ts", mapPath = "src/views/grammar-map.ts";
const leavesPath = "src/interaction/leaves.ts";
const reads = [componentsPath, schemaPath, mapPath, leavesPath];
const layout = (paths: readonly string[] = reads) => {
  const base = testLayout();
  return testLayout({ gate: { ...base.gate, reads: paths } });
};
const components = (extra = "") => `import { contentBuilder } from "./component-values.ts";
export const Components = Object.freeze({
  Header: contentBuilder("header"), Text: contentBuilder("text")${extra},
});\n`;
const schema = `import { Type } from "@sinclair/typebox";
import { closed, immutable } from "./definition.ts";
import { LeafSchema as InformationLeaf } from "../interaction/leaves.ts";
export const ViewHeaderSchema = closed({ kind: Type.Literal("header"), id: Type.String(),
  presentation: Type.Optional(closed({ kind: Type.Literal("nested-presentation") })) });
export const ViewItemSchema = immutable(Type.Union([...InformationLeaf.anyOf]));
export const ViewContentSchema = immutable(Type.Union([ViewHeaderSchema, ...ViewItemSchema.anyOf]));\n`;
const leaves = `import { Type } from "@sinclair/typebox";
export const LeafSchema = Type.Union([Type.Object({ kind: Type.Literal("text"), text: Type.String() }, { additionalProperties: false })]);\n`;
const fullMap = `export const grammarMap = { Header: "page-header", header: "page-header", Text: "text-block", text: "text-block" } as const;\n`;
const pieces = {
  ...composition("page-header", "PageHeader.svelte", [], "\n", ", authorable: true"),
  ...composition("text-block", "TextBlock.svelte", [], "\n", ", authorable: true"),
  ...composition("dock-bar", "DockBar.svelte", [], "\n"),
  ...foundation("heading", "Heading.svelte", "<h1></h1>\n"),
};
const found = (files: Record<string, string | undefined> = {}, paths: readonly string[] = reads) => {
  const all: Record<string, string | undefined> = { ...pieces, [componentsPath]: components(), [schemaPath]: schema, [leavesPath]: leaves, [mapPath]: fullMap, ...files };
  return codes(ruleK(contextOf(Object.fromEntries(Object.entries(all).flatMap(([path, text]) => text === undefined ? [] : [[path, text]])), layout(paths))));
};
const unmapped = (path: string, label: string) => `GRAMMAR_NOT_IN_CATALOG ${path} ${label} maps to no authorable composition in grammar-map.ts`;

test("positive control: every key and kind maps to an authorable composition (imports aliased, unions spread across files)", () => {
  assert.deepEqual(found(), []);
});

test("an empty map reports every Components key and every view kind: the migration worklist", () => {
  assert.deepEqual(found({ [mapPath]: "export const grammarMap = {} as const;\n" }), [
    unmapped(componentsPath, "Components.Header"), unmapped(componentsPath, "Components.Text"),
    unmapped(schemaPath, "view kind header"), unmapped(leavesPath, "view kind text")]);
});

test("N48: a new Components key without a composition fails", () => {
  assert.deepEqual(found({ [componentsPath]: components(`, Foo: contentBuilder("foo")`) }), [unmapped(componentsPath, "Components.Foo")]);
});

test("a new schema kind without a composition fails, even when it arrives through a spread union in another file", () => {
  const widened = leaves.replace("additionalProperties: false })]", `additionalProperties: false }), Type.Object({ kind: Type.Literal("quote") })]`);
  assert.deepEqual(found({ [leavesPath]: widened }), [unmapped(leavesPath, "view kind quote")]);
});

test("a map entry naming an undeclared piece, a foundation or a composition that is not authorable fails", () => {
  const map = (id: string) => fullMap.replace(`Text: "text-block"`, `Text: "${id}"`);
  const entry = (what: string) => [`GRAMMAR_NOT_IN_CATALOG ${mapPath} grammar-map entry Text: ${what}`];
  assert.deepEqual(found({ [mapPath]: map("missing-piece") }), entry("missing-piece is not a declared piece"));
  assert.deepEqual(found({ [mapPath]: map("heading") }), entry("heading is a foundation, not a composition"));
  assert.deepEqual(found({ [mapPath]: map("dock-bar") }), entry("composition dock-bar is not authorable"));
});

test("a map entry for a key that no longer exists fails", () => {
  assert.deepEqual(found({ [mapPath]: fullMap.replace(" } as const", `, Retired: "text-block" } as const`) }),
    [`GRAMMAR_NOT_IN_CATALOG ${mapPath} grammar-map entry Retired: names no Components key or view kind`]);
});

test("a schema file followed through an import but missing from gate.reads is a gate-sources failure", () => {
  assert.deepEqual(found({}, [componentsPath, schemaPath, mapPath]),
    [`CATALOG_GATE_SOURCES ${leavesPath} rule K reads ${leavesPath}, which is not in the layout's gate.reads`]);
});

test("each grammar role must be declared by exactly one read source", () => {
  assert.deepEqual(found({ [mapPath]: "export const otherMap = {} as const;\n" }),
    [`CATALOG_GATE_SOURCES ${reads.join(", ")} rule K needs one gate.reads source declaring grammarMap; found none of them`]);
});

test("a grammar that is not data fails instead of being guessed", () => {
  const cases: readonly (readonly [Record<string, string>, string, string])[] = [
    [{ [componentsPath]: components(", ...more") }, componentsPath, "the view grammar is not readable as data: Components holds a property that is not a plain key"],
    [{ [schemaPath]: schema.replace("...ViewItemSchema.anyOf", "...ViewItemSchema.members") }, schemaPath,
      "the view grammar is not readable as data: ...ViewItemSchema.members is not a spread of a union's anyOf"],
    [{ [leavesPath]: leaves.replace(`Type.Literal("text")`, "Type.String()") }, leavesPath,
      "the view grammar is not readable as data: a member of the union has no `kind: Type.Literal(\"…\")`"],
    [{ [mapPath]: fullMap.replace(`Text: "text-block"`, "Text: textBlock") }, mapPath,
      "the view grammar is not readable as data: grammarMap.Text is not a composition id string"],
  ];
  for (const [files, path, what] of cases) assert.deepEqual(found(files), [`GRAMMAR_NOT_IN_CATALOG ${path} ${what}`]);
});
