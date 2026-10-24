// Rule D2. Law: a dispatcher composition is one if-chain over its node's kind; each branch mounts exactly one piece from
// the catalog index (or the entry a generated, typed table names), and only the node's own record may be spread onto it.
// Raises DISPATCHER_GRAMMAR. Every other attribute and the child content of a mounted tag, a table entry included, are
// rule E's (presentation.ts); a <style> block is rule G's.
import type { SyntaxNode } from "../../visual-boundary/walk.ts";
import { compositionFiles, describe, field, importViolations, isBlank, nodesOf, resolveTag, sourceOf, tagProblems, text,
  type CompositionFile } from "./composition-template.ts";
import type { ContentRule, GateContext } from "./context.ts";
import { violation, type Violation } from "./violation.ts";

const grammar = "DISPATCHER_GRAMMAR";
type KindTest = Readonly<{ subject: string; kinds: readonly string[] }>;

/** `a.b.c` of a plain member path, or undefined for anything computed. */
function pathOf(node: unknown): string | undefined {
  const type = field(node, "type");
  if (type === "Identifier") return text(node, "name");
  if (type !== "MemberExpression" || field(node, "computed") === true || field(node, "optional") === true) return undefined;
  const object = pathOf(field(node, "object")), property = pathOf(field(node, "property"));
  return object === undefined || property === undefined ? undefined : `${object}.${property}`;
}

/** `subject.kind === "x"`, or a `||` of such tests on one subject. */
function kindTest(test: unknown): KindTest | undefined {
  const type = field(test, "type"), operator = field(test, "operator");
  if (type === "LogicalExpression" && operator === "||") {
    const left = kindTest(field(test, "left")), right = kindTest(field(test, "right"));
    return left && right && left.subject === right.subject ? { subject: left.subject, kinds: [...left.kinds, ...right.kinds] } : undefined;
  }
  const left = pathOf(field(test, "left")), kind = field(field(test, "right"), "value");
  if (type !== "BinaryExpression" || operator !== "===" || !left?.endsWith(".kind") || typeof kind !== "string") return undefined;
  return { subject: left.slice(0, -".kind".length), kinds: [kind] };
}

/** A table is a lookup source only when it is a generated renderer-infrastructure module. */
function isGeneratedTable(context: GateContext, file: CompositionFile, local: string): boolean {
  const item = context.imports(file.path).find(candidate => candidate.form === "import" && candidate.bindings.some(binding => binding.local === local));
  const binding = item?.bindings.find(candidate => candidate.local === local);
  const defined = item && binding && binding.imported !== "*" ? context.definition(item, binding.imported) : undefined;
  const infrastructure = context.layout.fixed["renderer-infrastructure"] ?? [];
  return defined !== undefined && infrastructure.includes(defined) && (context.text(defined) ?? "").startsWith("// Generated");
}

/** The local a `{@const Local = table[kind]}` binds, when `table` is a generated table. */
function lookupOf(context: GateContext, file: CompositionFile, node: SyntaxNode): string | undefined {
  const declarators = field(field(node, "declaration"), "declarations");
  const declarator: unknown = Array.isArray(declarators) && declarators.length === 1 ? declarators[0] : undefined;
  const id = field(declarator, "id"), init = field(declarator, "init");
  if (field(id, "type") !== "Identifier" || field(init, "type") !== "MemberExpression") return undefined;
  const table = pathOf(field(init, "object"));
  return table !== undefined && !table.includes(".") && isGeneratedTable(context, file, table) ? text(id, "name") : undefined;
}

function dispatcherViolations(context: GateContext, file: CompositionFile): Violation[] {
  const found: Violation[] = [];
  const report = (node: unknown, what: string) => {
    const start = field(node, "start");
    found.push(violation(grammar, file.path, file.parsed.line(typeof start === "number" ? start : 0), `${what}; ${file.suffix}`));
  };
  let subject: string | undefined;
  const checkTag = (node: SyntaxNode, lookup: boolean) => {
    const name = text(node, "name"), resolution = lookup ? undefined : resolveTag(context, file, name);
    if (resolution?.kind === "part") report(node, `<${name}> is a part of ${file.id}, not a catalog piece`);
    if (resolution) for (const problem of tagProblems(file, name, resolution)) report(node, problem);
    const attributes = field(node, "attributes");
    for (const attribute of Array.isArray(attributes) ? attributes : []) {
      const spread = field(attribute, "type") === "SpreadAttribute" ? pathOf(field(attribute, "expression")) ?? "" : undefined;
      const own = spread !== undefined && subject !== undefined && (spread === subject || spread.startsWith(`${subject}.`));
      if (spread !== undefined && !own) report(attribute, `spread ${sourceOf(file.parsed, attribute)} onto <${name}>: only the node's typed record may be spread`);
    }
  };
  const checkBranch = (fragment: unknown, anchor: SyntaxNode) => {
    const lookups = new Set<string>();
    let mounted = 0;
    for (const node of nodesOf(fragment)) {
      if (isBlank(node)) continue;
      if (node.type === "ConstTag") {
        const local = lookupOf(context, file, node);
        if (local === undefined) report(node, `${sourceOf(file.parsed, node)} is not a lookup in a generated, typed table`);
        else lookups.add(local);
      } else if (node.type === "Component") {
        mounted += 1;
        checkTag(node, lookups.has(text(node, "name")));
      } else report(node, `${describe(file.parsed, node)} in a dispatch branch`);
    }
    if (mounted !== 1) report(anchor, `branch mounts ${mounted} pieces; each kind mounts exactly one`);
  };
  const checkChain = (chain: SyntaxNode) => {
    const seen = new Set<string>();
    let branch: SyntaxNode | undefined = chain;
    while (branch) {
      const test = kindTest(field(branch, "test"));
      if (test === undefined) report(branch, `branch test ${sourceOf(file.parsed, field(branch, "test"))} is not <node>.kind === "<kind>"`);
      else if (subject !== undefined && test.subject !== subject) report(branch, `branch tests ${test.subject}.kind, not ${subject}.kind`);
      else {
        subject = test.subject;
        for (const kind of test.kinds) if (seen.has(kind)) report(branch, `kind "${kind}" dispatched twice`); else seen.add(kind);
      }
      checkBranch(field(branch, "consequent"), branch);
      const alternate = field(branch, "alternate"), rest = nodesOf(alternate).filter(node => !isBlank(node)), [first] = rest;
      branch = rest.length === 1 && first?.type === "IfBlock" && field(first, "elseif") === true ? first : undefined;
      if (branch === undefined && first !== undefined) {
        report(first, "{:else} branch without a kind test");
        checkBranch(alternate, first);
      }
    }
  };
  const roots = nodesOf(file.parsed.fragment).filter(node => !isBlank(node)), chain = roots.find(node => node.type === "IfBlock");
  if (chain) checkChain(chain);
  else report(file.parsed.fragment, "the template is not an if-chain over the node kind");
  for (const node of roots) if (node !== chain) report(node, `${describe(file.parsed, node)} outside the kind chain`);
  return found;
}

export const ruleD2: ContentRule = context => compositionFiles(context, true)
  .flatMap(file => [...importViolations(context, file, grammar), ...dispatcherViolations(context, file)]);
