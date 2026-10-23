import { fileURLToPath } from "node:url";
import ts from "typescript";
import { InteractionCatalog } from "../../interaction/catalog.ts";

export const dispatcherPath = "src/svelte/BankRenderer.svelte";
export const registryPath = "src/svelte/renderer-registry.ts";
export const contractPath = "src/svelte/renderer-contracts.ts";
export const requiredDispatcherSources = Object.freeze([dispatcherPath, registryPath, contractPath]);
export const dispatchKinds: ReadonlySet<string> = new Set(InteractionCatalog.entries.map(entry => entry.id));
type Source = Readonly<{ path: string; source: string }>;
type Fail = (reason: string) => never;
export function assertCompleteDispatcherSources(sources: readonly Source[]): void {
  for (const path of requiredDispatcherSources) if (!sources.some(source => source.path === path)) {
    throw new Error(`CLOSED_VISUAL_BOUNDARY: missing dispatcher source: ${path}`);
  }
}

/** Property names come from the actual owner types, not a handwritten second API. */
const cache = new Map<string, { inputs: Set<string>; entries: Map<string, Set<string>> }>();
export function dispatchTypes(source: string, fail: Fail) {
  const existing = cache.get(source);
  if (existing) return existing;
  const path = fileURLToPath(new URL("../../svelte/renderer-contracts.ts", import.meta.url));
  const options = { noEmit: true, skipLibCheck: true, module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext, allowImportingTsExtensions: true };
  const host = ts.createCompilerHost(options), read = host.readFile;
  host.readFile = name => name === path ? source : read(name);
  const program = ts.createProgram([path], options, host), checker = program.getTypeChecker();
  const file = program.getSourceFile(path)!;
  function named(name: string): ts.Type {
    const alias = file.statements.find(node => ts.isTypeAliasDeclaration(node) && node.name.text === name);
    if (!alias || !ts.isTypeAliasDeclaration(alias)) return fail(`missing owner type ${name}`);
    return checker.getTypeAtLocation(alias);
  }
  const inputs = new Set(checker.getPropertiesOfType(named("BankRendererProps")).map(property => property.name));
  const props = named("WebRendererProps"), entries = new Map<string, Set<string>>();
  for (const kind of dispatchKinds) {
    const property = checker.getPropertyOfType(props, kind);
    if (!property) fail(`missing typed owner ${kind}`);
    entries.set(kind, new Set(checker.getPropertiesOfType(checker.getTypeOfSymbolAtLocation(property, file))
      .map(property => property.name)));
  }
  const result = { inputs, entries };
  cache.set(source, result);
  return result;
}

export function assertRendererRegistry(source: string, fail: Fail): void {
  const file = ts.createSourceFile(registryPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports = new Set<string>();
  let bankType: string | undefined, initializer: ts.Expression | undefined;
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const from = statement.moduleSpecifier.text, clause = statement.importClause;
      if (clause?.isTypeOnly && from === "./renderer-contracts.ts" && clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const item of clause.namedBindings.elements) if ((item.propertyName ?? item.name).text === "WebRendererBank") bankType = item.name.text;
      } else if (clause?.name && !clause.namedBindings && from.startsWith("./") && from.endsWith(".svelte")) imports.add(clause.name.text);
      else fail("opaque registry import");
    } else if (ts.isVariableStatement(statement) && statement.declarationList.declarations.length === 1) {
      const node = statement.declarationList.declarations[0]!;
      if (initializer || !ts.isIdentifier(node.name) || node.name.text !== "webRenderers"
        || !node.type || !ts.isTypeReferenceNode(node.type) || node.type.typeName.getText(file) !== bankType) fail("untyped registry");
      initializer = node.initializer;
    } else fail("executable registry extension");
  }
  if (!initializer || !ts.isCallExpression(initializer) || initializer.expression.getText(file) !== "Object.freeze"
    || initializer.arguments.length !== 1) fail("mutable registry");
  const checked = initializer.arguments[0]!;
  if (!ts.isSatisfiesExpression(checked) || checked.type.getText(file) !== bankType || !ts.isObjectLiteralExpression(checked.expression)) fail("unchecked registry");
  const found = new Set<string>();
  for (const property of checked.expression.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.initializer) || !imports.has(property.initializer.text)) fail("foreign registry component");
    const key = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : "";
    if (!dispatchKinds.has(key) || found.has(key)) fail("noncanonical registry inventory");
    found.add(key);
  }
  if (found.size !== dispatchKinds.size) fail("incomplete registry");
}
