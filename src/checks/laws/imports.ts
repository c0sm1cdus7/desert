// Law 2: explicit dependencies and isolated adapters, including type queries and require.
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import ts from "typescript";
import { field } from "../../fields/json-values.ts";
import { codeFiles, fromRoot, isSpec, parsed, staleExemptions, type Repository, type Exemptions } from "./law-files.ts";
export type ImportOptions = Readonly<{
  base: string | null;
  adapters: readonly string[];
  adapterUsers: Exemptions;
}>;
const within = (folder: string, file: string): boolean => file.startsWith(`${folder}${sep}`);
export const importsIn = (source: ts.SourceFile): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    let value: ts.Node | undefined;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) value = node.moduleSpecifier;
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) value = node.argument.literal;
    if (ts.isExternalModuleReference(node)) value = node.expression;
    if (ts.isCallExpression(node) && ["import", "require", "require.resolve"].includes(node.expression.getText())) {
      value = node.arguments[0];
    }
    if (value) found.push(ts.isStringLiteralLike(value) ? value.text : "<dynamic>");
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

const targetOf = (repo: Repository, options: ImportOptions, file: string, specifier: string): string | undefined => {
  const config: unknown = ts.readConfigFile(join(repo.root, "tsconfig.json"), path => ts.sys.readFile(path)).config;
  const compiler = ts.convertCompilerOptionsFromJson(field(config, "compilerOptions") ?? {}, repo.root).options;
  const resolved = ts.resolveModuleName(specifier, file, compiler, ts.sys).resolvedModule?.resolvedFileName;
  if (resolved) return resolved;
  if (options.base && specifier.startsWith("#desert/"))
    return resolve(repo.root, options.base, "src", specifier.slice(8));
  return specifier.startsWith(".") || isAbsolute(specifier) ? resolve(dirname(file), specifier) : undefined;
};

export function forbidden(repo: Repository, options: ImportOptions, file: string, specifier: string): boolean {
  if (specifier === "<dynamic>" || specifier.startsWith("@nestjs/")) return true;
  const target = targetOf(repo, options, file, specifier);
  if (!target) return specifier.startsWith("src/");
  const base = options.base === null ? [] : [join(repo.root, options.base, "src")];
  const roots = [...repo.code.map(folder => join(repo.root, folder)), ...base];
  const adapters = [
    ...options.adapters.map(folder => join(repo.root, folder)),
    ...base.flatMap(folder => ["adapters", "storage", "keychain"].map(name => join(folder, name))),
  ];
  const users = Object.keys(options.adapterUsers);
  const own = fromRoot(repo.root, file);
  return (
    (!roots.some(folder => within(folder, target)) &&
      !/[\\/]node_modules[\\/]/.test(target) &&
      !(isSpec(file) && within(join(repo.root, "tests", "support"), target))) ||
    (adapters.some(folder => within(folder, target)) &&
      !isSpec(file) &&
      !users.some(path => (path.endsWith("/") ? own.startsWith(path) : own === path)))
  );
}

export function strayImports(repo: Repository, options: ImportOptions): string[] {
  const files = codeFiles(repo);
  return [
    ...staleExemptions(repo, options.adapterUsers),
    ...files.flatMap(file =>
      importsIn(parsed(file))
        .filter(specifier => forbidden(repo, options, file, specifier))
        .map(specifier => `${fromRoot(repo.root, file)} → ${specifier}`),
    ),
  ];
}
