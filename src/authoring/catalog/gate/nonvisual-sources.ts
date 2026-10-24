// Reads the code rule N judges: every file under the layout's nonvisual roots (the interpreter, dormant helpers included),
// and every module outside the visual roots that it, or any visual-root file, reaches through imports, transitively.
// This module only reads and resolves; nonvisual.ts decides what is allowed. Visual-root files are rule I's and are
// never read here; an edge into the visual roots is recorded for rule N to judge.
import { existsSync } from "node:fs";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import ts from "typescript";
import type { CatalogLayout } from "../layout.ts";
import { parseable, type GateContext } from "./context.ts";
import { resolveSpecifier, type Target } from "./resolve-imports.ts";

/** One runtime module request of a nonvisual file (type-only imports are erased). `opaque`: not a plain static import. */
export type NonvisualEdge = Readonly<{ specifier: string; target: Target; opaque: boolean; framework: readonly string[] | undefined; node: ts.Node }>;
export type NonvisualFile = Readonly<{ path: string; source: string; file: ts.SourceFile; edges: readonly NonvisualEdge[] }>;
/** What could not be read as a nonvisual source, with the file it concerns. */
export type NonvisualProblem = Readonly<{ path: string; what: string }>;
export type NonvisualSources = Readonly<{ files: readonly NonvisualFile[]; problems: readonly NonvisualProblem[] }>;

const scriptExtension = /\.(ts|js|mjs|cjs)$/;
const inside = (path: string, folder: string) => path === folder || path.startsWith(`${folder}/`);

/** The names a framework import binds (`import { onMount } from "svelte"`), or undefined for any other shape. */
function namedBindings(node: ts.ImportDeclaration | ts.ExportDeclaration): readonly string[] | undefined {
  if (!ts.isImportDeclaration(node)) return undefined;
  const clause = node.importClause, named = clause?.namedBindings;
  if (!clause || clause.name || !named || !ts.isNamedImports(named)) return undefined;
  return named.elements.map(element => (element.propertyName ?? element.name).text);
}

/** A declaration TypeScript erases: `import type`, `export type`, or named imports that are all `type`. */
function isTypeOnly(node: ts.ImportDeclaration | ts.ExportDeclaration): boolean {
  if (ts.isExportDeclaration(node)) return node.isTypeOnly;
  const clause = node.importClause, named = clause?.namedBindings;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  return !clause.name && named !== undefined && ts.isNamedImports(named) && named.elements.length > 0 && named.elements.every(element => element.isTypeOnly);
}

/** Every runtime module request: static imports and re-exports, and the opaque forms (import(), require, import =). */
export function edgesOf(file: ts.SourceFile, layout: CatalogLayout, exists: (path: string) => boolean): NonvisualEdge[] {
  const path = file.fileName, edges: NonvisualEdge[] = [];
  const add = (specifier: string, node: ts.Node, opaque: boolean, framework?: readonly string[]) =>
    edges.push({ specifier, target: resolveSpecifier(path, specifier, exists, layout.aliases), opaque, framework, node });
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && !isTypeOnly(node)) {
      const specifier = node.moduleSpecifier;
      if (ts.isStringLiteral(specifier)) add(specifier.text, node, node.attributes !== undefined, namedBindings(node));
      else add("", node, true);
    }
    if (ts.isImportEqualsDeclaration(node)) add("", node, true);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
      || ts.isIdentifier(node.expression) && node.expression.text === "require")) {
      const [first] = node.arguments;
      add(first && ts.isStringLiteral(first) ? first.text : "", node, true);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return edges;
}

export async function readNonvisualSources(root: string, context: GateContext): Promise<NonvisualSources> {
  const layout = context.layout, problems: NonvisualProblem[] = [], files: NonvisualFile[] = [];
  const exists = (path: string) => existsSync(join(root, path));
  const visual = (path: string) => layout.roots.some(folder => inside(path, folder));
  const queued = new Set<string>(), queue: string[] = [];
  const enqueue = (path: string) => { if (!queued.has(path)) { queued.add(path); queue.push(path); } };

  /** A symlinked ancestor could launder an outside implementation, so each ancestor of a read path is checked. */
  async function symlinked(path: string): Promise<boolean> {
    const parts = path.split("/");
    for (let index = 1; index <= parts.length; index++) if ((await lstat(join(root, ...parts.slice(0, index)))).isSymbolicLink()) return true;
    return false;
  }
  async function walkRoot(folder: string): Promise<void> {
    for (const entry of (await readdir(join(root, folder))).sort()) {
      const path = posix.join(folder, entry), stat = await lstat(join(root, path));
      if (stat.isSymbolicLink()) problems.push({ path, what: "symlinked interpreter source" });
      else if (stat.isDirectory()) await walkRoot(path);
      else if (!stat.isFile() || !scriptExtension.test(path)) problems.push({ path, what: "unregistered interpreter source: only .ts and .js modules" });
      else enqueue(path);
    }
  }
  for (const folder of layout.nonvisual.roots) {
    if (!exists(folder) || await symlinked(folder) || !(await lstat(join(root, folder))).isDirectory()) {
      problems.push({ path: folder, what: "the interpreter root is missing, symlinked or not a directory" });
    } else await walkRoot(folder);
  }
  // Every value import of the page's visual-root code that leaves the visual roots (the test-only project is rule I's).
  // Not the page's: build-host modules other than the template's components (they run in Node at build time), and a
  // piece's companions (declaration, contract, specimens), which the gate reads as data.
  const page = (path: string) => {
    const owner = context.owners.of(path);
    const buildTime = !path.endsWith(".svelte") && (layout.fixed["build-host"] ?? []).includes(path);
    return parseable(path) && !buildTime && !(owner?.kind === "piece" && owner.role === "companion") && context.text(path) !== undefined;
  };
  for (const path of context.paths) if (page(path)) for (const item of context.imports(path)) {
    if (item.typeOnly || !item.specifier) continue;
    const target = resolveSpecifier(path, item.specifier, exists, layout.aliases);
    if (target.kind === "file" && !visual(target.path) && !inside(target.path, layout.testing)) enqueue(target.path);
  }
  while (queue.length) {
    const path = queue.shift() ?? "";
    if (await symlinked(path)) { problems.push({ path, what: "symlinked dependency" }); continue; }
    const source = await readFile(join(root, path), "utf8");
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    const edges = edgesOf(file, layout, exists);
    files.push({ path, source, file, edges });
    for (const edge of edges) {
      const target = edge.target;
      if (target.kind === "file" && !visual(target.path) && scriptExtension.test(target.path)) enqueue(target.path);
    }
  }
  return Object.freeze({ files: Object.freeze(files), problems: Object.freeze(problems) });
}
