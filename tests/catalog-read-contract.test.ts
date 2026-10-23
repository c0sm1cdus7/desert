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
