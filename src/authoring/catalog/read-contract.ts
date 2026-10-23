// Reads a piece contract (`<id>.contract.ts`) as data, like a declaration: the gate never evaluates an inspected tree.
// A contract is `export const <Name>Contract = {} as const` (a stub, before the piece is migrated) or
//   export const FieldContract = { props: Type.Object({...}), events: Type.Object({...}), marks: ["data-field-state"] } as const;
// written in a closed TypeBox subset: Object, Literal, Union, Optional, Array, String, Number, Boolean, Integer, Null.
import ts from "typescript";

export type ContractSchema = Readonly<
  | { kind: "object"; properties: Readonly<Record<string, ContractProperty>> }
  | { kind: "literal"; value: string | number | boolean } | { kind: "union"; members: readonly ContractSchema[] }
  | { kind: "array"; items: ContractSchema } | { kind: "string" | "number" | "boolean" | "integer" | "null" }>;
export type ContractProperty = Readonly<{ schema: ContractSchema; optional: boolean }>;
export type ReadContract = Readonly<{ binding: string; closed: false } | { binding: string; closed: true;
  props: Readonly<Record<string, ContractProperty>>; events: Readonly<Record<string, ContractProperty>>; marks: readonly string[] }>;

const scalars = new Set(["String", "Number", "Boolean", "Integer", "Null"]);

export function readContract(path: string, source: string): ReadContract {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const fail = (node: ts.Node, what: string): never => {
    throw new Error(`CATALOG_DECLARATION: ${path}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}: ${what}`);
  };
  const call = (node: ts.Expression) => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Type" ? { name: node.expression.name.text, node } : undefined;
  function schema(node: ts.Expression): ContractSchema {
    const found = call(node);
    if (!found) return fail(node, "a contract schema is a Type.* call of the closed subset");
    const [first] = found.node.arguments;
    if (scalars.has(found.name)) return { kind: found.name.toLowerCase() as "string" };
    if (found.name === "Literal" && first && (ts.isStringLiteral(first) || ts.isNumericLiteral(first) || first.kind === ts.SyntaxKind.TrueKeyword || first.kind === ts.SyntaxKind.FalseKeyword)) {
      return { kind: "literal", value: ts.isStringLiteral(first) ? first.text : ts.isNumericLiteral(first) ? Number(first.text) : first.kind === ts.SyntaxKind.TrueKeyword };
    }
    if (found.name === "Union" && first && ts.isArrayLiteralExpression(first)) return { kind: "union", members: first.elements.map(schema) };
    if (found.name === "Array" && first) return { kind: "array", items: schema(first) };
    if (found.name === "Object" && first) return { kind: "object", properties: properties(first, found.node.arguments[1]) };
    return fail(node, `Type.${found.name} is outside the contract subset`);
  }
  function property(node: ts.Expression): ContractProperty {
    const found = call(node);
    if (found?.name === "Optional" && found.node.arguments[0]) return { schema: schema(found.node.arguments[0]), optional: true };
    return { schema: schema(node), optional: false };
  }
  function properties(node: ts.Expression, options: ts.Expression | undefined): Record<string, ContractProperty> {
    if (!ts.isObjectLiteralExpression(node)) return fail(node, "Type.Object takes an object literal");
    const closedObject = options && ts.isObjectLiteralExpression(options) && options.properties.some(item => ts.isPropertyAssignment(item)
      && ts.isIdentifier(item.name) && item.name.text === "additionalProperties" && item.initializer.kind === ts.SyntaxKind.FalseKeyword);
    if (!closedObject) fail(node, "every contract object is closed with { additionalProperties: false }");
    const result: Record<string, ContractProperty> = {};
    for (const item of node.properties) {
      if (!ts.isPropertyAssignment(item) || !(ts.isIdentifier(item.name) || ts.isStringLiteral(item.name))) return fail(item, "only plain properties");
      result[item.name.text] = property(item.initializer);
    }
    return result;
  }
  const statements = file.statements.filter(statement => !ts.isImportDeclaration(statement));
  const [statement] = statements;
  const declaration = statement && ts.isVariableStatement(statement) && statements.length === 1 ? statement.declarationList.declarations[0] : undefined;
  const value = declaration?.initializer;
  if (!declaration || !ts.isIdentifier(declaration.name) || !value || !ts.isAsExpression(value) || value.type.getText(file) !== "const"
    || !ts.isObjectLiteralExpression(value.expression)) return fail(statement ?? file, "a contract file exports one `{ ... } as const`");
  const binding = declaration.name.text, fields = value.expression.properties;
  if (!fields.length) return { binding, closed: false };
  const read: { props?: Record<string, ContractProperty>; events?: Record<string, ContractProperty>; marks?: string[] } = {};
  for (const field of fields) {
    if (!ts.isPropertyAssignment(field) || !ts.isIdentifier(field.name)) return fail(field, "a contract holds props, events and marks");
    const name = field.name.text, at = field.initializer;
    if (name === "marks") {
      if (!ts.isArrayLiteralExpression(at) || at.elements.some(element => !ts.isStringLiteral(element))) return fail(at, "marks are string literals");
      read.marks = at.elements.flatMap(element => ts.isStringLiteral(element) ? [element.text] : []);
    } else if (name === "props" || name === "events") {
      const object = schema(at);
      if (object.kind !== "object") return fail(at, `${name} is a Type.Object`);
      read[name] = { ...object.properties };
    } else return fail(field, `unknown contract field ${name}`);
  }
  return { binding, closed: true, props: read.props ?? {}, events: read.events ?? {}, marks: read.marks ?? [] };
}
