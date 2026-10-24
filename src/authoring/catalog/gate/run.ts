// Entry of the Visual Catalog gate: read the visual roots of a tree from disk, then apply each rule in order.
// Raises VISUAL_SOURCE_SYMLINK before any rule, and the code of the first rule that fails. Rule P runs before this
// module is loaded (gate/sources.ts), so a deleted rule module is reported, not a crash.
import { lstat, readdir, readFile } from "node:fs/promises";
import { join, posix, relative } from "node:path";
import { declarationSuffixes, type CatalogLayout } from "../layout.ts";
import { readDeclarations } from "../read-declaration.ts";
import { contractPath, readContract, type ReadContract } from "../read-contract.ts";
import { assertDeclaredSources, type LocatedDeclaration } from "./inventory.ts";
import { assertDeclarationsConsistent } from "./declarations.ts";
import { assertCatalogDerivations } from "./derivation.ts";
import { assertLedgerStructure } from "./ledger.ts";
import { contentRules, type ContentRuleId } from "./content-rules.ts";
import { createContext } from "./context.ts";
import { CatalogGateViolations, type Violation } from "./violation.ts";

export type CatalogRule = "A" | "B" | "C" | "L";
export type CatalogTree = Readonly<{ paths: readonly string[]; declarations: readonly LocatedDeclaration[];
  /** Each piece's contract, read as data (absent when the piece has no contract file). */
  contracts: ReadonlyMap<string, ReadContract>;
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
  const contracts = new Map<string, ReadContract>();
  for (const { path, declaration } of declarations) if (declaration.kind !== "mechanism") {
    const contract = contractPath(path, declaration.id);
    if (paths.includes(contract)) contracts.set(declaration.id, readContract(contract, await readFile(join(root, contract), "utf8"), layout));
  }
  const generated = new Map<string, string>();
  for (const path of Object.values(layout.generated)) if (paths.includes(path)) generated.set(path, await readFile(join(root, path), "utf8"));
  const ledger: unknown = paths.includes(layout.ledger) ? parseLedger(layout.ledger, await readFile(join(root, layout.ledger), "utf8")) : undefined;
  return Object.freeze({ paths: Object.freeze(paths), declarations: Object.freeze(declarations), contracts, generated, ledger });
}

export async function runCatalogGate(root: string, options: Readonly<{ layout: CatalogLayout; rules: readonly CatalogRule[] }>) {
  const tree = await readCatalogTree(root, options.layout);
  const rules: Record<CatalogRule, () => void> = {
    A: () => assertDeclaredSources(tree.paths, tree.declarations, options.layout),
    B: () => assertDeclarationsConsistent(tree.declarations, new Set(tree.paths), options.layout),
    C: () => assertCatalogDerivations(tree, options.layout),
    L: () => assertLedgerStructure(tree.ledger, tree.declarations),
  };
  for (const rule of options.rules) rules[rule]();
  return tree;
}

const textual = /\.(svelte|ts|js|mjs|cjs|css|html|json|md|txt)$/;

/** Content rules D–T over a tree that passed the structural rules: every violation, then one failure listing them all. */
export async function runContentRules(root: string, tree: CatalogTree, options: Readonly<{ layout: CatalogLayout; rules: readonly ContentRuleId[] }>) {
  const { context, violations } = await contentViolations(root, tree, options);
  if (violations.length) throw new CatalogGateViolations(violations);
  return context;
}

/** The violations of the content rules without failing, for an entry that joins them with other findings. */
export async function contentViolations(root: string, tree: CatalogTree, options: Readonly<{ layout: CatalogLayout; rules: readonly ContentRuleId[] }>) {
  const sources = new Map<string, string>();
  // Text files by extension, plus extensionless ones (vendor LICENSE): Tailwind scans their prose too, so G2 must see it.
  const loadable = (path: string) => textual.test(path) || !posix.basename(path).includes(".");
  for (const path of [...tree.paths, ...options.layout.gate.reads]) if (loadable(path)) sources.set(path, await readFile(join(root, path), "utf8"));
  const context = createContext({ layout: options.layout, paths: tree.paths, declarations: tree.declarations, ledger: tree.ledger, sources });
  const violations: Violation[] = [];
  for (const rule of options.rules) violations.push(...contentRules[rule](context));
  return { context, violations: Object.freeze(violations) };
}
