// A contract is read as data in a closed TypeBox subset; a stub reads as not yet closed.
import assert from "node:assert/strict";
import test from "node:test";
import { readContract } from "../src/authoring/catalog/read-contract.ts";

test("a stub contract reads as not closed", () => {
  assert.deepEqual(readContract("x.contract.ts", "// stub\nexport const XContract = {} as const;\n"), { binding: "XContract", closed: false });
});

test("a closed contract yields props, events, marks and the literal values of each union", () => {
  const contract = readContract("field.contract.ts", `import { Type } from "@sinclair/typebox";
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
  ["a schema outside the subset", "export const C = { props: Type.Object({ a: Type.Any() }, { additionalProperties: false }) } as const;", /Type\.Any is outside/],
  ["a computed contract", "export const C = build();", /exports one/],
  ["an unknown field", "export const C = { styles: [] } as const;", /unknown contract field styles/],
] as const) test(`${name} is refused`, () => {
  assert.throws(() => readContract("c.contract.ts", source), pattern);
});

test("domain data, maps and callbacks have closed forms", () => {
  const contract = readContract("node.contract.ts", `import { Type } from "@sinclair/typebox";
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
  const contract = readContract("flow.contract.ts", `import { Type } from "@sinclair/typebox";
import type { ResolvedView } from "../../../../views/resolved.ts";
export const FlowContract = { props: Type.Object({ resolved: Type.Unsafe<ResolvedView>() }, { additionalProperties: false }),
  instance: Type.Object({ revealEntry: Type.Function([Type.String()], Type.Void()) }, { additionalProperties: false }) } as const;\n`);
  assert.equal(contract.closed, true);
  if (!contract.closed) return;
  assert.deepEqual(contract.props.resolved?.schema, { kind: "typed", name: "ResolvedView", from: "../../../../views/resolved.ts" });
  assert.deepEqual(Object.keys(contract.instance), ["revealEntry"]);
});

for (const [name, source, pattern] of [
  ["a reference that is not imported", "export const C = { props: Type.Object({ a: Loose }, { additionalProperties: false }) } as const;", /Loose is not a schema imported/],
  ["a typed reference to an unimported type", "export const C = { props: Type.Object({ a: Type.Unsafe<Loose>() }, { additionalProperties: false }) } as const;", /Loose is neither imported/],
  ["a typed reference to a component", 'import type { Shape } from "../catalog/compositions/x/x.ts";\nexport const C = { props: Type.Object({ a: Type.Unsafe<Shape>() }, { additionalProperties: false }) } as const;', /comes from visual code/],
  ["a bare Type.Unsafe", "export const C = { props: Type.Object({ a: Type.Unsafe({}) }, { additionalProperties: false }) } as const;", /one type argument and no schema/],
  ["a reference to visual code", 'import { Shape } from "../x/X.svelte";\nexport const C = { props: Type.Object({ a: Shape }, { additionalProperties: false }) } as const;', /comes from visual code/],
] as const) test(`${name} is refused`, () => {
  assert.throws(() => readContract("c.contract.ts", source), pattern);
});

test("infra types, utility combinations and promises are typed references", () => {
  const contract = readContract("p.contract.ts", `import { Type } from "@sinclair/typebox";
import type { ToolbarContent } from "../../../infra/toolbar-content.ts";
import type { AccessClient } from "../../../../web/client/access.ts";
export const PContract = { props: Type.Object({ content: Type.Unsafe<ToolbarContent>(), access: Type.Unsafe<Pick<AccessClient, "lock">>(),
  load: Type.Function([], Type.Promise(Type.Void())) }, { additionalProperties: false }) } as const;\n`);
  assert.equal(contract.closed, true);
  if (!contract.closed) return;
  assert.equal(contract.props.content?.schema.kind, "typed");
  assert.deepEqual(contract.props.access?.schema, { kind: "typed", name: 'Pick<AccessClient, "lock">', from: "../../../../web/client/access.ts" });
  assert.deepEqual(contract.props.load?.schema, { kind: "function" });
});
