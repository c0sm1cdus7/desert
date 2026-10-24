// Rule O. Law: page code in the visual roots runs and renders only what the gate can read. No `{@html}` (outside a
// composition, where rule D already reports it as drawing), no evaluator (`eval`, `Function`, a function's constructor,
// `__proto__`, `Reflect` but `Reflect.ownKeys`, a timer given code as a string), no `require`, and no `import()` whose
// module is computed or that a template expression runs. Raises OPAQUE_SOURCE. Build-host modules run in Node at build
// time; rule T fixes their grammar.
import ts from "typescript";
import { parseable, type ContentRule, type GateContext } from "./context.ts";
import { templateScripts } from "./dom-access.ts";
import { opaqueExecution, runtimeCode } from "./runtime-globals.ts";
import { violation, type Violation } from "./violation.ts";
import { walk } from "./walk.ts";

const code = "OPAQUE_SOURCE";

const isPageCode = (context: GateContext, path: string) =>
  parseable(path) && context.text(path) !== undefined && (path.endsWith(".svelte") || !(context.layout.fixed["build-host"] ?? []).includes(path));

/** `require(...)` anywhere, and an `import()` that is computed, or any `import()` when `template` (a template expression). */
function opaqueImports(root: ts.Node, template: boolean): readonly Readonly<{ node: ts.Node; what: string }>[] {
  const found: { node: ts.Node; what: string }[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const [first] = node.arguments, literal = first !== undefined && ts.isStringLiteral(first);
      if (ts.isIdentifier(node.expression) && node.expression.text === "require") found.push({ node, what: "require(): only static imports" });
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && (!literal || template)) {
        found.push({ node, what: template ? "import() in a template expression" : "import() of a computed module" });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

type Finding = Readonly<{ start: number; what: string }>;
/** Findings of one script text, by text: the same text always reads the same, so a file read again is not re-checked. */
const byText = new Map<string, readonly Finding[]>();
function scriptFindings(file: ts.SourceFile, template: boolean): readonly Finding[] {
  const key = `${template ? "t" : "s"}\u0000${file.text}`, known = byText.get(key);
  if (known) return known;
  const runtime = runtimeCode(file.text);
  const found = [...opaqueExecution(runtime).map(use => ({ start: use.node.getStart(runtime.file), what: `${use.name}: an evaluator runs code the gate cannot read` })),
    ...opaqueImports(file, template).map(item => ({ start: item.node.getStart(file), what: item.what }))];
  byText.set(key, found);
  return found;
}

function fileViolations(context: GateContext, path: string): Violation[] {
  const parsed = context.parsed(path), found: Violation[] = [], owner = context.owners.of(path);
  const scripts = [...parsed.scripts.map(script => ({ script, template: false })),
    ...templateScripts(parsed, path).map(script => ({ script, template: true }))];
  for (const { script, template } of scripts) for (const item of scriptFindings(script.file, template)) {
    found.push(violation(code, path, parsed.line(script.offset + item.start), item.what));
  }
  const composition = owner?.kind === "piece" && owner.pieceKind === "composition";
  if (parsed.kind === "svelte" && !composition) walk(parsed.fragment, node => {
    if (node.type === "HtmlTag") found.push(violation(code, path, parsed.line(node.start ?? 0), "{@html} renders markup the gate cannot read"));
  });
  return found;
}

export const ruleO: ContentRule = context => context.paths.filter(path => isPageCode(context, path)).flatMap(path => fileViolations(context, path));
