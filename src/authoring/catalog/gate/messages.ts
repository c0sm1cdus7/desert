// Rule V. Law (plan §14): a catalog template writes no human text; every sentence is a key of the SDK message catalog
// (`{m.field.clear}`), foundations included. Raises LITERAL_TEXT for a non-whitespace text node, a string-literal expression,
// and a literal aria-label, title, placeholder or alt anywhere under the catalog folder.
import { posix } from "node:path";
import type { ContentRule } from "./context.ts";
import { field, text, walk, type SyntaxNode } from "./walk.ts";
import { violation, type Violation } from "./violation.ts";

/** The attributes a person reads (or a screen reader speaks). Other attributes are vocabulary (class, src, type). */
export const textAttributes: ReadonlySet<string> = new Set(["aria-label", "title", "placeholder", "alt"]);
const advice = "is written in the template; use a message key (m.<owner>.<meaning>)";

/** A string a template writes as an expression (`{"Clear"}`), or undefined. */
const literalExpression = (node: unknown): string | undefined => {
  const expression = field(node, "expression");
  return field(node, "type") === "ExpressionTag" && field(expression, "type") === "Literal" && typeof field(expression, "value") === "string"
    ? text(expression, "value") : undefined;
};

/** The literal parts of an attribute value: its text chunks and its string-literal expressions. */
function literalParts(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : [value];
  return parts.flatMap(part => field(part, "type") === "Text" ? [text(part, "data")] : [literalExpression(part) ?? ""]).filter(part => /\S/.test(part));
}

const isAttribute = (node: SyntaxNode | undefined) => typeof node?.type === "string" && /Attribute$|Directive$/.test(node.type);

export const ruleV: ContentRule = context => {
  // The catalog folder is the one holding the generated index: the layout writes that path once.
  const found: Violation[] = [], catalogFolder = `${posix.dirname(context.layout.generated.index)}/`;
  for (const path of context.paths) {
    if (!path.endsWith(".svelte") || !path.startsWith(catalogFolder)) continue;
    const parsed = context.parsed(path);
    if (parsed.kind !== "svelte") continue;
    const report = (node: SyntaxNode, what: string) => found.push(violation("LITERAL_TEXT", path, parsed.line(node.start ?? 0), `${what} ${advice}`));
    walk(parsed.fragment, (node, parent) => {
      if (node.type === "Attribute" && textAttributes.has(text(node, "name"))) {
        for (const part of literalParts(node.value)) report(node, `${text(node, "name")}="${part}"`);
        return;
      }
      if (isAttribute(parent)) return;
      if (node.type === "Text" && /\S/.test(text(node, "data"))) report(node, `the text "${text(node, "data").trim()}"`);
      const literal = literalExpression(node);
      if (literal !== undefined && /\S/.test(literal)) report(node, `the text "${literal.trim()}"`);
    });
  }
  return found;
};
