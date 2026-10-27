// Rule U trusts an installed package by what it is, never by where the gate runs or by DESERT's absolute path. A product
// that builds with DESERT (`desert-sdk: file:../desert`) runs the gate from its own folder beside its own node_modules;
// that layout must judge exactly as DESERT alone, and a judged tree must still never make a module trusted.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { packageTrust } from "../src/authoring/catalog/gate/package-identity.ts";

const desert = resolve(import.meta.dirname, "..");
const desertNode = join(desert, "node_modules/@types/node");
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

/** A DESERT checkout at `at`: this checkout's sources and the installed packages the judgement loads (with their
 * dependencies), except `without`. */
function checkoutAt(at: string, without: readonly string[] = []) {
  cpSync(join(desert, "src"), join(at, "src"), { recursive: true });
  cpSync(join(desert, "package.json"), join(at, "package.json"));
  const pending = ["typescript", "@sinclair/typebox", "svelte", "@types/pg"], copied = new Set<string>();
  while (pending.length) {
    const name = pending.pop()!;
    if (copied.has(name) || without.includes(name) || !existsSync(join(desert, "node_modules", name))) continue;
    copied.add(name);
    cpSync(join(desert, "node_modules", name), join(at, "node_modules", name), { recursive: true, dereference: true });
    const manifest = JSON.parse(readFileSync(join(desert, "node_modules", name, "package.json"), "utf8"));
    pending.push(...Object.keys(manifest.dependencies ?? {}));
  }
}

const source = (checkout: string, path: string) => JSON.stringify(pathToFileURL(join(checkout, path)).href);
// Its own process per judgement, started in `cwd` like a product's build: TypeScript memoizes the process's working
// folder at its first use, so two layouts judged in one process would share the first one's.
const judgement = (checkout: string) => `const [{ contractTypeViolations }, { formatViolation }, { DesertLayout }, { readContract }, { readDeclarations }] = await Promise.all([
  import(${source(checkout, "src/authoring/catalog/gate/contract-types.ts")}), import(${source(checkout, "src/authoring/catalog/gate/violation.ts")}),
  import(${source(checkout, "src/authoring/catalog/layout.ts")}), import(${source(checkout, "src/authoring/catalog/read-contract.ts")}),
  import(${source(checkout, "src/authoring/catalog/read-declaration.ts")})]);
const { tree, folder, declaration, contract } = JSON.parse(process.argv[1]);
const [read] = readDeclarations(folder + "/c.catalog.ts", declaration);
const closed = readContract(folder + "/c.contract.ts", contract, DesertLayout);
if (!read || !closed.closed) throw new Error("the fixture contract is not closed");
const found = contractTypeViolations(tree, DesertLayout, [{ declaration: { path: folder + "/c.catalog.ts", declaration: read }, contract: closed }]);
process.stdout.write(JSON.stringify(found.map(formatViolation)));`;

/** Rule U over one closed contract in `tree`, run from `cwd` by the gate in `checkout`: every finding as the gate prints it. */
function judge(tree: string, cwd: string, shape: string, extra: Readonly<Record<string, string>> = {}, checkout = desert): readonly string[] {
  const files = { [`${folder}/c.catalog.ts`]: declaration, [`${folder}/c.contract.ts`]: contract, "src/views/shape.ts": shape, ...extra };
  for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(tree, path)), { recursive: true }); writeFileSync(join(tree, path), text); }
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", judgement(checkout), JSON.stringify({ tree, folder, declaration, contract })],
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

test("a checkout inside the product's folder never falls through to the product's node_modules", () => layout(({ product, tree }) => {
  const checkout = join(product, "desert");
  checkoutAt(checkout);
  // The product's TypeBox: the same name, version and files, with one more export the checkout's does not have.
  const typebox = join(product, "node_modules/@sinclair/typebox");
  cpSync(join(desert, "node_modules/@sinclair/typebox"), typebox, { recursive: true });
  const manifest = JSON.parse(readFileSync(join(typebox, "package.json"), "utf8"));
  manifest.exports["./x"] = { import: { types: "./build/esm/type/string/string.d.mts", default: "./build/esm/type/string/string.mjs" } };
  writeFileSync(join(typebox, "package.json"), JSON.stringify(manifest));
  assert.deepEqual(judge(tree, product, "export type Shape = { id: string };", {}, checkout), []);
  const found = judge(tree, product, 'import type { TString } from "@sinclair/typebox/x";\nexport type Shape = { id: string; schema?: TString };', {}, checkout);
  assert.ok(found.some(item => /^CONTRACT_OPEN_TYPE: src\/views\/shape\.ts: imports @sinclair\/typebox\/x, which resolves outside DESERT's node_modules \(\.\.\/product\/node_modules\/@sinclair\/typebox\/build\/esm\/type\/string\/string\.d\.mts\)/.test(item)), found.join("\n"));
}));

test("a package's type reference the checkout cannot satisfy never falls through to the product's node_modules", () => layout(({ product, tree }) => {
  const checkout = join(product, "desert");
  checkoutAt(checkout, ["@types/node", "undici-types"]);
  copyNode(join(product, "node_modules/@types/node"));
  const found = judge(tree, product, throughPg("export type Shape = { id: string };"), {}, checkout);
  assert.ok(found.some(item => /^CONTRACT_OPEN_TYPE: node_modules\/@types\/pg\/index\.d\.ts: references types "node", which resolves outside DESERT's node_modules \(\.\.\/product\/node_modules\/@types\/node\/index\.d\.ts\)/.test(item)), found.join("\n"));
  // Nothing of the product's @types/node joined: no file of it is judged as a tree file.
  assert.ok(!found.some(item => item.includes("product/node_modules/@types/node") && !item.includes("references types")), found.join("\n"));
}));

// undici-types is Node's fetch, and many of its exports would pass the walk as closed (Pool.PoolStats, MIMEType, Cookie):
// it is a platform package like @types/node, so its object types never cross a contract.
test("a type declared by undici-types is Node's platform, even when its members are closed", () => layout(({ product, tree }) => {
  const found = judge(tree, product, 'import type { Pool, MIMEType } from "undici-types";\nexport type Shape = { stats: Pool.PoolStats; mime: MIMEType };');
  assert.ok(found.some(item => /props\.a\.stats resolves to PoolStats \(undici-types\/pool-stats\.d\.ts\)/.test(item)), found.join("\n"));
  assert.ok(found.some(item => /props\.a\.mime resolves to MIMEType \(undici-types\//.test(item)), found.join("\n"));
}));

const text = (path: string) => readFileSync(path, "utf8");

test("a package's identity: the same name, version and text in a node_modules outside the judged tree", () => layout(({ base, product, tree }) => {
  const trust = packageTrust(tree), identity = (path: string) => trust(path, text(path));
  const own = identity(join(desertNode, "fs.d.ts"));
  assert.deepEqual(own, { name: "@types/node", at: "@types/node/fs.d.ts" });
  copyNode(join(product, "node_modules/@types/node"));
  assert.deepEqual(identity(join(product, "node_modules/@types/node/fs.d.ts")), own);
  // The same copy inside the judged tree is a tree file.
  copyNode(join(tree, "node_modules/@types/node"));
  assert.equal(identity(join(tree, "node_modules/@types/node/fs.d.ts")), undefined);
  // A folder named like the package but not under node_modules, and a node_modules link to it, are not the package.
  copyNode(join(base, "vendor/@types/node"));
  assert.equal(identity(join(base, "vendor/@types/node/fs.d.ts")), undefined);
  mkdirSync(join(base, "linked/node_modules/@types"), { recursive: true });
  symlinkSync(join(base, "vendor/@types/node"), join(base, "linked/node_modules/@types/node"));
  assert.equal(identity(join(base, "linked/node_modules/@types/node/fs.d.ts")), undefined);
  // Another version, or an edited file, is another package.
  copyNode(join(base, "older/node_modules/@types/node"));
  const manifest = JSON.parse(readFileSync(join(desertNode, "package.json"), "utf8"));
  writeFileSync(join(base, "older/node_modules/@types/node/package.json"), JSON.stringify({ ...manifest, version: `${manifest.version}-other` }));
  assert.equal(identity(join(base, "older/node_modules/@types/node/fs.d.ts")), undefined);
  copyNode(join(base, "edited/node_modules/@types/node"));
  writeFileSync(join(base, "edited/node_modules/@types/node/fs.d.ts"), `${readFileSync(join(desertNode, "fs.d.ts"), "utf8")}\nexport type Leak = any;\n`);
  assert.equal(identity(join(base, "edited/node_modules/@types/node/fs.d.ts")), undefined);
  // A package the checkout does not install is never trusted.
  mkdirSync(join(base, "other/node_modules/not-installed"), { recursive: true });
  writeFileSync(join(base, "other/node_modules/not-installed/package.json"), '{"name":"not-installed","version":"1.0.0"}');
  writeFileSync(join(base, "other/node_modules/not-installed/index.d.ts"), "export type X = string;\n");
  assert.equal(identity(join(base, "other/node_modules/not-installed/index.d.ts")), undefined);
}));
