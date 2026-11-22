// Separates declared device folders from house code and admits only pure shared dependency graphs.
import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import ts from "typescript";
import { field } from "../../fields/json-values.ts";
import { distributionTexts } from "../../texts/distributions.texts.ts";
import { importsIn } from "./imports.ts";
import { parsed, type Repository } from "./law-files.ts";

const within = (folder: string, file: string): boolean => file.startsWith(`${folder}${sep}`);
export function deviceFiles(repo: Repository, desert: unknown, own: ReadonlySet<string>): ReadonlySet<string> {
  const declaration = field(desert, "device");
  if (declaration === undefined) return new Set();
  const fail = (): never => {
    throw new Error(distributionTexts.deviceDeclaration);
  };
  if (!Array.isArray(declaration) || !declaration.length) return fail();
  const root = realpathSync(repo.root);
  const entry = field(desert, "program");
  if (typeof entry !== "string" || !existsSync(resolve(root, entry))) return fail();
  const main = realpathSync(resolve(root, entry));
  const folders: string[] = [];
  for (const path of declaration) {
    if (
      typeof path !== "string" ||
      !path ||
      isAbsolute(path) ||
      path.includes("\\") ||
      path.split("/").some(part => !part || part === "." || part === "..")
    )
      return fail();
    const target = resolve(root, path);
    if (!existsSync(target) || !statSync(target).isDirectory()) return fail();
    const folder = realpathSync(target);
    if (
      !within(root, folder) ||
      within(folder, main) ||
      !repo.code.some(code => folder === resolve(root, code) || within(resolve(root, code), folder)) ||
      ![...own].some(file => within(folder, file)) ||
      folders.some(other => folder === other || within(other, folder) || within(folder, other))
    )
      return fail();
    folders.push(folder);
  }
  return new Set([...own].filter(file => folders.some(folder => within(folder, file))));
}

// Shared schemas may use Type/Static, but cannot construct a house program or smuggle a device capability back.
function pureProgramEntry(source: ts.SourceFile): boolean {
  return source.statements.every(node => {
    if (ts.isImportEqualsDeclaration(node)) return node.isTypeOnly;
    if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) return true;
    if (
      !node.moduleSpecifier ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      node.moduleSpecifier.text !== "desert/program"
    )
      return true;
    if (ts.isImportDeclaration(node) ? node.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword : node.isTypeOnly)
      return true;
    const bindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : node.exportClause;
    if (ts.isImportDeclaration(node) && node.importClause?.name) return false;
    return (
      bindings !== undefined &&
      (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) &&
      bindings.elements.every(
        binding => binding.isTypeOnly || ["Type", "Static"].includes((binding.propertyName ?? binding.name).text),
      )
    );
  });
}
function propertyName(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    (ts.isPropertyAccessExpression(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isMethodSignature(parent)) &&
    parent.name === node
  );
}
function pureGlobals(source: ts.SourceFile): boolean {
  let pure = true;
  const visit = (node: ts.Node): void => {
    if (
      ts.isMetaProperty(node) ||
      (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) ||
      (ts.isIdentifier(node) &&
        !propertyName(node) &&
        [
          "process",
          "globalThis",
          "global",
          "window",
          "self",
          "fetch",
          "WebSocket",
          "XMLHttpRequest",
          "EventSource",
          "eval",
          "Function",
          "require",
        ].includes(node.text))
    )
      pure = false;
    ts.forEachChild(node, visit);
  };
  visit(source);
  return pure;
}
export function pureShared(own: ReadonlySet<string>, devices: ReadonlySet<string>, main: string) {
  return (file: string): boolean => {
    const seen = new Set<string>();
    const inspect = (target: string): boolean => {
      if (!existsSync(target)) return false;
      target = realpathSync(target);
      if (!own.has(target) || devices.has(target) || target === main) return false;
      if (seen.has(target)) return true;
      seen.add(target);
      const source = parsed(target);
      return (
        pureGlobals(source) &&
        pureProgramEntry(source) &&
        importsIn(source).every(specifier => {
          if (specifier.startsWith(".")) return inspect(resolve(dirname(target), specifier));
          return (
            ["desert/program", "desert/messages", "desert/fields", "desert/program-types"].includes(specifier) ||
            /^desert\/fields\/[a-z][a-z0-9-]*$/u.test(specifier)
          );
        })
      );
    };
    return inspect(file);
  };
}
