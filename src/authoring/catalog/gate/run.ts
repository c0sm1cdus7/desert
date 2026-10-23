// Entry of the Visual Catalog gate: read the visual roots of a tree from disk, then apply each rule in order.
// Raises VISUAL_SOURCE_SYMLINK before any rule, and the code of the first rule that fails.
import { lstat, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { declarationSuffixes, type CatalogLayout } from "../layout.ts";
import { readDeclarations } from "../read-declaration.ts";
import { assertDeclaredSources, type LocatedDeclaration } from "./inventory.ts";
import { assertDeclarationsConsistent } from "./declarations.ts";

export type CatalogRule = "A" | "B";
export type CatalogTree = Readonly<{ paths: readonly string[]; declarations: readonly LocatedDeclaration[] }>;

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

export async function readCatalogTree(root: string, layout: CatalogLayout): Promise<CatalogTree> {
  const paths: string[] = [];
  for (const folder of layout.roots) await walk(root, relative(root, join(root, folder)).split("\\").join("/"), paths);
  const declarations: LocatedDeclaration[] = [];
  for (const path of paths) if (declarationSuffixes.some(suffix => path.endsWith(suffix))) {
    for (const declaration of readDeclarations(path, await readFile(join(root, path), "utf8"))) declarations.push({ path, declaration });
  }
  return Object.freeze({ paths: Object.freeze(paths), declarations: Object.freeze(declarations) });
}

export async function runCatalogGate(root: string, options: Readonly<{ layout: CatalogLayout; rules: readonly CatalogRule[] }>) {
  const tree = await readCatalogTree(root, options.layout);
  const rules: Record<CatalogRule, () => void> = {
    A: () => assertDeclaredSources(tree.paths, tree.declarations, options.layout),
    B: () => assertDeclarationsConsistent(tree.declarations, new Set(tree.paths), options.layout),
  };
  for (const rule of options.rules) rules[rule]();
  return tree;
}
