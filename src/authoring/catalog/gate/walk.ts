// A depth-first walk over a Svelte syntax tree (template, CSS or script ESTree), skipping location and comment keys, and
// the readers every rule uses on those trees: one definition each.
export type SyntaxNode = Record<string, unknown> & { type?: string; start?: number; end?: number };

const skipped = new Set(["loc", "name_loc", "comments", "leadingComments", "trailingComments"]);
export const isNode = (value: unknown): value is SyntaxNode => typeof value === "object" && value !== null && !Array.isArray(value);
/** A key of a node, or undefined when the value is not an object. */
export const field = (node: unknown, key: string): unknown => node && typeof node === "object" ? Reflect.get(node, key) : undefined;
/** A string key of a node, or "" when it is absent or not a string. */
export const text = (node: unknown, key: string) => { const value = field(node, key); return typeof value === "string" ? value : ""; };
export const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
/** The nodes of an array value; anything else is no nodes. */
export const nodes = (value: unknown): SyntaxNode[] => Array.isArray(value) ? value.filter(isNode) : [];

/** Every name a binding pattern declares (`H`, `{ a, b: [c] }`, `...rest`, `x = 1`) in a Svelte (ESTree) tree. */
export function patternNames(pattern: unknown): string[] {
  switch (field(pattern, "type")) {
    case "Identifier": { const name = field(pattern, "name"); return typeof name === "string" ? [name] : []; }
    case "ObjectPattern": return list(field(pattern, "properties")).flatMap(property =>
      patternNames(field(property, "type") === "RestElement" ? property : field(property, "value")));
    case "ArrayPattern": return list(field(pattern, "elements")).flatMap(patternNames);
    case "AssignmentPattern": return patternNames(field(pattern, "left"));
    case "RestElement": return patternNames(field(pattern, "argument"));
    default: return [];
  }
}

export function walk(value: unknown, visit: (node: SyntaxNode, parent?: SyntaxNode) => void, parent?: SyntaxNode): void {
  if (Array.isArray(value)) {
    const items: readonly unknown[] = value;
    for (const child of items) walk(child, visit, parent);
    return;
  }
  if (!isNode(value)) return;
  visit(value, parent);
  for (const [key, child] of Object.entries(value)) if (!skipped.has(key)) walk(child, visit, value);
}
