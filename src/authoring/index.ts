import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { checkDeclarations } from "./syntax.ts";
import { checkImport, viewImportProvenance } from "./imports.ts";
import { assertNoLiteralText, assertProductMessageKeys, isProductBundle, productKeysModule } from "./messages.ts";
import { bundleLocale } from "../messages/generate.ts";

/** Build-time declaration boundary, not an isolation sandbox for malicious TypeScript. */
export async function assertProductSource(directory: string): Promise<{ files: readonly string[] }> {
  if ((await lstat(directory)).isSymbolicLink()) throw new Error("PRODUCT_SYMLINK_NOT_ALLOWED");
  const root = await realpath(directory);
  const sources = new Map<string, string>();
  const bundles = new Map<string, string>();
  async function collect(folder: string): Promise<void> {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, item.name);
      if (item.isSymbolicLink()) throw new Error(`PRODUCT_SYMLINK_NOT_ALLOWED: ${relative(root, path)}`);
      if (item.isDirectory()) await collect(path);
      else {
        if (item.isFile() && isProductBundle(root, path)) { bundles.set(bundleLocale(item.name) ?? "", await readFile(path, "utf8")); continue; }
        if (!item.isFile() || !item.name.endsWith(".ts")) {
          throw new Error(`PRODUCT_FILE_NOT_ALLOWED: ${relative(root, path)}`);
        }
        sources.set(path, await readFile(path, "utf8"));
      }
    }
  }
  await collect(root);
  if (sources.size === 0) throw new Error("EMPTY_PRODUCT_SOURCE");
  assertProductMessageKeys(bundles, sources.get(join(root, productKeysModule)));
  const edges = new Map<string, { target: string; declaration: ts.ImportDeclaration | ts.ExportDeclaration }[]>();
  const files = new Map<string, ts.SourceFile>();
  let roots = 0;
  for (const [path, text] of sources) {
    const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    files.set(path, file);
    const targets: { target: string; declaration: ts.ImportDeclaration | ts.ExportDeclaration }[] = [];
    roots += checkDeclarations(file, (specifier, declaration) => {
      const target = checkImport(root, path, specifier);
      if (target) {
        if (!sources.has(target)) throw new Error(`PRODUCT_IMPORT_MISSING: ${specifier} in ${relative(root, path)}`);
        if (ts.isImportDeclaration(declaration) || ts.isExportDeclaration(declaration)) targets.push({ target, declaration });
      }
    });
    edges.set(path, targets);
  }
  // A declaration that is otherwise legal still writes no sentence (plan §14).
  for (const file of files.values()) assertNoLiteralText(root, file);
  const active = new Set<string>();
  const checked = new Set<string>();
  function visit(path: string) {
    if (active.has(path)) throw new Error(`PRODUCT_IMPORT_CYCLE: ${relative(root, path)}`);
    if (checked.has(path)) return;
    active.add(path);
    for (const { target } of edges.get(path) ?? []) visit(target);
    active.delete(path); checked.add(path);
  }
  for (const path of sources.keys()) visit(path);
  const viewOnly = viewImportProvenance(files);
  function viewDependencies(path: string, visited = new Set<string>()) {
    if (visited.has(path)) return;
    visited.add(path);
    for (const { target, declaration } of edges.get(path) ?? []) {
      if (viewOnly(path, declaration)) continue;
      if (target.endsWith(".journey.ts") || target.endsWith(".module.ts")) throw new Error("VIEW_ACTIVITY_IMPORT");
      viewDependencies(target, visited);
    }
  }
  for (const path of sources.keys()) if (path.endsWith(".view.ts")) viewDependencies(path);
  if (roots !== 1 || [...sources.keys()].filter(path => path.endsWith(".product.ts")).length !== 1) {
    throw new Error("SINGLE_PRODUCT_ROOT_REQUIRED");
  }
  return Object.freeze({ files: Object.freeze([...sources.keys()].map(path => relative(resolve(root), path)).sort()) });
}
