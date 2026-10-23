import { lstat, readFile } from "node:fs/promises";
import { posix, resolve, relative } from "node:path";
import { parse } from "svelte/compiler";
import ts from "typescript";
import { sealedAdapterPaths } from "./adapter.ts";
import { requestPath, isPrivateVisualRequest } from "./source-request.ts";
import { assertRuntimeGlobals } from "./runtime-globals.ts";
import { inspectScript } from "./script.ts";
import { readInterpreterSources, type NonvisualSource } from "./interpreter-sources.ts";
import { nonvisualGlobals, nonvisualPackages, browserSessionPath,
  assertBrowserSessionCapability, assertNonvisualFrameworkImport } from "./nonvisual-capabilities.ts";

const gateway = "src/svelte/adapter-catalog.ts";

/** Check the complete interpreter and every runtime helper/barrel reachable
 * from it or a sealed adapter. The catalog gateway ends adapter traversal,
 * never interpreter coverage. Catalog ownership is checked separately. */
export async function assertNonvisualDependencies(root: string, adapters: readonly NonvisualSource[]): Promise<readonly string[]> {
  const seen = new Set<string>();
  async function inspect(path: string, source: string, adapter: boolean): Promise<void> {
    if (seen.has(path)) return;
    seen.add(path);
    const fail = (reason: string): never => { throw new Error(`NONVISUAL_DEPENDENCY: ${path}: ${reason}`); };
    const code = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true,
    } }).outputText;
    const file = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    if (!adapter) {
      const allowed = path === browserSessionPath
        ? new Set([...nonvisualGlobals, "window", "history", "location"]) : nonvisualGlobals;
      const runtime = assertRuntimeGlobals(code, allowed, name => fail(`visual runtime global: ${name}`));
      if (path === browserSessionPath) assertBrowserSessionCapability(runtime.file, runtime.checker, fail);
      for (const item of inspectScript(path, code, code, 0, "data").findings) {
        if (item.code === "RENDERER_DOM_ACCESS") fail(item.operation);
      }
    }
    const requests: string[] = [];
    function visit(node: ts.Node): void {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        const specifier = node.moduleSpecifier;
        if (!ts.isStringLiteral(specifier) || node.attributes) return fail("opaque import");
        if (specifier.text === "svelte") assertNonvisualFrameworkImport(node, fail);
        requests.push(specifier.text);
      }
      if (ts.isImportEqualsDeclaration(node) || ts.isCallExpression(node)
        && (node.expression.kind === ts.SyntaxKind.ImportKeyword
          || ts.isIdentifier(node.expression) && ["require", "eval", "Function"].includes(node.expression.text))) fail("opaque execution/import");
      ts.forEachChild(node, visit);
    }
    visit(file);
    for (const request of requests) {
      const canonical = requestPath(request);
      if (isPrivateVisualRequest(request)) fail(`visual import: ${request}`);
      const target = canonical.startsWith(".") ? posix.normalize(posix.join(posix.dirname(path), canonical))
        : canonical.startsWith("@desert/") ? `src/${canonical.slice(8)}` : undefined;
      if (!target) {
        if (request !== canonical || !nonvisualPackages.has(request)) fail(`unregistered package: ${request}`);
        continue;
      }
      if (target === gateway && adapter && request === canonical) continue;
      if (request !== canonical || !target.startsWith("src/") || !/\.(ts|[cm]?js)$/.test(target)
        || target === gateway || /^src\/svelte\/catalog\/(?:foundations|compositions|mechanisms)\//.test(target) || target.includes("/vendor/")) fail(`visual or opaque dependency: ${request}`);
      const absolute = resolve(root, target);
      if (relative(root, absolute).startsWith("..")) fail("dependency outside SDK");
      try {
        // Reject symlinked ancestors as well as the file; a package cannot launder
        // an outside implementation through a directory link.
        const parts = target.split("/");
        for (let index = 1; index <= parts.length; index++) {
          if ((await lstat(resolve(root, ...parts.slice(0, index)))).isSymbolicLink()) fail(`symlinked dependency: ${target}`);
        }
        await inspect(target, await readFile(absolute, "utf8"), false);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("NONVISUAL_DEPENDENCY:")) throw error;
        fail(`unresolved dependency: ${target}`);
      }
    }
  }
  for (const item of await readInterpreterSources(root)) await inspect(item.path, item.source, false);
  for (const item of adapters) if ((sealedAdapterPaths as readonly string[]).includes(item.path)) {
    const tree = parse(item.source, { modern: true });
    const scripts = [tree.instance, tree.module].flatMap(block => {
      const body = block?.content as { start: number; end: number } | undefined;
      return body ? [item.source.slice(body.start, body.end)] : [];
    });
    await inspect(item.path, scripts.join("\n"), true);
  }
  return Object.freeze([...seen].sort());
}
