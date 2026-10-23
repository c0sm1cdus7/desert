// Entry of the Visual Catalog gate: read the visual roots of a tree from disk, then apply each rule in order.
// Raises VISUAL_SOURCE_SYMLINK before any rule, and the code of the first rule that fails. Rule P runs before this
// module is loaded (gate/sources.ts), so a deleted rule module is reported, not a crash.
import { lstat, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { declarationSuffixes, type CatalogLayout } from "../layout.ts";
import { readDeclarations } from "../read-declaration.ts";
import { assertDeclaredSources, type LocatedDeclaration } from "./inventory.ts";
import { assertDeclarationsConsistent } from "./declarations.ts";
import { assertCatalogDerivations } from "./derivation.ts";
import { assertLedgerStructure } from "./ledger.ts";

export type CatalogRule = "A" | "B" | "C" | "L";
export type CatalogTree = Readonly<{ paths: readonly string[]; declarations: readonly LocatedDeclaration[];
  generated: ReadonlyMap<string, string>; ledger: unknown }>;

async function walk(root: string, folder: string, paths: string[]): Promise<void> {
  let entries: string[];
  try { entries = (await readdir(join(root, folder))).sort(); }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return; throw error; }
  for (const entry of entries) {
    const path = `${folder}/${entry}`, stat = await lstat(join(root, path));
    if (stat.isSymbolicLink()) throw new Error(`VISUAL_SOURCE_SYMLINK: ${path}`);
    if (stat.isDirectory()) await walk(root, path, paths);
    else if (stat.isFile()) paths.push(path);
    else throw new Error(`UNDECLARED_VISUAL_SOURCE: ${path} is not a regular file`);
  }
}

function parseLedger(path: string, text: string): unknown {
  try { return JSON.parse(text); } catch { throw new Error(`APPROVALS_LEDGER: ${path} is not JSON`); }
}

export async function readCatalogTree(root: string, layout: CatalogLayout): Promise<CatalogTree> {
  const paths: string[] = [];
  for (const folder of layout.roots) await walk(root, relative(root, join(root, folder)).split("\\").join("/"), paths);
  const declarations: LocatedDeclaration[] = [];
  for (const path of paths) if (declarationSuffixes.some(suffix => path.endsWith(suffix))) {
    for (const declaration of readDeclarations(path, await readFile(join(root, path), "utf8"))) declarations.push({ path, declaration });
  }
  const generated = new Map<string, string>();
  for (const path of Object.values(layout.generated)) if (paths.includes(path)) generated.set(path, await readFile(join(root, path), "utf8"));
  const ledger: unknown = paths.includes(layout.ledger) ? parseLedger(layout.ledger, await readFile(join(root, layout.ledger), "utf8")) : undefined;
  return Object.freeze({ paths: Object.freeze(paths), declarations: Object.freeze(declarations), generated, ledger });
}

export async function runCatalogGate(root: string, options: Readonly<{ layout: CatalogLayout; rules: readonly CatalogRule[] }>) {
  const tree = await readCatalogTree(root, options.layout);
  const rules: Record<CatalogRule, () => void> = {
    A: () => assertDeclaredSources(tree.paths, tree.declarations, options.layout),
    B: () => assertDeclarationsConsistent(tree.declarations, new Set(tree.paths), options.layout),
    C: () => assertCatalogDerivations(tree.declarations, tree.generated, options.layout),
    L: () => assertLedgerStructure(tree.ledger, tree.declarations),
  };
  for (const rule of options.rules) rules[rule]();
  return tree;
}
