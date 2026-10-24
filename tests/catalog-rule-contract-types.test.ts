// Rule U: the checker judges what every closed contract's types resolve to, not only where they are imported from.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

function judge(field: string, shape: string): readonly string[] {
  const root = mkdtempSync(join(tmpdir(), "desert-contract-types-"));
  try {
    const files = { [`${folder}/c.catalog.ts`]: declaration, [`${folder}/c.contract.ts`]: contract(field), "src/views/shape.ts": shape };
    for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); }
    const [read] = readDeclarations(`${folder}/c.catalog.ts`, declaration);
    const closed = readContract(`${folder}/c.contract.ts`, contract(field), DesertLayout);
    assert.ok(read && closed.closed);
    return contractTypeViolations(root, DesertLayout, [{ declaration: { path: `${folder}/c.catalog.ts`, declaration: read }, contract: closed }])
      .map(item => item.what);
  } finally { rmSync(root, { recursive: true, force: true }); }
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
  ["an unresolved import", 'import type { Gone } from "./gone.ts";\nexport type Shape = { gone: Gone };', /props\.a\.gone resolves to any/],
] as const) test(`${name} is an open contract type`, () => {
  const found = judge("Type.Unsafe<Shape>()", shape);
  assert.equal(found.length, 1, found.join("\n"));
  assert.match(found[0] ?? "", what);
});

test("an open type in a callback of the contract itself is judged too", () => {
  assert.match(judge("Type.Function([Type.Unsafe<Shape>()], Type.Void())", "export type Shape = { raw: unknown };").join("\n"), /props\.a\(param\)<0>\.raw resolves to unknown/);
});
