// Rule U: the checker judges what every closed contract's types resolve to, not only where they are imported from.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { contractTypeViolations } from "../src/authoring/catalog/gate/contract-types.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { readContract } from "../src/authoring/catalog/read-contract.ts";
import { readDeclarations } from "../src/authoring/catalog/read-declaration.ts";

const folder = "src/svelte/catalog/compositions/c";
const declaration = `import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CContract } from "./c.contract.ts";
export const C = defineComposition({ id: "c", purpose: "x", owner: { entry: "C.svelte" }, uses: [], approval: "none", contract: CContract } as const);\n`;
const contract = (field: string) => `import { Type } from "@sinclair/typebox";
import type { Shape } from "../../../../views/shape.ts";
export const CContract = { props: Type.Object({ a: ${field} }, { additionalProperties: false }) } as const;\n`;

function judge(field: string, shape: string, extra: Readonly<Record<string, string>> = {}, throughLink = false): readonly string[] {
  const root = mkdtempSync(join(tmpdir(), "desert-contract-types-")), link = `${root}-link`;
  try {
    const files = { [`${folder}/c.catalog.ts`]: declaration, [`${folder}/c.contract.ts`]: contract(field), "src/views/shape.ts": shape, ...extra };
    for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
    const [read] = readDeclarations(`${folder}/c.catalog.ts`, declaration);
    const closed = readContract(`${folder}/c.contract.ts`, contract(field), DesertLayout);
    assert.ok(read && closed.closed);
    if (throughLink) symlinkSync(root, link);
    return contractTypeViolations(throughLink ? link : root, DesertLayout, [{ declaration: { path: `${folder}/c.catalog.ts`, declaration: read }, contract: closed }])
      .map(item => item.what);
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(link, { force: true }); }
}

test("domain values, ES library generics and mapped utilities are closed", () => {
  assert.deepEqual(judge("Type.Unsafe<Shape>()", `export type Shape = Readonly<{ id: string; at: Date; tags: readonly string[];
  load: (id: string) => Promise<ReadonlyMap<string, number>>; pick: Pick<{ kind: "a" | "b"; n: number }, "kind"> }>;\n`), []);
});

for (const [name, shape, what] of [
  ["unknown deep in a domain type", "export type Shape = { inner: { values: Record<string, unknown> } };", /props\.a\.inner\.values\[\] resolves to unknown/],
  ["any behind an alias", "type Loose = any;\nexport type Shape = { loose: Loose };", /props\.a\.loose resolves to any/],
  ["the object keyword", "export type Shape = { identity: object };", /props\.a\.identity resolves to object/],
  ["a DOM element in a callback", "export type Shape = { attach: (media: HTMLMediaElement) => void };", /props\.a\.attach\(media\) resolves to HTMLMediaElement \(lib\.dom/],
  ["a DOM type inside a generic", "export type Shape = { files: ReadonlyMap<string, File> };", /props\.a\.files<1> resolves to File/],
  ["the Function type", "export type Shape = { run: Function };", /props\.a\.run resolves to the library type Function/],
  ["the Object type", "export type Shape = { box: Object };", /props\.a\.box resolves to the library type Object/],
  ["an empty object type", "export type Shape = { box: {} };", /props\.a\.box resolves to \{\}/],
  ["an unconstrained generic", "export type Shape = { echo: <T>(value: T) => T };", /props\.a\.echo\(value\) resolves to the unconstrained generic T/],
  ["an open this parameter", "export type Shape = { call: (this: any, id: string) => void };", /props\.a\.call\(this\) resolves to any/],
] as const) test(`${name} is an open contract type`, () => {
  const found = judge("Type.Unsafe<Shape>()", shape);
  assert.equal(found.length, 1, found.join("\n"));
  assert.match(found[0] ?? "", what);
});

test("a constrained generic is as closed as its constraint", () => {
  assert.deepEqual(judge("Type.Unsafe<Shape>()", 'export type Method = "password" | "passkey";\nexport type Shape = { go: <K extends Method>(method: K) => void };'), []);
  assert.deepEqual(judge("Type.Unsafe<Shape>()", 'export type Shape = { brand: string & {} };'), []);
});

test("an unresolved import, or one leaving the judged tree, is named, not silently any", () => {
  const found = judge("Type.Unsafe<Shape>()", 'import type { Gone } from "./gone.ts";\nexport type Shape = { gone: Gone };').join("\n");
  assert.match(found, /src\/views\/shape\.ts: imports \.\/gone\.ts, which does not resolve inside the judged tree|imports \.\/gone\.ts, which does not resolve/);
  assert.match(judge("Type.Unsafe<Shape>()", 'import type { Out } from "../../../outside.ts";\nexport type Shape = { out: Out };').join("\n"), /imports \.\.\/\.\.\/\.\.\/outside\.ts, which does not resolve inside the judged tree/);
});

test("a tree file cannot change what the checker believes: shims, reference directives and global augmentation", () => {
  const shim = 'declare module "@sinclair/typebox" { export type TSchema = unknown; export type Static<T> = string; }\n';
  const shimmed = judge("Type.Unsafe<Shape>()", '/// <reference path="./typebox-shim.d.ts" />\nexport type Shape = { raw: unknown };', { "src/views/typebox-shim.d.ts": shim }).join("\n");
  assert.match(shimmed, /holds \/\/\/ <reference path="\.\/typebox-shim\.d\.ts" \/>/);
  assert.match(shimmed, /declares module "@sinclair\/typebox"/);
  assert.match(judge("Type.Unsafe<Shape>()", '/// <reference types="evil" />\nexport type Shape = { id: string };').join("\n"), /holds \/\/\/ <reference types="evil" \/>/);
  const augmented = judge("Type.Unsafe<Shape>()", "declare global { interface Date { leak: any } }\nexport type Shape = { at: Date };").join("\n");
  assert.match(augmented, /declares global/);
  assert.match(augmented, /props\.a\.at\.leak resolves to any/);
});

test("a tree file named like TypeScript's library is a tree file", () => {
  const spoof = { "src/views/typescript/lib/lib.es2099.evil.d.ts": "export interface Evil { loose: any }\n" };
  assert.match(judge("Type.Unsafe<Shape>()", 'import type { Evil } from "./typescript/lib/lib.es2099.evil.d.ts";\nexport type Shape = { evil: Evil };', spoof).join("\n"),
    /props\.a\.evil\.loose resolves to any/);
});

test("a library type other than the trusted value types is refused as it is", () => {
  for (const [shape, name] of [["PropertyDescriptor", "PropertyDescriptor"], ["ObjectConstructor", "ObjectConstructor"], ["Error", "Error"],
    ["Function", "Function"], ["Object", "Object"], ["Promise<Error>", "Error"], ["Map<string, JSON>", "JSON"]] as const) {
    assert.deepEqual(judge("Type.Unsafe<Shape>()", `export type Shape = { x: ${shape} };`).map(item => item.replace(/;.*/, "")).filter(item => item.includes("library type")),
      [`c props.a.x${shape.includes("<") ? (shape.startsWith("Map") ? "<1>" : "<0>") : ""} resolves to the library type ${name}`], shape);
  }
});

test("the trusted value types are judged by their own type arguments, without the library's any defaults", () => {
  assert.deepEqual(judge("Type.Unsafe<Shape>()", `export type Shape = { a: Iterable<string>; b: AsyncIterable<number>; c: () => PromiseLike<string>;
  d: RegExpMatchArray; e: TemplateStringsArray; f: ReadonlyMap<string, readonly Date[]>; g: Uint8Array };`), []);
  assert.match(judge("Type.Unsafe<Shape>()", "export type Shape = { a: Iterable<any> };").join("\n"), /props\.a\.a<0> resolves to any/);
});

test("a script file in the tree is refused: its declarations would change the library", () => {
  for (const merge of ["interface Array<T> { leak: any }", "interface ReadonlyArray<T> { leak: any }", "interface String { leak: any }"]) {
    assert.match(judge("Type.Unsafe<Shape>()", 'import "./aug.ts";\nexport type Shape = { p: readonly string[]; q: string };', { "src/views/aug.ts": `${merge}\n` }).join("\n"),
      /is a script file/, merge);
  }
});

test("a recursive generic domain type terminates", () => {
  const found = judge("Type.Unsafe<Shape>()", "export interface Tree<T> { value: T; map<U extends string>(f: (value: T) => U): Tree<U>; children: readonly Tree<T>[] }\nexport type Shape = { tree: Tree<string> };");
  assert.ok(found.every(item => !/any|unknown/.test(item)), found.join("\n"));
});

test("a branching recursive generic stops at the walk's budget with one finding", () => {
  const found = judge("Type.Unsafe<Shape>()", "export interface B<T> { l: B<[T, 0]>; r: B<[T, 1]> }\nexport type Shape = { x: B<string> };");
  assert.ok(found.length <= 11, found.slice(0, 3).join("\n"));
  assert.match(found.at(-1) ?? "", /(reaches more than \d+ types|nests deeper than \d+ levels)/);
});

test("a setter's write type and a type predicate are judged", () => {
  assert.match(judge("Type.Unsafe<Shape>()", "export interface X { get v(): string; set v(value: any) }\nexport type Shape = { x: X };").join("\n"), /props\.a\.x\.v= resolves to any/);
  assert.match(judge("Type.Unsafe<Shape>()", "export type Shape = { check: (v: string) => v is any };").join("\n"), /props\.a\.check\(\) is resolves to any/);
});

test("a contract type composes library types, it never extends one", () => {
  for (const shape of ["export class Path extends Array<string> { label = \"x\" }\nexport type Shape = { t: Path };",
    "export class Failure extends Error { code = \"x\" }\nexport type Shape = { t: Failure };",
    "export interface L<T> extends Array<T> { label: string }\nexport type Shape = { t: L<string> };",
    "export interface Labels extends Array<string> { leak: any }\nexport type Shape = { t: Labels };",
    "type Mix = PropertyDescriptor & { tag: string };\nexport interface L extends Mix {}\nexport type Shape = { t: L };",
    "export function M<T extends new (...a: any[]) => object>(B: T) { return class extends B {} }\nexport class Tree extends M(Error) {}\nexport type Shape = { t: Tree };"]) {
    assert.match(judge("Type.Unsafe<Shape>()", shape).join("\n"), /props\.a\.t resolves to a type that extends the library type/, shape);
  }
});
test("a quoted \"#name\" key is an ordinary member", () => {
  assert.match(judge("Type.Unsafe<Shape>()", 'export type Shape = { "#leak": any };').join("\n"), /#leak resolves to any/);
});

test("a private or #private member is not part of the contract", () => {
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "class Host { #raw: unknown = 1; private loose: any = 1; open(id: string): void {} }\nexport type Shape = { host: Host };"), []);
});

test("a no-default-lib directive in a tree file is a finding, never a crash or a replacement library", () => {
  assert.match(judge("Type.Unsafe<Shape>()", '/// <reference no-default-lib="true" />\nexport type Shape = { id: string };').join("\n"), /holds \/\/\/ <reference no-default-lib="true" \/>/);
});

test("a judged tree reached through a symbolic link is judged the same", () => {
  const found = judge("Type.Unsafe<Shape>()", "export type Shape = { raw: unknown };", {}, true);
  assert.deepEqual(found.map(item => item.replace(/;.*/, "")), ["c props.a.raw resolves to unknown"]);
});

test("every member with an open type is its own finding", () => {
  assert.equal(judge("Type.Unsafe<Shape>()", "export type Shape = { one: any; two: any };").length, 2);
});

test("an open type in a callback of the contract itself is judged too", () => {
  assert.match(judge("Type.Function([Type.Unsafe<Shape>()], Type.Void())", "export type Shape = { raw: unknown };").join("\n"), /props\.a\(param\)<0>\.raw resolves to unknown/);
});

test("generic tree types are judged on the instance: members and setters", () => {
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "export interface Box<T> { get v(): T; set v(value: T) }\nexport type Shape = { x: Box<string> };"), []);
  assert.match(judge("Type.Unsafe<Shape>()", "export interface Box<T> { get v(): T; set v(value: T) }\nexport type Shape = { x: Box<any> };").join("\n"), /props\.a\.x<0> resolves to any/);
  assert.match(judge("Type.Unsafe<Shape>()", "export interface Box<T> { get v(): string; set v(value: T) }\nexport type Shape = { x: Box<string> };").join("\n"), /props\.a\.x\.v= resolves to the unconstrained generic T/);
  assert.match(judge("Type.Unsafe<Shape>()", "export type Shape = { x: Readonly<{ a: any }> };").join("\n"), /props\.a\.x\.a resolves to any/);
});
test("large literal unions are closed, and a branching type with open leaves is one finding", () => {
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "type H = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'a'|'b'|'c'|'d'|'e'|'f';\nexport type Shape = { c: `${H}${H}${H}${H}` };"), []);
  const flood = judge("Type.Unsafe<Shape>()", "type B<T extends unknown[]> = T['length'] extends 12 ? any : { l: B<[...T, 0]>; r: B<[...T, 1]> };\nexport type Shape = { b: B<[]> };");
  assert.ok(flood.length <= 11, flood.slice(0, 3).join("\n"));
  assert.match(flood.at(-1) ?? "", /props holds more than \d+ open types/);
});

test("an inherited member is judged once, where it is declared", () => {
  const found = judge("Type.Unsafe<Shape>()", "export class Domain extends Array<string> { leak: any = 1 }\nexport class Tree extends Domain {}\nexport type Shape = { t: Tree };");
  assert.equal(found.length, 1, found.join("\n"));
});

test("members are judged on the instance: a conditional member that becomes any is caught", () => {
  for (const shape of ["export interface Base<T> { v: T extends 1 ? any : string }\nexport interface L<T> extends Base<T> {}\nexport type Shape = { l: L<1> };",
    "export class Base<T> { v!: T extends 1 ? any : string }\nexport class L<T> extends Base<T> {}\nexport type Shape = { l: L<1> };"]) {
    assert.match(judge("Type.Unsafe<Shape>()", shape).join("\n"), /props\.a\.l\.v resolves to any/, shape);
  }
});

test("a closed member of a generic tree base is closed on the instance", () => {
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "export interface Base<T> { v: T[keyof T] }\nexport interface L<T> extends Base<T> {}\nexport type Shape = { l: L<{ x: string }> };"), []);
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "export interface Base<T> { v: { [K in keyof T]: T[K] } }\nexport interface L<T> extends Base<T> {}\nexport type Shape = { l: L<{ a: string }> };"), []);
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "export function M<T extends new (...a: any[]) => object>(B: T) { return class extends B { fine = 's' } }\nexport class Base { ok = 1 }\nexport class Tree extends M(Base) {}\nexport type Shape = { t: Tree };"), []);
});

test("a conditional still waiting for its input is refused, whatever its branches", () => {
  for (const shape of ["export type Shape = { f: <T>(x: string) => T extends 1 ? any : string };",
    "export type Box<T extends string> = { f<U extends string>(x: U): U extends 'a' ? T : number };\nexport type Shape = { b: Box<'z'> };",
    "declare function make<T extends string>(): { f<U extends string>(x: U): U extends 'a' ? T : number };\nexport type Shape = { b: ReturnType<typeof make<'z'>> };"]) {
    assert.match(judge("Type.Unsafe<Shape>()", shape).join("\n"), /resolves to the unresolved conditional/, shape);
  }
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "type Pick1<T> = T extends string ? 's' : 'n';\nexport type Shape = { k: Pick1<string> };"), []);
});
test("a generic class's static side keeps its open constructor parameter", () => {
  assert.match(judge("Type.Unsafe<Shape>()", "export class Box<T> { v!: T; constructor(x: T) {} }\nexport type Shape = { k: typeof Box };").join("\n"), /unconstrained generic T/);
});

test("a limited section keeps its first findings before the limit", () => {
  const found = judge("Type.Unsafe<Shape>()", "type B<T extends unknown[]> = T['length'] extends 12 ? any : { l: B<[...T, 0]>; r: B<[...T, 1]> };\nexport type Shape = { real: any; b: B<[]> };");
  assert.ok(found.some(item => /props\.a\.real resolves to any/.test(item)), found.slice(0, 3).join("\n"));
  assert.match(found.at(-1) ?? "", /props holds more than \d+ open types; the walk of props stopped there/);
  assert.ok(found.length <= 11);
});

test("a deep or diamond heritage is bounded", () => {
  const diamond = Array.from({ length: 24 }, (_, i) => `interface A${i} extends A${i + 1}, B${i + 1} {}\ninterface B${i} extends A${i + 1}, B${i + 1} {}`).join("\n");
  const started = Date.now();
  const found = judge("Type.Unsafe<Shape>()", `${diamond}\ninterface A24 extends Error {}\ninterface B24 { id: string }\nexport type Shape = { t: A0 };`);
  assert.ok(Date.now() - started < 20000, "diamond heritage is climbed once per declaration");
  assert.match(found.join("\n"), /extends the library type Error/);
});

test("a getter and setter merged from two namespace blocks are judged apart", () => {
  const shape = "export namespace N { type A = string; export interface I { get v(): A } }\nexport namespace N { type A = any; export interface I { set v(x: A) } }\nexport type Shape = { b: N.I };";
  assert.match(judge("Type.Unsafe<Shape>()", shape).join("\n"), /props\.a\.b\.v= resolves to any/);
});

test("a mapped type still waiting for its keys is refused", () => {
  assert.match(judge("Type.Unsafe<Shape>()", "export type Shape = { f: <T extends { a: string }>(x: T) => { [K in keyof T]: K extends 'a' ? string : any } };").join("\n"),
    /resolves to the unresolved mapped type/);
});

test("extending a library mapped utility is not library heritage: its members are judged", () => {
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "type Base = { a: string; b: number };\nexport interface X extends Omit<Base, 'b'> { c: string }\nexport type Shape = { x: X };"), []);
  assert.match(judge("Type.Unsafe<Shape>()", "type Base = { a: string; b: any };\nexport interface X extends Pick<Base, 'b'> {}\nexport type Shape = { x: X };").join("\n"), /props\.a\.x\.b resolves to any/);
});

test("a mapped type whose keys or renames still mention a generic is pending, whatever the union around it", () => {
  for (const f of ["<U extends string>(x: U) => { [K in 'a' | U]: K extends 'a' ? string : any }",
    "<T extends { a: string }>(x: T) => { [K in 'a' | keyof T]: K extends 'a' ? string : any }",
    "<U extends string>(x: U) => { [K in 'a' | (U & 'b')]: K extends 'a' ? string : any }",
    "<U extends string>(x: U) => { [K in 'a' | 'b' as K extends 'a' ? K : `${K}${U}`]: K extends 'a' ? string : any }",
    "<T extends readonly string[]>(x: T) => Readonly<T>"]) {
    assert.match(judge("Type.Unsafe<Shape>()", `export type Shape = { f: ${f} };`).join("\n"), /unresolved mapped type/, f);
  }
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "type Rename<T> = { [K in keyof T as `x${string & K}`]: T[K] };\nexport type Shape = { r: Rename<{ a: string }>; o: Omit<{ a: string; b: number }, 'b'> };"), []);
});

test("an as clause reading its rename from a generic object is pending; a concrete filtering as clause is closed", () => {
  for (const shape of ["type Tab<U extends string> = { a: 'a'; b: `b${U}` };\ntype Mp<U extends string> = { [K in 'a' | 'b' as Tab<U>[K]]: K extends 'a' ? string : any };\nexport type Shape = { f: <U extends string>(x: U) => Mp<U> };",
    "type Mp<U extends string> = { [K in 'a' | 'b' as { a: 'a'; b: U }[K]]: K extends 'a' ? string : any };\nexport type Shape = { f: <U extends string>(x: U) => Mp<U> };",
    "interface Tab<U extends string> { a: 'a'; b: U }\nexport type Shape = { f: <U extends string>(x: U) => { [K in 'a' | 'b' as Tab<U>[K]]: K extends 'a' ? string : any } };"]) {
    assert.match(judge("Type.Unsafe<Shape>()", shape).join("\n"), /unresolved mapped type/, shape);
  }
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "type F<T> = { [K in keyof T as T[K] extends string ? K : never]: T[K] };\nexport type Shape = { r: F<{ a: string; b: number }> };"), []);
  assert.deepEqual(judge("Type.Unsafe<Shape>()", "type M<T> = { [K in keyof T as K extends 'a' ? never : K]: T[K] };\nexport type Shape = { m: M<{ a: string; b: number }> };"), []);
});
