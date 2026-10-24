// Law: a piece part and a vendor family are imported only by their owner, vendor code imports only vendor code, a
// composition or infra module imports only nonvisual packages (visual packages belong to foundations and their vendor
// families), and a foundation entry takes exactly CatalogProps<"<id>">.
// Raises FOUNDATION_OUTSIDE_OWNER, VENDOR_OUTSIDE_OWNER, FOUNDATION_PROPS.
import { posix } from "node:path";
import ts from "typescript";
import { walk, type SyntaxNode } from "./walk.ts";
import type { ContentRule, GateContext } from "./context.ts";
import { scriptLine, type Parsed } from "./parse.ts";
import { componentDefinition } from "./presentation.ts";
import type { Import } from "./resolve-imports.ts";
import { nonvisualFramework, nonvisualPackages } from "./runtime-globals.ts";
import { violation, type Violation } from "./violation.ts";

const inside = (path: string, folder: string) => path.startsWith(`${folder}/`);

/** The files an import reaches: its target, and the file defining each imported binding through every barrel. */
function reached(context: GateContext, item: Import): string[] {
  if (item.target.kind !== "file") return [];
  const files = new Set([item.target.path]);
  for (const binding of item.bindings) if (binding.imported !== "*") {
    const file = context.definition(item, binding.imported);
    if (file) files.add(file);
  }
  return [...files];
}

const familyOf = (context: GateContext, path: string) =>
  inside(path, context.layout.vendorFamilies) ? path.slice(context.layout.vendorFamilies.length + 1).split("/")[0] : undefined;
const foundationFolder = (context: GateContext, id: string) => {
  const located = context.owners.declaration(id);
  return located && posix.dirname(located.path);
};

function partEscape(context: GateContext, importer: string, file: string): string | undefined {
  const owner = context.owners.of(file);
  if (owner?.kind !== "piece" || owner.role !== "part" || inside(importer, owner.folder)) return undefined;
  return `imports ${posix.basename(file)}, a part of ${owner.pieceKind} ${owner.id}, from outside its folder`;
}

function vendorEscape(context: GateContext, importer: string, file: string): string | undefined {
  const family = familyOf(context, file), importerFamily = familyOf(context, importer);
  if (family === undefined) {
    const owner = context.owners.of(file), vendorCode = owner?.kind === "vendor" || owner?.kind === "fixed" && owner.category === "vendor-shared";
    return importerFamily !== undefined && !vendorCode ? `vendor family ${importerFamily} imports ${file}, which is not vendor code` : undefined;
  }
  if (family === importerFamily) return undefined;
  const owner = context.owners.of(file);
  if (owner?.kind !== "vendor") return `imports vendor family ${family}, which no foundation owns`;
  const importerOwner = context.owners.of(importer), folder = foundationFolder(context, owner.foundation);
  if (folder !== undefined && inside(importer, folder)) return undefined;
  if (importerOwner?.kind === "vendor" && importerOwner.foundation === owner.foundation) return undefined;
  return `imports vendor family ${family}, owned by foundation ${owner.foundation}`;
}

/** A package a composition or infra module may not import: not a nonvisual package, or Svelte beyond lifecycle and context. */
function packageEscape(context: GateContext, importer: string, item: Import): string | undefined {
  const owner = context.owners.of(importer);
  const bound = owner?.kind === "infra" || owner?.kind === "piece" && owner.pieceKind === "composition" && owner.role !== "companion";
  if (!bound || item.target.kind !== "package" || item.typeOnly) return undefined;
  const name = item.target.name, who = owner.kind === "infra" ? "an infra module" : `composition ${owner.id}`;
  if (!nonvisualPackages.has(name)) return `${who} imports the package ${name}: visual packages belong to a foundation`;
  const visual = name === "svelte" ? item.bindings.filter(binding => !nonvisualFramework.has(binding.imported)).map(binding => binding.imported) : [];
  return visual.length ? `${who} imports ${visual.join(", ")} from svelte: only its lifecycle and context functions` : undefined;
}

function importEscapes(context: GateContext, path: string): Violation[] {
  const found: Violation[] = [];
  for (const item of context.imports(path)) {
    const packaged = packageEscape(context, path, item);
    if (packaged !== undefined) found.push(violation("VENDOR_OUTSIDE_OWNER", path, item.line, packaged));
    const seen = new Set<string>();
    for (const file of reached(context, item)) {
      const escapes = [["FOUNDATION_OUTSIDE_OWNER", partEscape(context, path, file)], ["VENDOR_OUTSIDE_OWNER", vendorEscape(context, path, file)]] as const;
      for (const [code, what] of escapes) {
        if (what === undefined || seen.has(what)) continue;
        seen.add(what);
        found.push(violation(code, path, item.line, what));
      }
    }
  }
  return found;
}

/** `let { ... }: CatalogProps<"<id>"> = $props()`: destructured without rest, typed by the generated props of this piece. */
function isCatalogProps(declaration: ts.VariableDeclaration, id: string): boolean {
  const { name, type } = declaration, list = declaration.parent;
  if (!ts.isObjectBindingPattern(name) || name.elements.some(element => element.dotDotDotToken)) return false;
  if (!ts.isVariableDeclarationList(list) || !(list.flags & ts.NodeFlags.Let)) return false;
  if (!type || !ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName) || type.typeName.text !== "CatalogProps") return false;
  const [argument, ...rest] = type.typeArguments ?? [];
  return rest.length === 0 && argument !== undefined && ts.isLiteralTypeNode(argument) && ts.isStringLiteral(argument.literal) && argument.literal.text === id;
}

const isPropsCall = (node: ts.Expression | undefined) => node !== undefined && ts.isCallExpression(node)
  && ts.isIdentifier(node.expression) && node.expression.text === "$props";

function propsEscapes(context: GateContext, path: string, id: string): Violation[] {
  if (context.text(path) === undefined) return [];
  const parsed = context.parsed(path), found: Violation[] = [];
  for (const script of parsed.scripts) {
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && isPropsCall(node.initializer) && !isCatalogProps(node, id)) {
        found.push(violation("FOUNDATION_PROPS", path, scriptLine(parsed, script, node),
          `props of foundation ${id} are not \`let { ... }: CatalogProps<"${id}"> = $props()\``));
      }
      ts.forEachChild(node, visit);
    };
    visit(script.file);
  }
  return found;
}

/** Spreads of a script-level binding (a props bag); a snippet parameter or an inline object is not forwarding. */
const field = (value: unknown, key: string): unknown => value && typeof value === "object" ? Reflect.get(value, key) : undefined;
const forwarded = (node: SyntaxNode, names: ReadonlySet<string>): SyntaxNode[] => {
  const attributes: unknown = node.attributes;
  if (!Array.isArray(attributes)) return [];
  return attributes.filter((item: unknown): item is SyntaxNode => field(item, "type") === "SpreadAttribute"
    && field(field(item, "expression"), "type") === "Identifier" && names.has(String(field(field(item, "expression"), "name"))));
};

function scriptNames(parsed: Parsed): ReadonlySet<string> {
  const names = new Set<string>();
  const bind = (name: ts.BindingName): void => {
    if (ts.isIdentifier(name)) names.add(name.text);
    else for (const element of name.elements) if (!ts.isOmittedExpression(element)) bind(element.name);
  };
  for (const { file } of parsed.scripts) for (const statement of file.statements) {
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) bind(declaration.name);
  }
  return names;
}

function forwardedSpreads(context: GateContext, path: string): Violation[] {
  const parsed = context.parsed(path), found: Violation[] = [];
  if (parsed.kind !== "svelte") return found;
  const names = scriptNames(parsed);
  walk(parsed.fragment, (node: SyntaxNode) => {
    if (node.type !== "Component" || typeof node.name !== "string") return;
    const file = componentDefinition(context, path, node.name), family = file === undefined ? undefined : familyOf(context, file);
    if (family !== undefined) for (const attribute of forwarded(node, names)) {
      const spread = parsed.source.slice(attribute.start ?? 0, attribute.end ?? 0);
      found.push(violation("FOUNDATION_PROPS", path, parsed.line(node.start ?? 0), `<${node.name}> forwards ${spread} onto vendor family ${family}`));
    }
  });
  return found;
}

export const ruleF: ContentRule = context => {
  const found: Violation[] = [];
  for (const path of context.paths) {
    found.push(...importEscapes(context, path));
    const owner = context.owners.of(path);
    if (owner?.kind !== "piece" || owner.pieceKind !== "foundation" || !path.endsWith(".svelte")) continue;
    if (owner.role === "entry") found.push(...propsEscapes(context, path, owner.id));
    found.push(...forwardedSpreads(context, path));
  }
  return found;
};
