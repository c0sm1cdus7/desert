// Rule L2, the digest half of rule L. Law: an approved piece is exactly the bytes the owner saw, and what the product
// exposes (an approved piece, a dispatcher, an authorable composition) mounts only approved pieces and approved specimen values.
// Raises FOUNDATION_UNAPPROVED_CHANGE (a digest no longer matches, or a file the gate cannot read the bytes of) and
// PIECE_NOT_APPROVED (an unapproved piece mounted by such a composition; a literal prop value only unapproved specimens carry).
import { Value } from "@sinclair/typebox/value";
import { ApprovalsSchema, type Approvals } from "../approvals-schema.ts";
import { contractDigest, sourceDigest, sourceFiles, type ReadBytes } from "../digest.ts";
import { walk, type SyntaxNode } from "./walk.ts";
import type { ContentRule, GateContext } from "./context.ts";
import type { LocatedDeclaration } from "./inventory.ts";
import { violation, type Violation } from "./violation.ts";

type Mount = Readonly<{ id: string; tag: string; node: SyntaxNode; path: string; line: number }>;

const approvedEntries = (ledger: Approvals) => Object.entries(ledger.pieces).flatMap(([id, entry]) => entry.status === "approved" ? [{ id, entry }] : []);

/** The gate's bytes of a file: its loaded text, re-encoded. Binary files are not loaded and read as undefined. */
const gateBytes = (context: GateContext): ReadBytes => {
  const present = new Set(context.paths);
  return path => {
    const text = present.has(path) ? context.text(path) : undefined;
    return text === undefined ? undefined : Buffer.from(text, "utf8");
  };
};

function digestChanges(context: GateContext, ledger: Approvals): Violation[] {
  const read = gateBytes(context), present = new Set(context.paths), found: Violation[] = [];
  for (const { id, entry } of approvedEntries(ledger)) {
    const located = context.owners.declaration(id);
    if (!located) { found.push(violation("FOUNDATION_UNAPPROVED_CHANGE", context.layout.ledger, 1, `${id}: approved but not declared`)); continue; }
    const at = (what: string) => found.push(violation("FOUNDATION_UNAPPROVED_CHANGE", located.path, 1, `${id}: ${what}`));
    for (const path of sourceFiles(context, id)) if (present.has(path) && context.text(path) === undefined) {
      at(`${path} has no bytes in the gate, so the approval cannot be verified`);
    }
    if (sourceDigest(context, id, read) !== entry.sourceDigest) at(`the source digest differs from the approved one (${entry.approvedOn})`);
    if (contractDigest(context, id, read) !== entry.contractDigest) at(`the contract digest differs from the approved one (${entry.approvedOn})`);
  }
  return found;
}

/** The pieces mounted by the component tags of a Svelte file, resolved through aliases, barrels and namespaces. */
function mountsIn(context: GateContext, path: string): Mount[] {
  if (!path.endsWith(".svelte") || context.text(path) === undefined) return [];
  const parsed = context.parsed(path), imports = context.imports(path).filter(item => item.form === "import" && !item.typeOnly);
  if (parsed.kind !== "svelte") return [];
  const mounts: Mount[] = [];
  walk(parsed.fragment, node => {
    if (node.type !== "Component" || typeof node.name !== "string") return;
    const [base = "", member] = node.name.split(".");
    for (const item of imports) for (const binding of item.bindings) {
      if (binding.local !== base) continue;
      const imported = binding.imported === "*" ? member : member === undefined ? binding.imported : undefined;
      const file = imported === undefined ? undefined : context.definition(item, imported);
      const id = file === undefined ? undefined : context.owners.pieceOfEntry(file);
      if (id !== undefined) mounts.push({ id, tag: node.name, node, path, line: parsed.line(node.start ?? 0) });
    }
  });
  return mounts;
}

function filesOf(context: GateContext, located: LocatedDeclaration): string[] {
  const { declaration } = located;
  if (declaration.kind === "mechanism") return [];
  const folder = located.path.slice(0, located.path.lastIndexOf("/") + 1);
  return [declaration.owner.entry, ...declaration.owner.parts ?? []].map(name => `${folder}${name}`).filter(path => context.paths.includes(path));
}

/** Why a piece may mount only approved pieces, or undefined when it may mount implemented ones. */
function exposure(located: LocatedDeclaration, ledger: Approvals): string | undefined {
  const { declaration } = located;
  if (declaration.kind === "mechanism") return undefined;
  if (ledger.pieces[declaration.id]?.status === "approved") return "approved";
  if (declaration.kind === "composition" && declaration.dispatch !== undefined) return "dispatcher";
  if (declaration.kind === "composition" && declaration.authorable === true) return "authorable";
  return undefined;
}

const lineOfUses = (context: GateContext, path: string) => {
  const source = context.text(path) ?? "", at = source.search(/\buses\s*:/);
  return at < 0 ? 1 : source.slice(0, at).split("\n").length;
};

function unapprovedMounts(context: GateContext, ledger: Approvals): Violation[] {
  const found: Violation[] = [];
  for (const located of context.declarations) {
    const reason = exposure(located, ledger), { declaration } = located;
    if (reason === undefined || declaration.kind === "mechanism") continue;
    const mounted = new Map<string, Readonly<{ path: string; line: number }>>();
    if (declaration.kind === "composition") for (const id of declaration.uses) mounted.set(id, { path: located.path, line: lineOfUses(context, located.path) });
    for (const path of filesOf(context, located)) for (const mount of mountsIn(context, path)) {
      if (!mounted.has(mount.id)) mounted.set(mount.id, mount);
    }
    for (const [id, where] of mounted) {
      const status = ledger.pieces[id]?.status;
      if (id === declaration.id || status === "approved") continue;
      found.push(violation("PIECE_NOT_APPROVED", where.path, where.line,
        `${declaration.id} (${reason}) mounts ${id}, which is ${status ?? "not in the ledger"}`));
    }
  }
  return found;
}

/** Axis → values that appear only in specimens the owner has not approved. */
function unusableValues(specimens: Readonly<Record<string, string>>): ReadonlyMap<string, ReadonlySet<string>> {
  const pairs = (key: string) => (key.split("|")[1] ?? "").split(",").filter(Boolean).map(pair => pair.split("="));
  const approvedPairs = new Set(Object.entries(specimens).filter(([, status]) => status === "approved")
    .flatMap(([key]) => pairs(key).map(([axis, value]) => `${axis}=${value}`)));
  const unusable = new Map<string, Set<string>>();
  for (const [key, status] of Object.entries(specimens)) if (status !== "approved") for (const [axis = "", value = ""] of pairs(key)) {
    if (!approvedPairs.has(`${axis}=${value}`)) unusable.set(axis, (unusable.get(axis) ?? new Set()).add(value));
  }
  return unusable;
}

/** The literal string an attribute passes (`a="x"` or `a={"x"}`), or undefined when it is computed. */
function literalValue(attribute: SyntaxNode): string | undefined {
  const value = attribute.value, parts = Array.isArray(value) ? value : [value];
  const texts = parts.map(part => {
    if (!part || typeof part !== "object") return undefined;
    if (Reflect.get(part, "type") === "Text") return String(Reflect.get(part, "data"));
    const expression: unknown = Reflect.get(part, "type") === "ExpressionTag" ? Reflect.get(part, "expression") : undefined;
    const literal = expression && typeof expression === "object" && Reflect.get(expression, "type") === "Literal" ? Reflect.get(expression, "value") : undefined;
    return typeof literal === "string" ? literal : undefined;
  });
  return texts.every(text => text !== undefined) ? texts.join("") : undefined;
}

function proposedSpecimenValues(context: GateContext, ledger: Approvals): Violation[] {
  const restricted = new Map(approvedEntries(ledger).map(({ id, entry }) => [id, unusableValues(entry.specimens ?? {})] as const)
    .filter(([, unusable]) => unusable.size > 0));
  if (!restricted.size) return [];
  const found: Violation[] = [];
  for (const path of context.paths) for (const mount of mountsIn(context, path)) {
    const unusable = restricted.get(mount.id), owner = context.owners.of(path);
    if (!unusable || owner?.kind === "piece" && owner.id === mount.id) continue;
    const attributes: unknown = mount.node.attributes;
    for (const attribute of Array.isArray(attributes) ? attributes : []) {
      if (!attribute || attribute.type !== "Attribute" || typeof attribute.name !== "string") continue;
      const value = literalValue(attribute);
      if (value !== undefined && unusable.get(attribute.name)?.has(value)) found.push(violation("PIECE_NOT_APPROVED", path, mount.line,
        `<${mount.tag}> passes ${attribute.name}="${value}" to ${mount.id}, a specimen value that is not approved`));
    }
  }
  return found;
}

export const ruleL2: ContentRule = context => {
  const ledger = context.ledger;
  if (!Value.Check(ApprovalsSchema, ledger)) return [];
  return [...digestChanges(context, ledger), ...unapprovedMounts(context, ledger), ...proposedSpecimenValues(context, ledger)];
};
