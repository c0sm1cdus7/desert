// Reads a piece contract (`<id>.contract.ts`) as data, like a declaration: the gate never evaluates an inspected tree.
// A contract is `export const <Name>Contract = {} as const` (a stub, before the piece is migrated) or
//   export const FieldContract = { props: Type.Object({...}), events: Type.Object({...}), marks: ["data-field-state"] } as const;
// written in a closed TypeBox subset: Object (closed), Literal, Union, Optional, Array, Record, Function, String, Number,
// Boolean, Integer, Null, and a reference to a TypeBox schema imported from a non-visual module (domain data such as a
// resolved node): the gate records its name, TypeScript types it. Domain data that has a TypeScript type but no schema is
// `Type.Unsafe<ImportedType>()`, the type imported from a non-visual module. Open forms (Any, Unknown, bare Unsafe) are
// refused. `instance` lists the methods a piece exposes to a caller that binds it (`bind:this`).
import ts from "typescript";

export type ContractSchema = Readonly<
  | { kind: "object"; properties: Readonly<Record<string, ContractProperty>> }
  | { kind: "literal"; value: string | number | boolean } | { kind: "union"; members: readonly ContractSchema[] }
  | { kind: "array"; items: ContractSchema } | { kind: "record"; values: ContractSchema } | { kind: "function" }
  | { kind: "reference"; name: string; from: string } | { kind: "typed"; name: string; from: string }
  | { kind: "promise"; value: ContractSchema } | { kind: "string" | "number" | "boolean" | "integer" | "null" | "void" | "undefined" }>;
export type ContractProperty = Readonly<{ schema: ContractSchema; optional: boolean }>;
export type ReadContract = Readonly<{ binding: string; closed: false } | { binding: string; closed: true;
  props: Readonly<Record<string, ContractProperty>>; events: Readonly<Record<string, ContractProperty>>;
  instance: Readonly<Record<string, ContractProperty>>; marks: readonly string[] }>;

const scalars = new Set(["String", "Number", "Boolean", "Integer", "Null", "Void", "Undefined"]);
/** TypeScript's own utility types, which a typed reference may combine with imported types. */
const utilityTypes = new Set(["Pick", "Omit", "Partial", "Required", "Readonly", "ReadonlyArray", "Record", "ReturnType", "Parameters",
  "Awaited", "Extract", "Exclude", "NonNullable", "Promise", "Array"]);
/** Visual code: a Svelte file, or any module of src/svelte that is not infra/ (infra is nonvisual TypeScript, rule I). */
const visualModule = (from: string) => /\.svelte$/.test(from) || /\/svelte\//.test(from) && !/\/infra\//.test(from)
  || /\/catalog\/(foundations|compositions|renderer|mechanisms)\//.test(from);
/** Every type name a type expression refers to (`Pick<AccessClient, "lock">` → Pick, AccessClient). */
function typeNames(node: ts.Node, found: Set<string> = new Set()): Set<string> {
  if (ts.isTypeReferenceNode(node)) found.add(ts.isIdentifier(node.typeName) ? node.typeName.text : node.typeName.getText());
  if (ts.isTypeQueryNode(node)) found.add(node.exprName.getText());
  ts.forEachChild(node, child => { typeNames(child, found); });
  return found;
}

export function readContract(path: string, source: string): ReadContract {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const fail = (node: ts.Node, what: string): never => {
    throw new Error(`CATALOG_DECLARATION: ${path}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}: ${what}`);
  };
  const call = (node: ts.Expression) => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Type" ? { name: node.expression.name.text, node } : undefined;
  function schema(node: ts.Expression): ContractSchema {
    if (ts.isIdentifier(node)) {
      const from = imported.get(node.text);
      if (!from) return fail(node, `${node.text} is not a schema imported from a module`);
      if (visualModule(from)) return fail(node, `${node.text} comes from visual code (${from}); a contract references domain or infra schemas only`);
      return { kind: "reference", name: node.text, from };
    }
    const found = call(node);
    if (!found) return fail(node, "a contract schema is a Type.* call of the closed subset or an imported schema");
    const [first] = found.node.arguments;
    if (scalars.has(found.name)) return { kind: found.name.toLowerCase() as "string" };
    if (found.name === "Literal" && first && (ts.isStringLiteral(first) || ts.isNumericLiteral(first) || first.kind === ts.SyntaxKind.TrueKeyword || first.kind === ts.SyntaxKind.FalseKeyword)) {
      return { kind: "literal", value: ts.isStringLiteral(first) ? first.text : ts.isNumericLiteral(first) ? Number(first.text) : first.kind === ts.SyntaxKind.TrueKeyword };
    }
    if (found.name === "Union" && first && ts.isArrayLiteralExpression(first)) return { kind: "union", members: first.elements.map(schema) };
    if (found.name === "Array" && first) return { kind: "array", items: schema(first) };
    if (found.name === "Unsafe") {
      const [argument] = found.node.typeArguments ?? [];
      if (!argument || found.node.arguments.length) return fail(node, "Type.Unsafe takes one type argument and no schema: Type.Unsafe<DomainType>()");
      const names = typeNames(argument);
      for (const name of names) {
        const from = imported.get(name);
        if (!from && !utilityTypes.has(name)) return fail(node, `${name} is neither imported from a module nor a standard utility type`);
        if (from && visualModule(from)) return fail(node, `${name} comes from visual code (${from}); a contract references domain or infra types only`);
      }
      return { kind: "typed", name: argument.getText(file), from: [...names].map(name => imported.get(name)).find(Boolean) ?? "" };
    }
    if (found.name === "Promise" && first) return { kind: "promise", value: schema(first) };
    const second = found.node.arguments[1];
    if (found.name === "Record" && first && second) { schema(first); return { kind: "record", values: schema(second) }; }
    if (found.name === "Function" && first && ts.isArrayLiteralExpression(first) && second) {
      for (const parameter of first.elements) schema(parameter);
      schema(second);
      return { kind: "function" };
    }
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
  const imported = new Map<string, string>();
  for (const statement of file.statements) if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
    const clause = statement.importClause, named = clause?.namedBindings;
    if (named && ts.isNamedImports(named)) for (const element of named.elements) imported.set(element.name.text, statement.moduleSpecifier.text);
  }
  const statements = file.statements.filter(statement => !ts.isImportDeclaration(statement));
  const [statement] = statements;
  const declaration = statement && ts.isVariableStatement(statement) && statements.length === 1 ? statement.declarationList.declarations[0] : undefined;
  const value = declaration?.initializer;
  if (!declaration || !ts.isIdentifier(declaration.name) || !value || !ts.isAsExpression(value) || value.type.getText(file) !== "const"
    || !ts.isObjectLiteralExpression(value.expression)) return fail(statement ?? file, "a contract file exports one `{ ... } as const`");
  const binding = declaration.name.text, fields = value.expression.properties;
  if (!fields.length) return { binding, closed: false };
  const read: { props?: Record<string, ContractProperty>; events?: Record<string, ContractProperty>;
    instance?: Record<string, ContractProperty>; marks?: string[] } = {};
  for (const field of fields) {
    if (!ts.isPropertyAssignment(field) || !ts.isIdentifier(field.name)) return fail(field, "a contract holds props, events and marks");
    const name = field.name.text, at = field.initializer;
    if (name === "marks") {
      if (!ts.isArrayLiteralExpression(at) || at.elements.some(element => !ts.isStringLiteral(element))) return fail(at, "marks are string literals");
      read.marks = at.elements.flatMap(element => ts.isStringLiteral(element) ? [element.text] : []);
    } else if (name === "props" || name === "events" || name === "instance") {
      const object = schema(at);
      if (object.kind !== "object") return fail(at, `${name} is a Type.Object`);
      read[name] = { ...object.properties };
    } else return fail(field, `unknown contract field ${name}`);
  }
  return { binding, closed: true, props: read.props ?? {}, events: read.events ?? {}, instance: read.instance ?? {}, marks: read.marks ?? [] };
}
