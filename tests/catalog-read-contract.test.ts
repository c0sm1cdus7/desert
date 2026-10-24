// A contract is read as data in a closed TypeBox subset; a stub reads as not yet closed.
import assert from "node:assert/strict";
import test from "node:test";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { readContract } from "../src/authoring/catalog/read-contract.ts";

/** Contracts sit beside their piece, so relative imports resolve from a real composition folder. */
const read = (source: string) => readContract("src/svelte/catalog/compositions/c/c.contract.ts", source, DesertLayout);
const props = (field: string, imports = "") => `${imports}${imports ? "\n" : ""}export const C = { props: Type.Object({ a: ${field} }, { additionalProperties: false }) } as const;`;

test("a stub contract reads as not closed", () => {
  assert.deepEqual(read("// stub\nexport const XContract = {} as const;\n"), { binding: "XContract", closed: false });
});

test("a closed contract yields props, events, marks and the literal values of each union", () => {
  const contract = read(`import { Type } from "@sinclair/typebox";
export const FieldContract = {
  props: Type.Object({ measure: Type.Union([Type.Literal("writing"), Type.Literal("compact")]), label: Type.String(),
    disabled: Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  events: Type.Object({ input: Type.String() }, { additionalProperties: false }),
  marks: ["data-field-state"],
} as const;\n`);
  assert.equal(contract.closed, true);
  if (!contract.closed) return;
  assert.deepEqual(Object.keys(contract.props), ["measure", "label", "disabled"]);
  assert.deepEqual(contract.props.measure, { optional: false, schema: { kind: "union", members: [{ kind: "literal", value: "writing" }, { kind: "literal", value: "compact" }] } });
  assert.equal(contract.props.disabled?.optional, true);
  assert.deepEqual(Object.keys(contract.events), ["input"]);
  assert.deepEqual(contract.marks, ["data-field-state"]);
});

for (const [name, source, pattern] of [
  ["an open object", "export const C = { props: Type.Object({ a: Type.String() }) } as const;", /closed with \{ additionalProperties: false \}/],
  ["a schema outside the subset", props("Type.Any()"), /Type\.Any is outside/],
  ["a computed contract", "export const C = build();", /exports one/],
  ["an unknown field", "export const C = { styles: [] } as const;", /unknown contract field styles/],
] as const) test(`${name} is refused`, () => {
  assert.throws(() => read(source), pattern);
});

test("domain data, maps and callbacks have closed forms", () => {
  const contract = read(`import { Type } from "@sinclair/typebox";
import { ResolvedNodeSchema } from "../../../../interaction/resolved-node-schema.ts";
export const NodeContract = { props: Type.Object({ node: ResolvedNodeSchema, labels: Type.Record(Type.String(), Type.String()),
  edit: Type.Function([Type.String(), Type.String()], Type.Null()) }, { additionalProperties: false }) } as const;\n`);
  assert.equal(contract.closed, true);
  if (!contract.closed) return;
  assert.deepEqual(contract.props.node?.schema, { kind: "reference", name: "ResolvedNodeSchema", from: "../../../../interaction/resolved-node-schema.ts" });
  assert.deepEqual(contract.props.labels?.schema, { kind: "record", values: { kind: "string" } });
  assert.deepEqual(contract.props.edit?.schema, { kind: "function" });
});

test("domain data typed only by TypeScript is Type.Unsafe of an imported type; an instance API is declared", () => {
  const contract = read(`import { Type } from "@sinclair/typebox";
import type { ResolvedView } from "@desert/views/resolved.ts";
export const FlowContract = { props: Type.Object({ resolved: Type.Unsafe<ResolvedView>() }, { additionalProperties: false }),
  instance: Type.Object({ revealEntry: Type.Function([Type.String()], Type.Void()) }, { additionalProperties: false }) } as const;\n`);
  assert.equal(contract.closed, true);
  if (!contract.closed) return;
  assert.deepEqual(contract.props.resolved?.schema, { kind: "typed", name: "ResolvedView", from: "@desert/views/resolved.ts" });
  assert.deepEqual(Object.keys(contract.instance), ["revealEntry"]);
});

const shape = 'import type { Shape } from "../../../../views/shape.ts";';
for (const [name, source, pattern] of [
  ["a reference that is not imported", props("Loose"), /Loose is not imported/],
  ["a reference to a package schema", props("Loose", 'import { Loose } from "some-package";'), /comes from the package some-package/],
  ["a typed reference to an unimported type", props("Type.Unsafe<Loose>()"), /Loose is neither imported/],
  ["a typed reference to a component", props("Type.Unsafe<Shape>()", 'import type { Shape } from "../x/x.ts";'), /comes from visual code/],
  ["a typed reference to a sibling helper", props("Type.Unsafe<Shape>()", 'import type { Shape } from "./helper.ts";'), /comes from visual code/],
  ["a typed reference to the catalog index", props("Type.Unsafe<Heading>()", 'import type { Heading } from "../../index.ts";'), /comes from visual code/],
  ["a typed reference to Svelte", props("Type.Unsafe<Component>()", 'import type { Component } from "svelte";'), /comes from the package svelte/],
  ["HTML attributes", props("Type.Unsafe<HTMLAttributes<never>>()", 'import type { HTMLAttributes } from "svelte/elements";'), /comes from the package svelte\/elements/],
  ["Type.Unsafe<any>", props("Type.Unsafe<any>()"), /open type any/],
  ["Type.Unsafe<unknown>", props("Type.Unsafe<unknown>()"), /open type unknown/],
  ["Type.Unsafe<object>", props("Type.Unsafe<object>()"), /open type object/],
  ["Type.Unsafe<never>", props("Type.Unsafe<never>()"), /open type never/],
  ["an open record", props("Type.Unsafe<Record<string, unknown>>()"), /open type unknown/],
  ["an inline object type", props("Type.Unsafe<{ [key: string]: Shape }>()", shape), /TypeLiteral/],
  ["an inline function type", props("Type.Unsafe<(...items: Shape[]) => Shape>()", shape), /FunctionType/],
  ["a typeof query", props("Type.Unsafe<typeof Shape>()", shape), /TypeQuery/],
  ["a mapped type", props("Type.Unsafe<{ [K in keyof Shape]: Shape[K] }>()", shape), /MappedType/],
  ["a conditional type", props("Type.Unsafe<Shape extends Shape ? Shape : never>()", shape), /ConditionalType/],
  ["an Extract filter that is not a discriminant", props('Type.Unsafe<Extract<Shape, { kind: "x"; rest: any }>>()', shape), /literal discriminants only/],
  ["an inline object as a utility argument", props("Type.Unsafe<Partial<{ a: string }>>()"), /TypeLiteral/],
  ["a DOM element", props("Type.Unsafe<HTMLElement>()"), /HTMLElement is neither imported/],
  ["a bare Type.Unsafe", props("Type.Unsafe({})"), /one type argument and no schema/],
  ["a reference to visual code", props("Shape", 'import { Shape } from "../x/X.svelte";'), /comes from visual code/],
  ["a non-method instance member", "export const C = { instance: Type.Object({ node: Type.String() }, { additionalProperties: false }) } as const;", /instance member node is a required Type\.Function/],
  ["an optional instance method", "export const C = { instance: Type.Object({ go: Type.Optional(Type.Function([], Type.Void())) }, { additionalProperties: false }) } as const;", /instance member go/],
  ["an instance method with an open type", 'export const C = { instance: Type.Object({ go: Type.Function([Type.Unsafe<any>()], Type.Void()) }, { additionalProperties: false }) } as const;', /open type any/],
] as const) test(`${name} is refused`, () => {
  assert.throws(() => read(source), pattern);
});

test("infra types, utility combinations, indexed access and promises are typed references", () => {
  const contract = read(`import { Type } from "@sinclair/typebox";
import type { ToolbarContent } from "../../../infra/toolbar-content.ts";
import type { AccessClient } from "../../../../web/client/access.ts";
export const PContract = { props: Type.Object({ content: Type.Unsafe<ToolbarContent>(), access: Type.Unsafe<Pick<AccessClient, "lock">>(),
  lock: Type.Unsafe<AccessClient["lock"] | null>(), search: Type.Unsafe<Extract<ToolbarContent, { kind: \`files.\${string}\` }>["kind"]>(), many: Type.Unsafe<readonly ToolbarContent[]>(),
  load: Type.Function([], Type.Promise(Type.Void())) }, { additionalProperties: false }) } as const;\n`);
  assert.equal(contract.closed, true);
  if (!contract.closed) return;
  assert.equal(contract.props.content?.schema.kind, "typed");
  assert.deepEqual(contract.props.access?.schema, { kind: "typed", name: 'Pick<AccessClient, "lock">', from: "../../../../web/client/access.ts" });
  assert.equal(contract.props.lock?.schema.kind, "typed");
  assert.equal(contract.props.search?.schema.kind, "typed");
  assert.equal(contract.props.many?.schema.kind, "typed");
  assert.deepEqual(contract.props.load?.schema, { kind: "function" });
});
