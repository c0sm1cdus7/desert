// Rule U trusts an installed package by what it is, never by where the gate runs or by DESERT's absolute path. A product
// that builds with DESERT (`desert-sdk: file:../desert`) runs the gate from its own folder beside its own node_modules;
// that layout must judge exactly as DESERT alone, and a judged tree must still never make a module trusted.
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { installedPackage } from "../src/authoring/catalog/gate/package-identity.ts";

const desertNode = resolve(import.meta.dirname, "../node_modules/@types/node");
const folder = "src/svelte/catalog/compositions/c";
const declaration = `import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CContract } from "./c.contract.ts";
export const C = defineComposition({ id: "c", purpose: "x", owner: { entry: "C.svelte" }, uses: [], approval: "none", contract: CContract } as const);\n`;
const contract = `import { Type } from "@sinclair/typebox";
import type { Shape } from "../../../../views/shape.ts";
export const CContract = { props: Type.Object({ a: Type.Unsafe<Shape>() }, { additionalProperties: false }) } as const;\n`;
// @types/pg holds `/// <reference types="node" />`: importing it pulls a @types/node into the program, as DESERT's own tree does.
const throughPg = (shape: string) => `import type { PoolConfig } from "pg";\nexport type Keep = PoolConfig;\n${shape}\n`;

/** A scratch folder holding `product/` (the folder the gate runs from) and `tree/` (the judged tree). */
function layout(run: (paths: Readonly<{ base: string; product: string; tree: string }>) => void) {
  const base = mkdtempSync(join(tmpdir(), "desert-rule-u-packages-")), product = join(base, "product"), tree = join(base, "tree");
  mkdirSync(product); mkdirSync(tree);
  try { run({ base, product, tree }); } finally { rmSync(base, { recursive: true, force: true }); }
}
const copyNode = (to: string) => cpSync(desertNode, to, { recursive: true, dereference: true });

const source = (path: string) => JSON.stringify(pathToFileURL(resolve(import.meta.dirname, "..", path)).href);
// Its own process per judgement, started in `cwd` like a product's build: TypeScript memoizes the process's working
// folder at its first use, so two layouts judged in one process would share the first one's.
const judgement = `const [{ contractTypeViolations }, { formatViolation }, { DesertLayout }, { readContract }, { readDeclarations }] = await Promise.all([
  import(${source("src/authoring/catalog/gate/contract-types.ts")}), import(${source("src/authoring/catalog/gate/violation.ts")}),
  import(${source("src/authoring/catalog/layout.ts")}), import(${source("src/authoring/catalog/read-contract.ts")}),
  import(${source("src/authoring/catalog/read-declaration.ts")})]);
const { tree, folder, declaration, contract } = JSON.parse(process.argv[1]);
const [read] = readDeclarations(folder + "/c.catalog.ts", declaration);
const closed = readContract(folder + "/c.contract.ts", contract, DesertLayout);
if (!read || !closed.closed) throw new Error("the fixture contract is not closed");
const found = contractTypeViolations(tree, DesertLayout, [{ declaration: { path: folder + "/c.catalog.ts", declaration: read }, contract: closed }]);
process.stdout.write(JSON.stringify(found.map(formatViolation)));`;

/** Rule U over one closed contract in `tree`, run from `cwd`: every finding as the gate prints it. */
function judge(tree: string, cwd: string, shape: string, extra: Readonly<Record<string, string>> = {}): readonly string[] {
  const files = { [`${folder}/c.catalog.ts`]: declaration, [`${folder}/c.contract.ts`]: contract, "src/views/shape.ts": shape, ...extra };
  for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(tree, path)), { recursive: true }); writeFileSync(join(tree, path), text); }
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", judgement, JSON.stringify({ tree, folder, declaration, contract })],
    { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(output);
}

test("a product building beside its own @types/node judges as DESERT alone", () => layout(({ product, tree }) => {
  copyNode(join(product, "node_modules/@types/node"));
  assert.deepEqual(judge(tree, product, throughPg("export type Shape = { id: string };")), []);
}));

test("a product's own different @types/node never joins the judgement: a Node type stays Node's", () => layout(({ product, tree }) => {
  mkdirSync(join(product, "node_modules/@types/node"), { recursive: true });
  writeFileSync(join(product, "node_modules/@types/node/package.json"), readFileSync(join(desertNode, "package.json")));
  writeFileSync(join(product, "node_modules/@types/node/index.d.ts"), "declare global { type Buffer = string; }\nexport {};\n");
  assert.deepEqual(judge(tree, product, throughPg("export type Shape = { id: string };")), []);
  const found = judge(tree, product, throughPg("export type Shape = { bytes: Buffer };"));
  assert.ok(found.length > 0 && found.every(item => /props\.a\.bytes resolves to Buffer.* \(@types\/node\//.test(item)), found.join("\n"));
}));

test("a judged tree's own node_modules/@types/node is never a package, from the tree's folder or by import", () => layout(({ tree }) => {
  mkdirSync(join(tree, "node_modules/@types/node"), { recursive: true });
  writeFileSync(join(tree, "node_modules/@types/node/package.json"), readFileSync(join(desertNode, "package.json")));
  writeFileSync(join(tree, "node_modules/@types/node/index.d.ts"), "declare global { type Buffer = string; }\nexport {};\n");
  // Run from the tree itself: its fake does not replace Node's Buffer.
  const fromTree = judge(tree, tree, throughPg("export type Shape = { bytes: Buffer };"));
  assert.ok(fromTree.length > 0 && fromTree.every(item => /resolves to Buffer.* \(@types\/node\//.test(item)), fromTree.join("\n"));
  // A byte-identical copy imported from the tree is a tree file: its directives and ambient modules are findings.
  copyNode(join(tree, "src/views/node_modules/@types/node"));
  const imported = judge(tree, tree, 'import type {} from "./node_modules/@types/node/fs.d.ts";\nexport type Shape = { id: string };').join("\n");
  assert.match(imported, /src\/views\/node_modules\/@types\/node\/fs\.d\.ts:\d+: declares module "fs"/);
}));

test("a package's identity: the same name, version and bytes in a node_modules outside the judged tree", () => layout(({ base, product, tree }) => {
  const own = installedPackage(join(desertNode, "fs.d.ts"), tree);
  assert.deepEqual(own, { name: "@types/node", at: "@types/node/fs.d.ts" });
  copyNode(join(product, "node_modules/@types/node"));
  assert.deepEqual(installedPackage(join(product, "node_modules/@types/node/fs.d.ts"), tree), own);
  // The same copy inside the judged tree is a tree file.
  copyNode(join(tree, "node_modules/@types/node"));
  assert.equal(installedPackage(join(tree, "node_modules/@types/node/fs.d.ts"), tree), undefined);
  // A folder named like the package but not under node_modules, and a node_modules link to it, are not the package.
  copyNode(join(base, "vendor/@types/node"));
  assert.equal(installedPackage(join(base, "vendor/@types/node/fs.d.ts"), tree), undefined);
  mkdirSync(join(base, "linked/node_modules/@types"), { recursive: true });
  symlinkSync(join(base, "vendor/@types/node"), join(base, "linked/node_modules/@types/node"));
  assert.equal(installedPackage(join(base, "linked/node_modules/@types/node/fs.d.ts"), tree), undefined);
  // Another version, or an edited file, is another package.
  copyNode(join(base, "older/node_modules/@types/node"));
  const manifest = JSON.parse(readFileSync(join(desertNode, "package.json"), "utf8"));
  writeFileSync(join(base, "older/node_modules/@types/node/package.json"), JSON.stringify({ ...manifest, version: `${manifest.version}-other` }));
  assert.equal(installedPackage(join(base, "older/node_modules/@types/node/fs.d.ts"), tree), undefined);
  copyNode(join(base, "edited/node_modules/@types/node"));
  writeFileSync(join(base, "edited/node_modules/@types/node/fs.d.ts"), `${readFileSync(join(desertNode, "fs.d.ts"), "utf8")}\nexport type Leak = any;\n`);
  assert.equal(installedPackage(join(base, "edited/node_modules/@types/node/fs.d.ts"), tree), undefined);
  // A package the checkout does not install is never trusted.
  mkdirSync(join(base, "other/node_modules/not-installed"), { recursive: true });
  writeFileSync(join(base, "other/node_modules/not-installed/package.json"), '{"name":"not-installed","version":"1.0.0"}');
  writeFileSync(join(base, "other/node_modules/not-installed/index.d.ts"), "export type X = string;\n");
  assert.equal(installedPackage(join(base, "other/node_modules/not-installed/index.d.ts"), tree), undefined);
}));
