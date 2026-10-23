import { digest } from "./model.ts";
import { walk, type SyntaxNode } from "./walk.ts";

/** Only the catalog's explicit event port is nonvisual; other props remain evidence. */
export function componentEventExpression(attribute: SyntaxNode): SyntaxNode | undefined {
  const value = attribute.value as SyntaxNode | undefined;
  return attribute.type === "Attribute" && attribute.name === "onevent" && value?.type === "ExpressionTag"
    ? value.expression as SyntaxNode : undefined;
}

/** Preserve DOM structure/attributes/content; event bodies have a separate script audit. */
export function domOwnershipFingerprint(path: string, source: string, root: SyntaxNode): string {
  const replacements: { start: number; end: number }[] = [];
  walk(root, node => {
    if (node.type !== "Component") return;
    for (const attribute of node.attributes as SyntaxNode[]) {
      if (!componentEventExpression(attribute)) continue;
      let start = attribute.start!;
      while (start > node.start! && /\s/.test(source[start - 1]!)) start--;
      replacements.push({ start, end: attribute.end! });
    }
  });
  let operation = source.slice(root.start, root.end);
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    const start = replacement.start - root.start!, end = replacement.end - root.start!;
    operation = `${operation.slice(0, start)} onevent={#catalog-event}${operation.slice(end)}`;
  }
  return digest(JSON.stringify([path, "RENDERER_DOM", operation.trim()]));
}
