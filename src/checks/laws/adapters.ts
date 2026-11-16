// Law 10: external I/O belongs to the declared infrastructure and composition.
import ts from "typescript";
import { codeFiles, fromRoot, isSpec, parsed, staleExemptions, type Repository, type Exemptions } from "./law-files.ts";

const isTypeOnly = (node: ts.ImportDeclaration | ts.ExportDeclaration): boolean =>
  ts.isImportDeclaration(node) ? node.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword : node.isTypeOnly;

/** Every module specifier a file imports or re-exports, static or dynamic; with `values`, only what runs. */
export function importsOf(path: string, values: boolean): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    const isImport = ts.isImportDeclaration(node) || ts.isExportDeclaration(node);
    const counts = isImport && !(values && isTypeOnly(node));
    if (counts && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      found.push(node.moduleSpecifier.text);
    }
    const isDynamic = ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword;
    const [specifier] = isDynamic ? node.arguments : [];
    if (specifier && ts.isStringLiteral(specifier)) found.push(specifier.text);
    ts.forEachChild(node, visit);
  };
  visit(parsed(path));
  return found;
}

const outside = [
  "child_process",
  "net",
  "http",
  "https",
  "http2",
  "tls",
  "dgram",
  "dns",
  "fs",
  "os",
  "sqlite",
  "ws",
  "undici",
];
const talksOutside = (specifier: string): boolean =>
  outside.includes(specifier.replace(/^node:/, "").split("/")[0] ?? "");

const network = ["fetch", "WebSocket", "XMLHttpRequest", "EventSource"];
const globalObjects = ["globalThis", "global", "self", "window"];

const isOwnName = (node: ts.Identifier): boolean => {
  const parent = node.parent;
  const named =
    ts.isPropertyAccessExpression(parent) ||
    ts.isPropertyAssignment(parent) ||
    ts.isPropertyDeclaration(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isMethodSignature(parent);
  if (!named || parent.name !== node) return false;
  return !ts.isPropertyAccessExpression(parent) || !globalObjects.includes(parent.expression.getText());
};

/** Every reference to a global that talks to the network: `fetch`, `globalThis.fetch`, `globalThis["fetch"]`… */
export const networkGlobalsIn = (source: ts.SourceFile): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && network.includes(node.text) && !isOwnName(node)) found.push(node.getText());
    const key = ts.isElementAccessExpression(node) ? node.argumentExpression : undefined;
    if (key && ts.isStringLiteralLike(key) && network.includes(key.text)) found.push(node.getText());
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

export type OutsideOptions = Readonly<{ mayTalkOutside: Exemptions }>;
const outsideFiles = (repo: Repository, options: OutsideOptions): string[] =>
  codeFiles(repo).filter(
    file =>
      !isSpec(file) &&
      !Object.keys(options.mayTalkOutside).some(path =>
        path.endsWith("/") ? fromRoot(repo.root, file).startsWith(path) : fromRoot(repo.root, file) === path,
      ),
  );

export function outsideAccess(repo: Repository, options: OutsideOptions): string[] {
  const files = outsideFiles(repo, options);
  return [
    ...staleExemptions(repo, options.mayTalkOutside),
    ...files.flatMap(file =>
      importsOf(file, true)
        .filter(talksOutside)
        .map(specifier => `${fromRoot(repo.root, file)} → ${specifier}`),
    ),
  ];
}

export function outsideGlobals(repo: Repository, options: OutsideOptions): string[] {
  const files = outsideFiles(repo, options);
  return [
    ...staleExemptions(repo, options.mayTalkOutside),
    ...files.flatMap(file => networkGlobalsIn(parsed(file)).map(use => `${fromRoot(repo.root, file)}: ${use}`)),
  ];
}
