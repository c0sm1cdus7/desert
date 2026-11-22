import { realpathSync } from "node:fs";
import ts from "typescript";
/** One file reached through a link and by its own path is the same constructor. */
const sameFile = (a: string, b: string): boolean => a === b || realpathSync(a) === realpathSync(b);
function unwrapped(node: ts.Node): ts.Node {
  if (ts.isVariableDeclaration(node) && node.initializer) return unwrapped(node.initializer);
  if (ts.isPropertyAssignment(node)) return unwrapped(node.initializer);
  if (ts.isExportAssignment(node)) return unwrapped(node.expression);
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isTypeAssertionExpression(node)
  )
    return unwrapped(node.expression);
  return node;
}
class RegistryTrace {
  readonly found = new Set<string>();
  readonly checker: ts.TypeChecker;
  readonly privileged: ReadonlySet<string>;
  constructor(program: ts.Program, privileged: ReadonlySet<string>) {
    this.checker = program.getTypeChecker();
    this.privileged = privileged;
  }
  fail(node: ts.Node, why: string): void {
    this.found.add(`${node.getSourceFile().fileName}: ${why}`);
  }
  declarations(item: ts.Symbol): readonly ts.Declaration[] {
    return (item.flags & ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol(item) : item).declarations ?? [];
  }
  values(node: ts.Node): readonly ts.Declaration[] {
    const item = ts.isShorthandPropertyAssignment(node)
      ? this.checker.getShorthandAssignmentValueSymbol(node)
      : this.checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node) ? node.name : node);
    return item ? this.declarations(item) : [];
  }
  origin(input: ts.Node, seen = new Set<ts.Node>()): void {
    const node = unwrapped(input);
    if (seen.has(node)) return this.fail(node, "unresolved registry cycle");
    seen.add(node);
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node) || ts.isShorthandPropertyAssignment(node)) {
      const values = this.values(node);
      if (values.length) {
        values.forEach(value => this.origin(value, new Set(seen)));
        return;
      }
    }
    if (ts.isCallExpression(node)) {
      const declaration = this.checker.getResolvedSignature(node)?.declaration;
      if (declaration && !declaration.getSourceFile().isDeclarationFile) {
        if (this.privileged.has(declaration.getSourceFile().fileName))
          return this.fail(declaration, "tool factory belongs to composition or adapters");
        return this.factory(declaration, seen);
      }
    }
    if (ts.isObjectLiteralExpression(node) || ts.isCallExpression(node)) {
      if (this.privileged.has(node.getSourceFile().fileName))
        this.fail(node, "tool belongs to composition or adapters");
      return;
    }
    this.fail(node, "cannot trace registered tool");
  }
  factory(
    declaration: ts.Node,
    seen: Set<ts.Node>,
    follow = (value: ts.Node, path: Set<ts.Node>) => this.origin(value, path),
  ): void {
    if (
      !ts.isArrowFunction(declaration) &&
      !ts.isFunctionExpression(declaration) &&
      !ts.isFunctionDeclaration(declaration) &&
      !ts.isMethodDeclaration(declaration)
    )
      return this.fail(declaration, "cannot trace tool factory");
    const body = declaration.body;
    if (!body) return this.fail(declaration, "missing tool factory body");
    if (!ts.isBlock(body)) return follow(body, new Set(seen));
    const returns: ts.Expression[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isFunctionLike(node)) return;
      if (ts.isReturnStatement(node) && node.expression) returns.push(node.expression);
      ts.forEachChild(node, visit);
    };
    visit(body);
    if (!returns.length) this.fail(declaration, "cannot trace tool factory return");
    returns.forEach(value => follow(value, new Set(seen)));
  }
  registry(input: ts.Node, seen = new Set<ts.Node>()): void {
    const node = unwrapped(input);
    if (seen.has(node)) return this.fail(node, "unresolved registry");
    seen.add(node);
    if (ts.isPropertyAssignment(node)) return this.registry(node.initializer, seen);
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach(element =>
        ts.isSpreadElement(element) ? this.registry(element.expression, new Set(seen)) : this.origin(element),
      );
      return;
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "freeze" &&
      node.arguments.length === 1
    ) {
      const declarations = this.values(node.expression.expression);
      const standard =
        declarations.length &&
        declarations.every(
          value =>
            value.getSourceFile().isDeclarationFile &&
            /(?:^|[\\/])lib\..*\.d\.ts$/u.test(value.getSourceFile().fileName),
        );
      const argument = node.arguments[0];
      if (standard && argument) return this.registry(argument, seen);
    }
    const values = this.values(node);
    if (values.length) {
      values.forEach(value => this.registry(value, new Set(seen)));
      return;
    }
    this.fail(node, "cannot trace registry");
  }
  composition(input: ts.Node, seen = new Set<ts.Node>()): void {
    const node = unwrapped(input);
    if (seen.has(node)) return this.fail(node, "cannot trace composition registry");
    seen.add(node);
    if (ts.isObjectLiteralExpression(node)) {
      const property = node.properties.find(
        item => item.name && ts.isIdentifier(item.name) && item.name.text === "registry",
      );
      if (property) return this.registry(property);
      const spread = node.properties.filter(ts.isSpreadAssignment).at(-1);
      if (spread) return this.composition(spread.expression, seen);
      return this.fail(node, "cannot trace composition registry");
    }
    if (ts.isCallExpression(node)) {
      const declaration = this.checker.getResolvedSignature(node)?.declaration;
      if (declaration && !declaration.getSourceFile().isDeclarationFile)
        return this.factory(declaration, seen, (value, path) => this.composition(value, path));
    }
    const values = this.values(node);
    if (values.length) return values.forEach(value => this.composition(value, new Set(seen)));
    this.fail(node, "cannot trace composition registry");
  }
  installable(input: ts.Node, constructor: string, seen = new Set<ts.Node>()): void {
    const node = unwrapped(input);
    if (seen.has(node)) return this.fail(node, "cannot trace installable program");
    seen.add(node);
    if (ts.isCallExpression(node)) {
      const declaration = this.checker.getResolvedSignature(node)?.declaration;
      if (declaration && sameFile(declaration.getSourceFile().fileName, constructor) && node.arguments[1])
        return this.groups(node.arguments[1], "tools");
      return this.fail(node, "unrecognized program constructor");
    }
    const values = this.values(node);
    if (values.length) return values.forEach(value => this.installable(value, constructor, new Set(seen)));
    this.fail(node, "cannot trace installable program");
  }
  groups(input: ts.Node, property?: string, seen = new Set<ts.Node>()): void {
    const node = unwrapped(input);
    if (seen.has(node)) return this.fail(node, "cannot trace program tools");
    seen.add(node);
    if (ts.isObjectLiteralExpression(node)) {
      if (property) {
        const entry = node.properties.find(item => item.name?.getText() === property);
        if (entry) return this.groups(entry);
        const spread = node.properties.filter(ts.isSpreadAssignment).at(-1);
        if (spread) return this.groups(spread.expression, property, seen);
        return this.fail(node, "missing program tools");
      }
      node.properties.forEach(item =>
        ts.isSpreadAssignment(item) ? this.groups(item.expression, undefined, new Set(seen)) : this.origin(item),
      );
      return;
    }
    const values = this.values(node);
    if (values.length) return values.forEach(value => this.groups(value, property, new Set(seen)));
    this.fail(node, "cannot trace program tools");
  }
  tools(source: ts.SourceFile): void {
    const visit = (node: ts.Node): void => {
      if (ts.isObjectLiteralExpression(node)) {
        const type = this.checker.getTypeAtLocation(node);
        if (type.getProperty("acts") || type.getProperty("run"))
          this.fail(node, "separate tool declarations from composition and adapters");
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}
/** Trace registry values without executing code; composition is trusted, not protected against later mutation. */
export function registryOrigins(
  program: ts.Program,
  main: string,
  privileged: ReadonlySet<string>,
  constructor?: string,
): string[] {
  const trace = new RegistryTrace(program, privileged);
  const source = program.getSourceFile(main);
  if (!source) return [`${main}: missing composition`];
  const symbol = trace.checker.getSymbolAtLocation(source);
  const exported = symbol && trace.checker.getExportsOfModule(symbol).find(item => item.name === "program");
  if (!exported) trace.fail(source, "missing exported program");
  for (const declaration of exported ? trace.declarations(exported) : [])
    if (constructor) trace.installable(declaration, constructor);
    else trace.composition(declaration);
  for (const file of privileged) {
    const source = program.getSourceFile(file);
    if (source) trace.tools(source);
  }
  return [...trace.found];
}
