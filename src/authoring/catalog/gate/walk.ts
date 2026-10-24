// A depth-first walk over a Svelte syntax tree (template, CSS or script ESTree), skipping location and comment keys.
export type SyntaxNode = Record<string, unknown> & { type?: string; start?: number; end?: number };

const skipped = new Set(["loc", "name_loc", "comments", "leadingComments", "trailingComments"]);
const isNode = (value: unknown): value is SyntaxNode => typeof value === "object" && value !== null && !Array.isArray(value);

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
