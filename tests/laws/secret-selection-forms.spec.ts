import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
const policy = { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] };
const forms = {
  brackets: "export function read(o: T, k: string) { return o[k]; }",
  declaration: "export function read(o: T, k: string) { const { [k]: v } = o; return v; }",
  assignment: "export function read(o: T, k: string) { let v: unknown; ({ [k]: v } = o); return v; }",
  parameter: "export function read(k: string, { [k]: v }: T) { return v; }",
};
const values = {
  text: "string",
  date: "Date",
  map: "ReadonlyMap<string, number>",
  set: "ReadonlySet<string>",
  expression: "RegExp",
  error: "Error",
  promise: "Promise<number>",
  bytes: "Uint8Array",
  class: "Item",
  row: "{ id: string; label(): string }",
  emptyClass: "Empty",
  callableWithProperty: "(() => void) & { id: string }",
  constructibleWithProperty: "(new () => Item) & { id: string }",
  any: "any",
  unknown: "unknown",
  object: "object",
  empty: "{}",
  function: "() => void",
  constructor: "new () => Item",
  union: "string | (() => void)",
};
const rejected = new Set([
  "any",
  "unknown",
  "object",
  "empty",
  "function",
  "constructor",
  "union",
  "callableWithProperty",
  "constructibleWithProperty",
]);
for (const [form, body] of Object.entries(forms))
  it(`212 forms: ${form} judges the chosen value, not the target nor the inner methods`, () => {
    const sources = Object.fromEntries(
      Object.entries(values).map(([name, value]) => [
        `${name}.ts`,
        `class Empty {} class Item { id = ''; } type T = Record<string, ${value}>; ${body}`,
      ]),
    );
    const found = secretBoundaryViolations(sources, { ...policy, tools: Object.keys(sources) });
    for (const name of Object.keys(values))
      expect(
        found.some(message => message.startsWith(`${name}.ts`)),
        name,
      ).toBe(rejected.has(name));
  });
for (const [name, code] of Object.entries({
  module: "export const load = module.require;",
  Reflect: "export const read = Reflect.get;",
  reservedAssignment: "const o = {}; let v: unknown; ({ ['con' + 'structor']: v } = o);",
  literalAssignment: "const o = {}; let v: unknown; ({ constructor: v } = o);",
  protoAssignment: "const o = {}; let v: unknown; ({ __proto__: v } = o);",
  prototypeAssignment: "const o = {}; let v: unknown; ({ prototype: v } = o);",
  castDeclaration: "const o = {} as Record<string, number>; const k = 'a'; const { [k]: v } = o;",
  castAssignment: "const o = {} as Record<string, number>; const k = 'a'; let v; ({ [k]: v } = o);",
  castParameter:
    "function read(k: string, { [k]: v }: Record<string, number>) { return v; }" +
    "read('a', {} as Record<string, number>);",
}))
  it(`212 forms: rejects ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).length).toBeGreaterThan(0);
  });
