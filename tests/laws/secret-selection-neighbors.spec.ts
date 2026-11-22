import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
const policy = { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] };
const admitted = {
  literalFunction: "const t = { f: () => 1 }; t['f']();",
  computedObject: "const k: string = ''; const v = () => 1; const o = { [k]: v };",
  classWithoutParameterProperty:
    "class Item { readonly id: string; constructor(id: string) { this.id = id; } }" +
    "export function read(items: readonly Item[], i: number) { return items[i]?.id; }",
  textInDeclaration:
    "const o = { a: 'A', b: 'B', f: () => 1 };" +
    "export function read(k: 'a' | 'b') { const { [k]: v } = o; return v; }",
  textInAssignment:
    "const o = { a: 'A', b: 'B', f: () => 1 };" +
    "export function read(k: 'a' | 'b') { let v: string; ({ [k]: v } = o); return v; }",
  textInParameter: "export function read(k: 'a' | 'b', { [k]: v }: { a: string; b: string; f(): void }) { return v; }",
  boundedParameter: "export function read<T extends Record<string, number>>(k: string, { [k]: v }: T) { return v; }",
  nestedDeclaration:
    "export function read(o: { xs: Record<string, Date> }, k: string) { const { xs: { [k]: v } } = o; return v; }",
  nestedAssignment:
    "export function read(o: { xs: Record<string, Date> }, k: string) { let v: Date; ({ xs: { [k]: v } } = o); }",
  optionalError: "export function read(v: { xs: Error[] } | null, i: number) { return v?.xs[i]; }",
  moduleLocal: "const module = { kind: 'm' }; const k = 'kind'; module[k];",
};
const rejected = {
  functionContainer: "type T = (() => void) & { a: number }; export function read(k: 'a', { [k]: v }: T) { return v; }",
  classContainer: "class Item { static a = 1; } const k = 'a'; const { [k]: v } = Item;",
  ambientContainer: "const k = 'PI'; const { [k]: v } = Math;",
  ambientByType: "export function read(k: 'PI', { [k]: v }: typeof Math) { return v; }",
  anyContainer: "export function read(o: any, k: string) { const { [k]: v } = o; }",
  unknownContainer: "export function read(o: unknown, k: string) { const { [k]: v } = o; }",
  freeParameter: "export function read<T>(k: string, { [k]: v }: Record<string, T>) { return v; }",
  nestedAssignment:
    "export function read(o: { xs: Record<string, () => void> }, k: string) {" +
    "let v: unknown; ({ xs: { [k]: v } } = o); }",
  defaultDoesNotHideFunction:
    "export function read(o: Record<string, (() => void) | undefined>, k: string) {" +
    "const { [k]: v = 1 } = o; return v; }",
  convertedDeclarationKey: "const o = { a: 1 }; const k = 'a' as any; const { [k]: v } = o;",
  convertedAssignmentKey: "const o = { a: 1 }; const k = 'a' as any; let v; ({ [k]: v } = o);",
};
for (const [name, code] of Object.entries(admitted))
  it(`212 selection neighbor: admits ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy)).toEqual([]);
  });
for (const [name, code] of Object.entries(rejected))
  it(`212 selection neighbor: rejects ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).length).toBeGreaterThan(0);
  });
const keys = {
  numberInRecord: "export function read(o: Record<string, number>, k: number) { BODY }",
  numericText: "export function read(o: number[], k: '0' | '1') { BODY }",
  indexedSymbol: "export function read(o: { [k: symbol]: number }, k: symbol) { BODY }",
  ownSymbol: "const k = Symbol('datum'); const o = { [k]: 1 }; export function read() { BODY }",
};
for (const [name, template] of Object.entries(keys))
  for (const [form, body] of Object.entries({
    brackets: "return o[k];",
    declaration: "const { [k]: v } = o; return v;",
    assignment: "let v: number | undefined; ({ [k]: v } = o); return v;",
  }))
    it(`212 keys: admits ${name} ${form}`, () => {
      expect(secretBoundaryViolations({ "tool.ts": template.replace("BODY", body) }, policy)).toEqual([]);
    });
const iterations = {
  assignsData: [false, "let v: unknown; for ({ [k]: v } of [o]) {}"],
  assignsFunction: [true, "let v: unknown; for ({ [k]: v } of [o]) {}"],
  setOfData: [false, "let v: unknown; for ({ [k]: v } of new Set([o])) {}"],
  setOfFunction: [true, "let v: unknown; for ({ [k]: v } of new Set([o])) {}"],
} as const;
for (const [name, [reject, body]] of Object.entries(iterations))
  it(`212 iteration: ${name}`, () => {
    const value = reject ? "() => number" : "number";
    const code = `export function read(o: Record<string, ${value}>, k: string) { ${body} }`;
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).length > 0).toBe(reject);
  });
for (const declaration of ["", "const "])
  it(`212 iteration: conversion in ${declaration || "assignment"}`, () => {
    const code =
      "let v: unknown; const k: string = 'a';" + `for (${declaration}{ [k]: v } of [{} as Record<string, number>]) {}`;
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).some(x => x.includes("converted"))).toBe(true);
  });
it("212 keys: a generic bound hides constructor in no syntax", () => {
  const code =
    "export function read<K extends 'a' | 'constructor'>(o: Record<string, number>, k: K) {" +
    "o[k]; const { [k]: v } = o; let w: unknown; ({ [k]: w } = o);" +
    "const take = ({ [k]: x }: Record<string, number>) => x; return [v, w, take(o)]; }";
  const found = secretBoundaryViolations({ "tool.ts": code }, policy);
  expect(found.filter(message => message.endsWith(" → constructor"))).toHaveLength(4);
});
for (const [name, code] of Object.entries({
  shadowedCoercion:
    "const String = (x: unknown) => x; function data() { return [String((() => 1) as any)]; }" +
    "const i: number = 0; data()[i];",
  coercionToAny: "const k = String('a') as any; const o = { a: 1 }; o[k];",
  doubleCoercion: "const k = Number('1') as unknown as number; const o = [1]; o[k];",
}))
  it(`212 coercions: rejects ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).some(x => x.includes("converted"))).toBe(true);
  });
