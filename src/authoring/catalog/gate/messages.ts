// Rule V. Law (plan §14): a catalog template writes no human text; every sentence is a key of the SDK message catalog
// (`{m.field.clear}`), foundations included. Raises LITERAL_TEXT for a non-whitespace text node, a string-literal expression,
// and a literal aria-label, title, placeholder or alt anywhere under the catalog folder. On a piece tag, a literal that is one of
// the values the piece contract offers for that prop (`<Image placeholder="unavailable">`) is vocabulary, not a sentence.
import { posix } from "node:path";
import type { ContentRule, GateContext } from "./context.ts";
import type { ContractSchema } from "../read-contract.ts";
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

/** The literal values a schema offers when it offers nothing else (absence aside), or undefined for any other schema. */
function vocabulary(schema: ContractSchema): readonly unknown[] | undefined {
  const members = schema.kind === "union" ? schema.members : [schema];
  const values = members.flatMap(member => member.kind === "literal" ? [member.value] : []);
  return values.length && members.every(member => member.kind === "literal" || member.kind === "undefined") ? values : undefined;
}

/** Whether `value` on the prop `name` of the piece tag `tag` is one of the literal values the piece contract offers there
 * (`<Image placeholder="unavailable">`): a word of the piece vocabulary, which no person reads. */
function vocabularyValue(context: GateContext, path: string, tag: SyntaxNode, name: string, value: string): boolean {
  const local = text(tag, "name").split(".")[0] ?? "";
  for (const item of context.imports(path)) {
    const binding = item.form === "import" && !item.typeOnly ? item.bindings.find(candidate => candidate.local === local) : undefined;
    const file = binding && context.definition(item, binding.imported), id = file === undefined ? undefined : context.owners.pieceOfEntry(file);
    const contract = id === undefined ? undefined : context.contract(id), property = contract?.closed ? contract.props[name] : undefined;
    if (property) return vocabulary(property.schema)?.includes(value) ?? false;
  }
  return false;
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
        const name = text(node, "name"), piece = parent?.type === "Component" ? parent : undefined;
        for (const part of literalParts(node.value)) {
          if (!piece || !vocabularyValue(context, path, piece, name, part)) report(node, `${name}="${part}"`);
        }
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
