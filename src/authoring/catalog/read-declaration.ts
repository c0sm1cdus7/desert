// Reads `*.catalog.ts` and `*.mechanism.ts` files as data, never by evaluating them: an inspected tree
// cannot run code in the gate. The data is validated with the same schema the authoring API uses.
import ts from "typescript";
import { validateDeclaration } from "./define.ts";
import type { DeclarationKind } from "./declaration-schema.ts";

const calls: ReadonlyMap<string, DeclarationKind> = new Map([
  ["defineFoundation", "foundation"], ["defineComposition", "composition"], ["defineMechanism", "mechanism"]]);
type Literal = string | number | boolean | readonly Literal[] | { readonly [key: string]: Literal };
export type ReadDeclaration = Readonly<{ kind: DeclarationKind; binding: string; [field: string]: unknown }>;

function reader(path: string) {
  const fail = (node: ts.Node, what: string): never => {
    const { line } = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
    throw new Error(`CATALOG_DECLARATION: ${path}:${line + 1}: ${what}`);
  };
  function literal(node: ts.Expression, key?: string): Literal {
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (key === "contract" && ts.isIdentifier(node)) return { identifier: node.text };
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(element => literal(element));
    if (!ts.isObjectLiteralExpression(node)) return fail(node, "only literal values are declarations");
    const entries = new Map<string, Literal>();
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) return fail(property, "only plain `key: value` properties");
      if (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) return fail(property, "computed keys are not data");
      const name = property.name.text;
      if (name === "__proto__" || entries.has(name)) return fail(property, `duplicate or unsafe key ${name}`);
      entries.set(name, literal(property.initializer, name));
    }
    return Object.fromEntries(entries);
  }
  function declaration(statement: ts.Statement): ReadDeclaration | undefined {
    if (ts.isImportDeclaration(statement)) return undefined;
    const declared = ts.isVariableStatement(statement) && statement.declarationList.declarations.length === 1
      && statement.declarationList.flags & ts.NodeFlags.Const
      && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
      ? statement.declarationList.declarations[0] : undefined;
    const call = declared?.initializer;
    if (!declared || !ts.isIdentifier(declared.name) || !call || !ts.isCallExpression(call)
      || !ts.isIdentifier(call.expression) || call.arguments.length !== 1) {
      return fail(statement, "a catalog file holds imports and exported define* declarations only");
    }
    const kind = calls.get(call.expression.text);
    if (!kind) return fail(call, `${call.expression.text} is not a catalog declaration`);
    const argument = call.arguments[0];
    if (!argument || !ts.isAsExpression(argument) || argument.type.getText() !== "const") return fail(call, "declarations end with `as const`");
    const value = literal(argument.expression);
    return Object.freeze({ ...validateDeclaration(kind, value), kind, binding: declared.name.text });
  }
  return declaration;
}

export function readDeclarations(path: string, source: string): readonly ReadDeclaration[] {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const read = reader(path);
  return Object.freeze(file.statements.flatMap(statement => read(statement) ?? []));
}
