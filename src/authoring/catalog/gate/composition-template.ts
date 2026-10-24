// Rule D. Law: a composition draws nothing itself; its template mounts declared pieces imported from the generated
// catalog index and listed in `uses`, and renders only declared slots. Rule D2 (dispatchers) is composition-dispatch.ts.
// Raises COMPOSITION_NATIVE_ELEMENT, COMPOSITION_UNKNOWN_PIECE, SLOT_NOT_TYPED.
import { posix } from "node:path";
import type { SyntaxNode } from "../../visual-boundary/walk.ts";
import type { ContentRule, GateContext } from "./context.ts";
import type { ParsedSvelte } from "./parse.ts";
import { violation, type Violation } from "./violation.ts";


const nativeElement = "COMPOSITION_NATIVE_ELEMENT", unknownPiece = "COMPOSITION_UNKNOWN_PIECE", slotNotTyped = "SLOT_NOT_TYPED";
const blocks = new Set(["IfBlock", "EachBlock", "KeyBlock", "AwaitBlock"]);
const tags: Readonly<Record<string, string>> = { IfBlock: "{#if}", EachBlock: "{#each}", KeyBlock: "{#key}", AwaitBlock: "{#await}",
  SnippetBlock: "{#snippet}", RenderTag: "{@render}", ConstTag: "{@const}", HtmlTag: "{@html}", DebugTag: "{@debug}" };

/** A `.svelte` entry or part of a composition, with what its declaration lets it mount and render. */
export type CompositionFile = Readonly<{ path: string; id: string; parsed: ParsedSvelte; uses: ReadonlySet<string>;
  slots: ReadonlySet<string>; suffix: string }>;
/** What a component tag names: a declared piece, one of the composition's own files, or nothing the catalog declares. */
export type Resolution = Readonly<{ kind: "piece"; id: string; entry: string; fromIndex: boolean; namespace: boolean }
  | { kind: "part" } | { kind: "unknown"; reason: string }>;

export const field = (node: unknown, key: string): unknown => node && typeof node === "object" ? Reflect.get(node, key) : undefined;
export const text = (node: unknown, key: string) => { const value = field(node, key); return typeof value === "string" ? value : ""; };
const isNode = (value: unknown): value is SyntaxNode => typeof value === "object" && value !== null && !Array.isArray(value);
/** The child nodes of a template fragment. */
export function nodesOf(fragment: unknown): SyntaxNode[] {
  const value = field(fragment, "nodes");
  return Array.isArray(value) ? value.filter(isNode) : [];
}
const childFragments = (node: SyntaxNode) => Object.values(node).filter(value => isNode(value) && value.type === "Fragment");
/** A comment, or text made only of spaces, tabs and line breaks (an entity such as `&nbsp;` is visible text). */
export const isBlank = (node: SyntaxNode) => node.type === "Comment" || node.type === "Text" && /^[ \t\r\n]*$/.test(text(node, "raw"));
export const sourceOf = (parsed: ParsedSvelte, node: unknown) => {
  const start = field(node, "start"), end = field(node, "end");
  const value = typeof start === "number" && typeof end === "number" ? parsed.source.slice(start, end).replace(/\s+/g, " ").trim() : "";
  return value.length > 60 ? `${value.slice(0, 59)}…` : value;
};
/** How a template node reads in a message: `<div>`, `text "x"`, `{@html}`. */
export function describe(parsed: ParsedSvelte, node: SyntaxNode): string {
  if (node.type === "Text") return `text "${sourceOf(parsed, node)}"`;
  if (node.type === "ExpressionTag") return `text ${sourceOf(parsed, node)}`;
  const name = text(node, "name");
  return name ? `<${name}>` : tags[node.type ?? ""] ?? `{${node.type ?? "node"}}`;
}

/** Entries and parts of the compositions with (`dispatch`) or without a dispatcher grammar. */
export function compositionFiles(context: GateContext, dispatch: boolean): CompositionFile[] {
  const files: CompositionFile[] = [];
  for (const path of context.paths) {
    const owner = path.endsWith(".svelte") ? context.owners.of(path) : undefined;
    if (owner?.kind !== "piece" || owner.pieceKind !== "composition" || owner.role === "companion" || owner.dispatch !== dispatch) continue;
    const declaration = context.owners.declaration(owner.id)?.declaration, parsed = context.parsed(path);
    if (declaration?.kind !== "composition" || parsed.kind !== "svelte") continue;
    files.push({ path, id: owner.id, parsed, uses: new Set(declaration.uses), slots: new Set(Object.keys(declaration.slots ?? {})),
      suffix: `${dispatch ? "dispatcher" : "composition"}: ${owner.id}` });
  }
  return files;
}

/** The piece a tag (`Field`, `F`, `Catalog.Field`) mounts, through aliases, namespaces and barrels. */
export function resolveTag(context: GateContext, file: CompositionFile, name: string): Resolution {
  const [local = "", member, ...deeper] = name.split(".");
  const item = context.imports(file.path).find(candidate => candidate.form === "import" && !candidate.typeOnly
    && candidate.bindings.some(binding => binding.local === local));
  const binding = item?.bindings.find(candidate => candidate.local === local);
  const namespace = binding?.imported === "*";
  if (!item || !binding || deeper.length || member !== undefined && !namespace) return { kind: "unknown", reason: "is not an imported piece (a computed component)" };
  const defined = context.definition(item, member ?? binding.imported);
  if (defined === undefined) return { kind: "unknown", reason: `from "${item.specifier}" does not resolve to a declared piece` };
  const owner = context.owners.of(defined);
  if (owner?.kind === "piece" && owner.id === file.id && owner.role !== "companion") return { kind: "part" };
  const id = context.owners.pieceOfEntry(defined);
  if (id === undefined) return { kind: "unknown", reason: `resolves to ${defined}, which is not a declared piece` };
  const fromIndex = item.target.kind === "file" && item.target.path === context.layout.generated.index;
  return { kind: "piece", id, entry: posix.basename(defined, ".svelte"), fromIndex, namespace };
}

/** Why a tag may not be mounted here: an unknown piece, a piece outside `uses`, a namespace member not from the index. */
export function tagProblems(file: CompositionFile, name: string, resolution: Resolution): string[] {
  if (resolution.kind === "unknown") return [`<${name}> ${resolution.reason}`];
  if (resolution.kind === "part") return [];
  const problems: string[] = [];
  if (!file.uses.has(resolution.id)) problems.push(`<${name}> mounts ${resolution.id}, which is not in uses`);
  if (resolution.namespace && !resolution.fromIndex) problems.push(`<${name}>: import ${resolution.entry} from the catalog index`);
  return problems;
}

/** Script half: a component reaches the file only from the catalog index or as one of its own parts. Vendor, CSS and DOM
 * imports are judged by rules F, G and I. */
export function importViolations(context: GateContext, file: CompositionFile, code: string): Violation[] {
  const found: Violation[] = [], report = (line: number, what: string) => found.push(violation(code, file.path, line, `${what}; ${file.suffix}`));
  for (const item of context.imports(file.path)) {
    if (item.typeOnly) continue;
    if (item.form === "dynamic" || item.form === "require") {
      const component = item.target.kind === "dynamic" || item.target.kind === "file" && item.target.path.endsWith(".svelte");
      if (component) report(item.line, `dynamic import of ${item.specifier ? `"${item.specifier}"` : "a computed module"}: mount pieces from the catalog index`);
      continue;
    }
    if (item.target.kind === "file" && item.target.path === context.layout.generated.index) continue;
    for (const binding of item.bindings) {
      const defined = binding.imported === "*" ? undefined : context.definition(item, binding.imported);
      const id = defined === undefined ? undefined : context.owners.pieceOfEntry(defined);
      if (defined === undefined || id === undefined || id === file.id) continue;
      report(item.line, `import ${posix.basename(defined, ".svelte")} from the catalog index, not "${item.specifier}"`);
    }
  }
  return found;
}

/** Where a template node sits: inside a mounted piece (`mounted`), or inside a native element or unknown tag already reported
 * (`drawn`: text there is that report's content). */
type Place = Readonly<{ mounted?: Resolution; drawn?: boolean }>;
/** Template half: every node is a block, a comment, blank text, a declared slot or a mounted piece. A native element is one
 * report: text inside it is its own content. A <style> block is rule G's (compositions own no CSS). */
function templateViolations(context: GateContext, file: CompositionFile): Violation[] {
  const found: Violation[] = [];
  const report = (code: string, node: unknown, what: string) => {
    const start = field(node, "start");
    found.push(violation(code, file.path, file.parsed.line(typeof start === "number" ? start : 0), `${what}; ${file.suffix}`));
  };
  const visitAll = (fragment: unknown, place: Place = {}) => { for (const node of nodesOf(fragment)) visit(node, place); };
  const checkSnippet = (node: SyntaxNode, mounted: Resolution | undefined) => {
    const name = text(field(node, "expression"), "name");
    if (mounted?.kind === "part") report(slotNotTyped, node, `{#snippet ${name}} passed to own part: parts declare no slots`);
    else if (mounted === undefined && !file.slots.has(name)) report(slotNotTyped, node, `{#snippet ${name}} is not a slot declared by ${file.id}`);
  };
  const checkRender = (node: SyntaxNode) => {
    const expression = field(node, "expression"), call = field(expression, "type") === "ChainExpression" ? field(expression, "expression") : expression;
    const callee = field(call, "callee"), name = field(callee, "type") === "Identifier" ? text(callee, "name") : "";
    if (!file.slots.has(name)) report(slotNotTyped, node, `{@render ${name || "a computed snippet"}} renders no slot declared by ${file.id}`);
  };
  function visit(node: SyntaxNode, place: Place): void {
    if (isBlank(node) || node.type === "ConstTag") return;
    if (node.type === "RenderTag") return checkRender(node);
    if (node.type === "SnippetBlock") { checkSnippet(node, place.mounted); return visitAll(field(node, "body"), { drawn: place.drawn === true }); }
    if (node.type === "Component") {
      const name = text(node, "name"), resolution = resolveTag(context, file, name);
      for (const problem of tagProblems(file, name, resolution)) report(unknownPiece, node, problem);
      return visitAll(field(node, "fragment"), { mounted: resolution, drawn: place.drawn === true || resolution.kind === "unknown" });
    }
    // Text handed to a mounted piece is its child content (rule E judges it); text in a reported element is that element's.
    const isText = node.type === "Text" || node.type === "ExpressionTag";
    if (isText && (place.mounted?.kind === "piece" || place.drawn)) return;
    const computed = node.type === "SvelteComponent" || node.type === "SvelteSelf", block = blocks.has(node.type ?? "");
    if (!block) report(computed ? unknownPiece : nativeElement, node, describe(file.parsed, node));
    const drawn = place.drawn === true || !block && !computed && !isText;
    for (const fragment of childFragments(node)) visitAll(fragment, { drawn });
  }
  visitAll(file.parsed.fragment);
  return found;
}

export const ruleD: ContentRule = context => compositionFiles(context, false)
  .flatMap(file => [...importViolations(context, file, unknownPiece), ...templateViolations(context, file)]);
