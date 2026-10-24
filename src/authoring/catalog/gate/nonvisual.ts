// Rule N. Law: the interpreter and every module outside the visual roots that the page reaches stay nonvisual. They name
// no browser global but timers, timing and network (the session module alone also guards leaving the page); obtain no
// evaluator; perform no DOM operation; import only nonvisual packages, Svelte's lifecycle and context functions, and nonvisual tree
// modules (infra and renderer infrastructure inside the visual roots); and every import is a plain, resolvable request.
// Raises NONVISUAL_DEPENDENCY. The files are read by nonvisual-sources.ts.
import { isCSSRequest } from "vite";
import ts from "typescript";
import type { ContentRule, GateContext } from "./context.ts";
import { browserHostGlobals, browserHostProblems } from "./browser-host.ts";
import { domOperations } from "./dom-access.ts";
import type { NonvisualEdge, NonvisualFile } from "./nonvisual-sources.ts";
import { browserGlobals, browserGlobalUses, nonvisualFramework, nonvisualGlobals, nonvisualPackages, opaqueExecution, runtimeCode } from "./runtime-globals.ts";
import { violation, type Violation } from "./violation.ts";

const code = "NONVISUAL_DEPENDENCY";
const inside = (path: string, folder: string) => path.startsWith(`${folder}/`);

/** Why a module request is not nonvisual, or undefined when it is. */
function edgeProblem(context: GateContext, edge: NonvisualEdge): string | undefined {
  const { specifier, target } = edge;
  if (edge.opaque) return `opaque execution or import${specifier ? ` of "${specifier}"` : ""}: only plain static imports`;
  if (/[?#]/.test(specifier)) return `"${specifier}" carries a query or fragment: a bundler transform is not a nonvisual module`;
  if (isCSSRequest(specifier)) return `visual import "${specifier}": a stylesheet`;
  if (target.kind === "package") {
    if (!nonvisualPackages.has(target.name)) return `unregistered package "${target.name}"`;
    if (target.name !== "svelte") return undefined;
    const names = edge.framework;
    if (names === undefined) return `opaque framework capability: import Svelte's lifecycle functions by name`;
    const visual = names.filter(name => !nonvisualFramework.has(name));
    return visual.length ? `visual framework capability ${visual.join(", ")}: only ${[...nonvisualFramework].join(", ")}` : undefined;
  }
  if (target.kind !== "file") return `unresolved dependency "${specifier}"`;
  const path = target.path;
  if (!/\.(ts|js|mjs|cjs)$/.test(path)) return `visual or opaque dependency ${path}: only script modules`;
  if (!context.layout.roots.some(folder => inside(path, folder))) return undefined;
  const owner = context.owners.of(path);
  const nonvisual = owner?.kind === "infra" || owner?.kind === "fixed" && owner.category === "renderer-infrastructure";
  return nonvisual ? undefined : `visual dependency ${path}: inside the visual roots only infra and renderer infrastructure are nonvisual`;
}

function fileViolations(context: GateContext, file: NonvisualFile): Violation[] {
  const found: Violation[] = [], session = file.path === context.layout.nonvisual.browserSession;
  const at = (node: ts.Node, sourceFile: ts.SourceFile) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const report = (line: number, what: string) => found.push(violation(code, file.path, line, what));
  const runtime = runtimeCode(file.source);
  const allowed = session ? new Set([...nonvisualGlobals, ...browserHostGlobals]) : nonvisualGlobals;
  for (const use of browserGlobalUses(runtime, allowed)) report(at(use.node, runtime.file), `visual runtime global: ${use.name}`);
  for (const use of opaqueExecution(runtime)) report(at(use.node, runtime.file), `opaque execution: ${use.name}`);
  if (session) for (const use of browserHostProblems(runtime)) report(at(use.node, runtime.file), `browser host capability: ${use.name}`);
  // An operation on a browser global (`document.body`) is already that global's report.
  for (const { node, operation } of domOperations(file.file)) {
    if (!browserGlobals.has(operation.split(".")[0] ?? "")) report(at(node, file.file), `DOM operation ${operation}`);
  }
  for (const edge of file.edges) {
    const problem = edgeProblem(context, edge);
    if (problem !== undefined) report(at(edge.node, file.file), problem);
  }
  return found;
}

export const ruleN: ContentRule = context => [
  ...context.nonvisual.problems.map(problem => violation(code, problem.path, 0, problem.what)),
  ...context.nonvisual.files.flatMap(file => fileViolations(context, file)),
];
