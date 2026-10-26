// Rule U's package trust against a checkout this test builds: a package is a real package root (a package.json that
// names it), never a dot-folder or a loose file; a copy outside the checkout is the package only when every root on its
// path is named and versioned as the checkout's, its text is the text the checker parsed, and the checkout's copy lies in
// the checkout; the outermost package decides, for the checkout's files and for copies alike. Each judgement runs in its
// own process from the product's folder, with the identity module loaded from the built checkout.
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const identityModule = resolve(import.meta.dirname, "../src/authoring/catalog/gate/package-identity.ts");
const declared = "export type X = string;\n";

type Paths = Readonly<{ base: string; checkout: string; packages: string; product: string; tree: string }>;
/** A checkout (`checkout/`, its identity module and node_modules), a product folder and a judged tree, all scratch. */
function layout(run: (paths: Paths) => void) {
  const base = mkdtempSync(join(tmpdir(), "desert-rule-u-trust-")), checkout = join(base, "checkout"), packages = join(checkout, "node_modules");
  const paths = { base, checkout, packages, product: join(base, "product"), tree: join(base, "tree") };
  mkdirSync(join(checkout, "src/authoring/catalog/gate"), { recursive: true });
  cpSync(identityModule, join(checkout, "src/authoring/catalog/gate/package-identity.ts"));
  for (const folder of [packages, paths.product, paths.tree]) mkdirSync(folder, { recursive: true });
  try { run(paths); } finally { rmSync(base, { recursive: true, force: true }); }
}
/** A package folder: `manifest` as its package.json (none when undefined) and `files` beside it. */
function write(folder: string, manifest: object | undefined, files: Readonly<Record<string, string>> = { "x.d.ts": declared }) {
  mkdirSync(folder, { recursive: true });
  if (manifest) writeFileSync(join(folder, "package.json"), JSON.stringify(manifest));
  for (const [path, text] of Object.entries(files)) { mkdirSync(dirname(join(folder, path)), { recursive: true }); writeFileSync(join(folder, path), text); }
}

type Ask = Readonly<{ file: string; judged: string; text?: string; edit?: Readonly<{ path: string; text: string }> }>;
/** Each question asked of one trust (one program), in order, in a process of its own started in the product's folder.
 * An `edit` is written before its question; `fresh` asks it of a new trust (the next program) instead. */
function ask(paths: Paths, asks: readonly (Ask & { fresh?: boolean })[]): readonly unknown[] {
  const script = `const { packageTrust } = await import(${JSON.stringify(pathToFileURL(join(paths.checkout, "src/authoring/catalog/gate/package-identity.ts")).href)});
const { readFileSync, writeFileSync } = await import("node:fs");
const trusts = new Map(), answers = [];
for (const { file, judged, text, edit, fresh } of JSON.parse(process.argv[1])) {
  if (edit) writeFileSync(edit.path, edit.text);
  if (fresh || !trusts.has(judged)) trusts.set(judged, packageTrust(judged));
  let parsed = text; if (parsed === undefined) { try { parsed = readFileSync(file, "utf8"); } catch { parsed = ""; } }
  answers.push(trusts.get(judged)(file, parsed) ?? null);
}
process.stdout.write(JSON.stringify(answers));`;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script, JSON.stringify(asks)], { cwd: paths.product, encoding: "utf8" }));
}

test("in the checkout a package is a real package root, never a dot-folder, a loose folder or a misnamed one", () => layout(paths => {
  const { checkout, packages, tree } = paths;
  write(join(packages, "kit"), { name: "kit", version: "1.0.0" });
  write(join(packages, "@scope/pkg"), { name: "@scope/pkg", version: "1.0.0" });
  write(join(packages, "bare"), { name: "bare" });
  write(join(packages, ".cache/kit"), { name: "kit", version: "1.0.0" });
  write(join(packages, ".vite-temp"), undefined);
  write(join(packages, "nameless"), undefined);
  write(join(packages, "misnamed"), { name: "other", version: "1.0.0" });
  write(join(packages, "@/unscoped"), { name: "@/unscoped", version: "1.0.0" });
  write(join(packages, ".hidden"), { name: ".hidden", version: "1.0.0" });
  writeFileSync(join(packages, "loose.d.ts"), declared);
  const of = (file: string, judged = tree) => ({ file: join(packages, file), judged });
  assert.deepEqual(ask(paths, [of("kit/x.d.ts"), of("@scope/pkg/x.d.ts"), of("bare/x.d.ts"), of(".cache/kit/x.d.ts"), of(".vite-temp/x.d.ts"),
    of("nameless/x.d.ts"), of("misnamed/x.d.ts"), of("@/unscoped/x.d.ts"), of(".hidden/x.d.ts"), of("loose.d.ts"), of("kit")]),
  [{ name: "kit", at: "kit/x.d.ts" }, { name: "@scope/pkg", at: "@scope/pkg/x.d.ts" }, { name: "bare", at: "bare/x.d.ts" }, null, null, null, null, null, null, null, null]);
  // The judged tree's own folder is never a package file, even where it lies inside a package.
  mkdirSync(join(packages, "kit/sub"));
  assert.deepEqual(ask(paths, [of("kit/sub", join(packages, "kit/sub"))]), [null]);
  // The checkout judging itself keeps its packages; a tree inside the checkout's node_modules is a tree, not a package.
  assert.deepEqual(ask(paths, [of("kit/x.d.ts", checkout), of("kit/x.d.ts", join(packages, "kit")), of("kit/x.d.ts", packages)]),
    [{ name: "kit", at: "kit/x.d.ts" }, null, null]);
}));

test("the outermost package decides, in the checkout and for a copy: a nested dependency is its parent's", () => layout(paths => {
  const { base, packages, product, tree } = paths;
  for (const at of [packages, join(product, "node_modules")]) {
    write(join(at, "kit"), { name: "kit", version: "1.0.0" });
    write(join(at, "kit/node_modules/inner"), { name: "inner", version: "2.0.0" });
    write(join(at, "inner"), { name: "inner", version: "2.0.0" });
  }
  // A product that itself lies in another node_modules: that outer folder is passed over.
  write(join(base, "outer/node_modules/app/node_modules/kit/node_modules/inner"), { name: "inner", version: "2.0.0" });
  write(join(base, "outer/node_modules/app/node_modules/kit"), { name: "kit", version: "1.0.0" });
  // A product whose kit nests another inner version: not the checkout's kit, even with the hoisted inner's text.
  write(join(base, "drift/node_modules/kit"), { name: "kit", version: "1.0.0" });
  write(join(base, "drift/node_modules/kit/node_modules/inner"), { name: "inner", version: "2.0.1" });
  const nested = { name: "kit", at: "kit/node_modules/inner/x.d.ts" };
  assert.deepEqual(ask(paths, [
    { file: join(packages, "kit/node_modules/inner/x.d.ts"), judged: tree },
    { file: join(product, "node_modules/kit/node_modules/inner/x.d.ts"), judged: tree },
    { file: join(base, "outer/node_modules/app/node_modules/kit/node_modules/inner/x.d.ts"), judged: tree },
    { file: join(product, "node_modules/inner/x.d.ts"), judged: tree },
    { file: join(base, "drift/node_modules/kit/node_modules/inner/x.d.ts"), judged: tree },
  ]), [nested, nested, nested, { name: "inner", at: "inner/x.d.ts" }, null]);
}));

test("a copy's own package.json names the package, the checkout's carries a version, and the checkout's copy lies in the checkout", () => layout(paths => {
  const { base, packages, tree } = paths;
  write(join(packages, "kit"), { name: "kit", version: "1.0.0" });
  write(join(packages, "bare"), { name: "bare" });
  write(join(base, "store/linked"), { name: "linked", version: "1.0.0" });
  symlinkSync(join(base, "store/linked"), join(packages, "linked"));
  write(join(base, "misnamed/node_modules/kit"), { name: "kat", version: "1.0.0" });
  write(join(base, "unversioned/node_modules/bare"), { name: "bare" });
  write(join(base, "without/node_modules/bare"), undefined);
  write(join(base, "copied/node_modules/linked"), { name: "linked", version: "1.0.0" });
  write(join(base, "same/node_modules/kit"), { name: "kit", version: "1.0.0" });
  const of = (file: string) => ({ file: join(base, file), judged: tree });
  assert.deepEqual(ask(paths, [of("misnamed/node_modules/kit/x.d.ts"), of("unversioned/node_modules/bare/x.d.ts"), of("without/node_modules/bare/x.d.ts"),
    of("copied/node_modules/linked/x.d.ts"), { file: join(packages, "linked/x.d.ts"), judged: tree }, of("same/node_modules/kit/x.d.ts")]),
  [null, null, null, null, null, { name: "kit", at: "kit/x.d.ts" }]);
}));

test("a copy is judged by the text the checker parsed, and by a trust that lives as long as one program", () => layout(paths => {
  const { base, packages, tree } = paths;
  write(join(packages, "kit"), { name: "kit", version: "1.0.0" });
  write(join(base, "copy/node_modules/kit"), { name: "kit", version: "1.0.0" });
  const file = join(base, "copy/node_modules/kit/x.d.ts"), kit = { name: "kit", at: "kit/x.d.ts" };
  // The file on disk is the checkout's; the text parsed from it was not (it changed between reading and judging).
  assert.deepEqual(ask(paths, [{ file, judged: tree }, { file, judged: tree, text: "export type X = any;\n" }]), [kit, null]);
  // A package.json changed after one program read it: the next program reads it again.
  const older = { path: join(base, "copy/node_modules/kit/package.json"), text: JSON.stringify({ name: "kit", version: "0.9.0" }) };
  assert.deepEqual(ask(paths, [{ file, judged: tree }, { file, judged: tree, edit: older, fresh: true }]), [kit, null]);
  // A byte order mark is not part of the text TypeScript parses.
  writeFileSync(join(base, "copy/node_modules/kit/x.d.ts"), declared);
  writeFileSync(join(packages, "kit/x.d.ts"), `﻿${declared}`);
  writeFileSync(older.path, JSON.stringify({ name: "kit", version: "1.0.0" }));
  assert.deepEqual(ask(paths, [{ file, judged: tree }]), [kit]);
  assert.equal(readFileSync(join(packages, "kit/x.d.ts"))[0], 0xef);
  // A UTF-16 checkout file is parsed as UTF-16: a copy holding its bytes read as UTF-8 is not its text.
  const wide = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(declared, "utf16le")]);
  writeFileSync(join(packages, "kit/x.d.ts"), wide);
  writeFileSync(join(base, "copy/node_modules/kit/x.d.ts"), wide.toString("utf8"));
  assert.deepEqual(ask(paths, [{ file, judged: tree }]), [null]);
}));
