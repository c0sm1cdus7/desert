// Reads a piece contract (`<id>.contract.ts`) as data, like a declaration: the gate never evaluates an inspected tree.
// A contract is `export const <Name>Contract = {} as const` (a stub, before the piece is migrated) or
//   export const FieldContract = { props: Type.Object({...}), events: Type.Object({...}), marks: ["data-field-state"] } as const;
// written in a closed TypeBox subset: Object (closed), Literal, Union, Optional, Array, Record, Function, String, Number,
// Boolean, Integer, Null, and a reference to a TypeBox schema imported from a non-visual module (domain data such as a
// resolved node): the gate records its name, TypeScript types it. Domain data that has a TypeScript type but no schema is
// `Type.Unsafe<T>()`, where T only names types imported from non-visual tree modules (domain or src/svelte/infra) or TS utility
// types; open types (any, unknown, object, never), inline object/function types, typeof, packages and visual code are refused.
// Props may be exclusive variants (a Union of closed objects, Intersected with the shared closed object).
// `instance` lists the methods (required closed Type.Function members) a piece exposes to a caller that binds it (`bind:this`).
import { posix } from "node:path";
import ts from "typescript";
import type { CatalogLayout } from "./layout.ts";

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

const scalars: ReadonlyMap<string, "string" | "number" | "boolean" | "integer" | "null" | "void" | "undefined"> = new Map([
  ["String", "string"], ["Number", "number"], ["Boolean", "boolean"], ["Integer", "integer"], ["Null", "null"], ["Void", "void"], ["Undefined", "undefined"]]);
/** TypeScript's own utility types, which a typed reference may combine with imported types. */
const utilityTypes = new Set(["Pick", "Omit", "Partial", "Required", "Readonly", "ReadonlyArray", "Record", "ReturnType", "Parameters",
  "Awaited", "Extract", "Exclude", "NonNullable", "Promise", "Array"]);
const scalarTypes = new Set([ts.SyntaxKind.StringKeyword, ts.SyntaxKind.NumberKeyword, ts.SyntaxKind.BooleanKeyword, ts.SyntaxKind.BigIntKeyword,
  ts.SyntaxKind.UndefinedKeyword, ts.SyntaxKind.NullKeyword, ts.SyntaxKind.VoidKeyword]);

/** Where an import of a contract lands: a tree module (visual or not) or a package. */
export type ContractPlaces = Readonly<Pick<CatalogLayout, "aliases" | "roots" | "infra">>;
function resolveImport(contract: string, specifier: string, places: ContractPlaces): string | undefined {
  const alias = places.aliases.find(([prefix]) => specifier.startsWith(prefix));
  if (alias) return `${alias[1]}${specifier.slice(alias[0].length)}`;
  return specifier.startsWith(".") ? posix.normalize(posix.join(posix.dirname(contract), specifier)) : undefined;
}
/** Visual code is a Svelte component or any module under the visual roots except infra (nonvisual TypeScript, rule I). */
const visualModule = (module: string, places: ContractPlaces) => module.endsWith(".svelte")
  || places.roots.some(root => module.startsWith(`${root}/`)) && !module.startsWith(`${places.infra}/`);

export function readContract(path: string, source: string, places: ContractPlaces): ReadContract {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const fail = (node: ts.Node, what: string): never => {
    throw new Error(`CATALOG_DECLARATION: ${path}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}: ${what}`);
  };
  /** The tree module an imported name comes from: never a package, never visual code. */
  function treeModule(node: ts.Node, name: string, what: "schemas" | "types"): string {
    const specifier = imported.get(name);
    if (specifier === undefined) return fail(node, `${name} is not imported (a contract references imported ${what} only)`);
    const module = resolveImport(path, specifier, places);
    if (module === undefined) return fail(node, `${name} comes from the package ${specifier}; a contract references domain or infra ${what} of the tree only`);
    if (visualModule(module, places)) return fail(node, `${name} comes from visual code (${specifier}); a contract references domain or infra ${what} only`);
    return specifier;
  }
  /** A typed reference names types; it never spells one: no keyword escape, no inline object, function, typeof or mapped type. */
  function closedType(node: ts.TypeNode, modules: string[]): void {
    if (scalarTypes.has(node.kind) || ts.isLiteralTypeNode(node) || ts.isTemplateLiteralTypeNode(node)) return;
    if (ts.isTypeReferenceNode(node)) {
      const name = ts.isIdentifier(node.typeName) ? node.typeName.text : node.typeName.getText(file);
      if (imported.has(name)) modules.push(treeModule(node, name, "types"));
      else if (!utilityTypes.has(name)) fail(node, `${name} is neither imported from a module nor a standard utility type`);
      const [union, filter] = node.typeArguments ?? [];
      if (!imported.has(name) && (name === "Extract" || name === "Exclude") && union && filter && ts.isTypeLiteralNode(filter)) {
        closedType(union, modules);
        return discriminant(filter);
      }
      for (const argument of node.typeArguments ?? []) closedType(argument, modules);
      return;
    }
    if (ts.isIndexedAccessTypeNode(node)) { closedType(node.objectType, modules); closedType(node.indexType, modules); return; }
    if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) { for (const member of node.types) closedType(member, modules); return; }
    if (ts.isArrayTypeNode(node)) return closedType(node.elementType, modules);
    if (ts.isTupleTypeNode(node)) { for (const element of node.elements) closedType(ts.isNamedTupleMember(element) ? element.type : element, modules); return; }
    if (ts.isParenthesizedTypeNode(node)) return closedType(node.type, modules);
    if (ts.isTypeOperatorNode(node) && node.operator !== ts.SyntaxKind.UniqueKeyword) return closedType(node.type, modules);
    const open = node.kind === ts.SyntaxKind.AnyKeyword ? "any" : node.kind === ts.SyntaxKind.UnknownKeyword ? "unknown"
      : node.kind === ts.SyntaxKind.ObjectKeyword ? "object" : node.kind === ts.SyntaxKind.NeverKeyword ? "never" : undefined;
    fail(node, open ? `Type.Unsafe holds the open type ${open}; name a domain or infra type`
      : `Type.Unsafe holds ${ts.SyntaxKind[node.kind]} (${node.getText(file)}); name a domain or infra type instead of spelling one`);
  }
  /** `Extract<Union, { kind: "form" }>` narrows a union by literal discriminants; that filter is the one inline object allowed. */
  function discriminant(filter: ts.TypeLiteralNode): void {
    for (const member of filter.members) {
      if (!ts.isPropertySignature(member) || member.questionToken || !member.type
        || !(ts.isLiteralTypeNode(member.type) || ts.isTemplateLiteralTypeNode(member.type))) {
        fail(member, `an Extract or Exclude filter holds literal discriminants only (${member.getText(file)})`);
      }
    }
  }
  const call = (node: ts.Expression) => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Type" ? { name: node.expression.name.text, node } : undefined;
  function schema(node: ts.Expression): ContractSchema {
    if (ts.isIdentifier(node)) return { kind: "reference", name: node.text, from: treeModule(node, node.text, "schemas") };
    const found = call(node);
    if (!found) return fail(node, "a contract schema is a Type.* call of the closed subset or an imported schema");
    const [first] = found.node.arguments;
    const scalar = scalars.get(found.name);
    if (scalar) return { kind: scalar };
    if (found.name === "Literal" && first && (ts.isStringLiteral(first) || ts.isNumericLiteral(first) || first.kind === ts.SyntaxKind.TrueKeyword || first.kind === ts.SyntaxKind.FalseKeyword)) {
      return { kind: "literal", value: ts.isStringLiteral(first) ? first.text : ts.isNumericLiteral(first) ? Number(first.text) : first.kind === ts.SyntaxKind.TrueKeyword };
    }
    if (found.name === "Union" && first && ts.isArrayLiteralExpression(first)) return { kind: "union", members: first.elements.map(schema) };
    if (found.name === "Array" && first) return { kind: "array", items: schema(first) };
    if (found.name === "Unsafe") {
      const [argument] = found.node.typeArguments ?? [];
      if (!argument || found.node.arguments.length) return fail(node, "Type.Unsafe takes one type argument and no schema: Type.Unsafe<DomainType>()");
      const modules: string[] = [];
      closedType(argument, modules);
      return { kind: "typed", name: argument.getText(file), from: modules[0] ?? "" };
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
  /** Props are one closed object, or exclusive variants: `Type.Union` of closed objects, optionally `Type.Intersect`ed with
   * the closed object every variant shares. The read view lists every prop once; a prop missing from a variant is optional. */
  function pieceProps(node: ts.Expression): Record<string, ContractProperty> {
    const found = call(node), [first] = found?.node.arguments ?? [];
    if (found?.name === "Intersect" && first && ts.isArrayLiteralExpression(first)) {
      const result: Record<string, ContractProperty> = {};
      for (const part of first.elements) for (const [key, item] of Object.entries(pieceProps(part))) {
        if (key in result) return fail(part, `prop ${key} is declared by two parts of the intersection`);
        result[key] = item;
      }
      return result;
    }
    if (found?.name === "Union" && first && ts.isArrayLiteralExpression(first) && first.elements.length > 1) {
      const variants = first.elements.map(pieceProps), result: Record<string, ContractProperty> = {};
      for (const key of new Set(variants.flatMap(Object.keys))) {
        const items = variants.map(variant => variant[key]);
        const schemas = items.flatMap(item => item ? [item.schema] : []);
        const members = [...new Map(schemas.flatMap(item => item.kind === "union" ? item.members : [item])
          .map(member => [JSON.stringify(member), member])).values()];
        result[key] = { schema: members.length === 1 && members[0] ? members[0] : { kind: "union", members },
          optional: items.some(item => !item || item.optional) };
      }
      return result;
    }
    const object = schema(node);
    if (object.kind !== "object") return fail(node, "props is a Type.Object, a Type.Union of them, or a Type.Intersect of those");
    return { ...object.properties };
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
    } else if (name === "props") read.props = pieceProps(at);
    else if (name === "events" || name === "instance") {
      const object = schema(at);
      if (object.kind !== "object") return fail(at, `${name} is a Type.Object`);
      if (name === "instance") for (const [member, item] of Object.entries(object.properties)) {
        if (item.optional || item.schema.kind !== "function") return fail(at, `instance member ${member} is a required Type.Function; a bound piece exposes methods only`);
      }
      read[name] = { ...object.properties };
    } else return fail(field, `unknown contract field ${name}`);
  }
  return { binding, closed: true, props: read.props ?? {}, events: read.events ?? {}, instance: read.instance ?? {}, marks: read.marks ?? [] };
}

/** The contract file of a declared piece: `<id>.contract.ts` beside its declaration. One place for that path, for every reader. */
export const contractPath = (declaration: string, id: string) => posix.join(posix.dirname(declaration), `${id}.contract.ts`);
