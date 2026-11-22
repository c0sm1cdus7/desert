// Traces executable references from public values without evaluating their declarations.
import { join, relative } from "node:path";
import ts from "typescript";

const hostNames = new Set([
  "startHouse",
  "localPorts",
  "maintainHouseCustody",
  "startCloudHouse",
  "environmentDoorKeys",
  "mcpDoor",
  "serveMcp",
  "houseRouter",
  "houseTools",
  "startRouter",
  "startTerminal",
  "compose",
  "startTools",
  "startClock",
  "createHouse",
  "MemoryHouseKeys",
]);
const hostFolders = [
  "runtime/",
  "doors/",
  "keychain/",
  "storage/",
  "adapters/",
  "checks/",
  "surface/bridge/assembly/",
  "surface/router/",
];

/** One traversal per export: cycles terminate, while separate exported paths keep their diagnostics. */
export class EntryValues {
  private readonly symbols = new Set<ts.Symbol>();
  private readonly nodes = new Set<ts.Node>();
  private readonly checker: ts.TypeChecker;
  private readonly base: string;
  private readonly report: (path: string) => void;
  constructor(checker: ts.TypeChecker, base: string, report: (path: string) => void) {
    this.checker = checker;
    this.base = base;
    this.report = report;
  }

  symbol(symbol: ts.Symbol, path: string): void {
    if (this.symbols.has(symbol) || this.checker.isUndefinedSymbol(symbol)) return;
    this.symbols.add(symbol);
    if (symbol.flags & ts.SymbolFlags.Alias) {
      this.symbol(this.checker.getAliasedSymbol(symbol), path);
      return;
    }
    if (!symbol.declarations?.length) {
      this.report(`${path} → cannot inspect export: ${symbol.name}`);
      return;
    }
    if (!(symbol.flags & ts.SymbolFlags.Value)) return;
    for (const declaration of symbol.declarations) this.declaration(symbol, declaration, path);
    if (symbol.flags & ts.SymbolFlags.Module)
      for (const member of this.checker.getExportsOfModule(symbol)) this.symbol(member, `${path}.${member.name}`);
  }

  private declaration(symbol: ts.Symbol, declaration: ts.Declaration, path: string): void {
    const source = declaration.getSourceFile();
    const origin = relative(join(this.base, "src"), source.fileName);
    if (hostNames.has(symbol.name) || hostFolders.some(folder => origin.startsWith(folder))) {
      this.report(`${path} → ${origin}:${symbol.name}`);
      return;
    }
    if (source.isDeclarationFile) {
      if (["eval", "Function", "require"].includes(symbol.name))
        this.report(`${path} → cannot inspect dynamic code: ${symbol.name}`);
      return;
    }
    if (ts.isSourceFile(declaration)) return;
    if (ts.isBindingElement(declaration)) this.binding(declaration, path);
    else this.node(declaration, path);
  }

  private binding(binding: ts.BindingElement, path: string): void {
    let owner: ts.Node = binding.parent;
    while (ts.isBindingElement(owner) || ts.isObjectBindingPattern(owner) || ts.isArrayBindingPattern(owner))
      owner = owner.parent;
    this.node(owner, `${path} → destructuring`);
  }

  private node(node: ts.Node, path: string): void {
    if (this.nodes.has(node)) return;
    this.nodes.add(node);
    if (ts.isExpressionWithTypeArguments(node)) {
      if (!ts.isHeritageClause(node.parent) || node.parent.token !== ts.SyntaxKind.ImplementsKeyword)
        this.node(node.expression, path);
      return;
    }
    if (ts.isTypeNode(node) || ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isIdentifier(node)) {
      this.identifier(node, path);
      return;
    }
    if (ts.isShorthandPropertyAssignment(node)) {
      const value = this.checker.getShorthandAssignmentValueSymbol(node);
      if (value) this.symbol(value, `${path}.${node.name.text}`);
      else this.report(`${path} → cannot inspect shorthand: ${node.name.text}`);
    }
    const step = this.step(node, path);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
      this.report(`${step} → cannot inspect dynamic import`);
    ts.forEachChild(node, child => this.node(child, step));
  }

  private identifier(node: ts.Identifier, path: string): void {
    const parent = node.parent;
    if (ts.isShorthandPropertyAssignment(parent)) return;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return;
    if ("name" in parent && parent.name === node) return;
    if (ts.isLabeledStatement(parent) || ts.isBreakOrContinueStatement(parent)) return;
    const symbol = this.checker.getSymbolAtLocation(node);
    if (symbol) this.symbol(symbol, `${path} → ${node.text}`);
    else this.report(`${path} → cannot resolve value: ${node.text}`);
  }

  private step(node: ts.Node, path: string): string {
    if (!ts.isExpression(node) || ts.isIdentifier(node) || ts.isLiteralExpression(node)) return path;
    const source = node.getSourceFile();
    const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    return `${path} → ${ts.SyntaxKind[node.kind]}@${relative(join(this.base, "src"), source.fileName)}:${line}`;
  }
}
