export type SyntaxNode = Record<string, unknown> & { type?: string; start?: number; end?: number };
export function walk(value: unknown, visit: (node: SyntaxNode, parent?: SyntaxNode) => void, parent?: SyntaxNode): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const child of value) walk(child, visit, parent); return; }
  const node = value as SyntaxNode;
  visit(node, parent);
  for (const [key, child] of Object.entries(node)) {
    if (!["loc", "name_loc", "comments", "leadingComments", "trailingComments"].includes(key)) walk(child, visit, node);
  }
}
