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
  ["the Function type", "export type Shape = { run: Function };", /props\.a\.run resolves to Function/],
  ["the Object type", "export type Shape = { box: Object };", /props\.a\.box resolves to Object/],
  ["an empty object type", "export type Shape = { box: {} };", /props\.a\.box resolves to \{\}/],
  ["an unconstrained generic", "export type Shape = { echo: <T>(value: T) => T };", /props\.a\.echo\(value\) resolves to the unconstrained generic T/],
  ["a conditional over a generic", "export type Shape = { pick: <T>(value: T) => T extends string ? number : boolean };", /unconstrained generic/],
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

test("a library interface other than the trusted value types is walked member by member", () => {
  assert.match(judge("Type.Unsafe<Shape>()", "export type Shape = { failure: PropertyDescriptor };").join("\n"), /props\.a\.failure\.value resolves to any/);
  assert.match(judge("Type.Unsafe<Shape>()", "export type Shape = { make: ObjectConstructor };").join("\n"), /props\.a\.make\..* resolves to any/);
  assert.match(judge("Type.Unsafe<Shape>()", "export type Shape = { failure: Error };").join("\n"), /props\.a\.failure\.cause resolves to unknown/);
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
