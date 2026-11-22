import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
const policy = { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] };
for (const [name, code] of Object.entries({
  castDestructuring:
    "const original = {} as Record<string, number>; const { value: target } = { value: original };" +
    "const key = 'a'; target[key];",
  template: 'const target: Record<string, number> = {}; target[`con${"structor"}`];',
  assignedKey:
    'const target: Record<string, number> = {}; let key: string = "a";' + 'key = "con" + "structor"; target[key];',
  castThroughParameter:
    'function read(target: Record<string, number>) { const key = "a"; return target[key]; }' +
    "read((() => 1) as unknown as Record<string, number>);",
}))
  it(`212 neighbors: rejects ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).length).toBeGreaterThan(0);
  });
it("212 neighbors: rejects a cast exported by a helper", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts": "import { target } from './helper.ts'; const key = 'a'; target[key];",
        "helper.ts": "export const target = (() => 1) as unknown as Record<string, number>;",
      },
      policy,
    ).length,
  ).toBeGreaterThan(0);
});
it("212 neighbors: follows cast arguments into an imported helper", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts": "import { read } from './helper.ts'; read({} as Record<string, number>);",
        "helper.ts": "export function read(target: Record<string, number>) { const k = 'a'; return target[k]; }",
      },
      policy,
    ).length,
  ).toBeGreaterThan(0);
});
it("212 neighbors: a harmless assignment does not cover another forbidden key", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts":
          "const table: Record<string, number> = {}; let k: string = ''; k = 'a';" +
          "k = 'con' + 'structor'; table[k];",
      },
      policy,
    ).length,
  ).toBeGreaterThan(0);
});
it("212 neighbors: an out-of-range numeric index is still a data read", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts": "const tupla: readonly [string, number] = ['a', 1]; const i: number = 20; tupla[i];",
      },
      policy,
    ),
  ).toEqual([]);
});
it("212 neighbors: the trusted composition can still hand over typed data", () => {
  expect(
    secretBoundaryViolations(
      {
        "main.ts": "import { read } from './tool.ts'; read({} as Record<string, number>);",
        "tool.ts": "export function read(target: Record<string, number>) { const k = 'a'; return target[k]; }",
      },
      { ...policy, composition: ["main.ts"] },
    ),
  ).toEqual([]);
});
it("212 neighbors: data from a public schema keeps its type when indexed", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts":
          "import { Type, type Static } from '@sinclair/typebox';" +
          "const schema = Type.Object({ a: Type.Number() }); type Datum = Static<typeof schema>;" +
          "export function read(list: Datum[], i: number) { return list[i]; }",
      },
      { ...policy, publicModules: { "@sinclair/typebox": ["Type", "Static"] } },
    ),
  ).toEqual([]);
});
it("212 neighbors: having declarations installed does not authorize an import", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts": "import { Type } from '@sinclair/typebox'; export const schema = Type.Number();",
      },
      policy,
    ),
  ).toContain("tool.ts:1:1 → @sinclair/typebox");
});
it("212 neighbors: destructuring an array does not read a property named like the variable", () => {
  expect(secretBoundaryViolations({ "tool.ts": "const [constructor] = [1];" }, policy)).toEqual([]);
});
it("212 neighbors: a destructured key with a Unicode escape is still forbidden", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts": String.raw`const { "constr\u0075ctor": factory } = {};`,
      },
      policy,
    ).length,
  ).toBeGreaterThan(0);
});
it("212 neighbors: an incompatible argument is rejected without breaking the checker", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts":
          "import { read } from './reader.ts'; import { datum } from './data.ts';" +
          "read(datum); const table = {} as Record<string, number>; const k = 'a'; table[k];",
        "reader.ts":
          "import type { B } from './b.ts'; export function read(x: { item: B }) { const k = 'item'; return x[k]; }",
        "data.ts": "import type { A } from './a.ts'; export const datum: { item: A } = { item: { a: 1 } };",
        "a.ts": "export interface A { a: number }",
        "b.ts": "export interface B { b: string }",
      },
      policy,
    ).length,
  ).toBeGreaterThan(0);
});
