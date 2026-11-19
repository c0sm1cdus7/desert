// Law 2: explicit dependencies and isolated adapters, including type queries and require.
import { existsSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import ts from "typescript";
import { field, isRecord } from "../../fields/json-values.ts";
import { codeFiles, fromRoot, isSpec, parsed, staleExemptions, type Exemptions, type Repository } from "./law-files.ts";
export type ImportOptions = Readonly<{
  base: string | null;
  adapters: readonly string[];
  adapterUsers: Exemptions;
}>;
/** Resolve each physical path once per inspection, without retaining stale links between gate runs. */
const canonicalPaths = (): ((file: string) => string) => {
  const paths = new Map<string, string>();
  return file => {
    const known = paths.get(file);
    if (known !== undefined) return known;
    const path = existsSync(file) ? realpathSync(file) : file;
    paths.set(file, path);
    return path;
  };
};
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

/** One compiler configuration and module-resolution cache for the whole inspection. */
const importResolver = (repo: Repository, options: ImportOptions) => {
  const config: unknown = ts.readConfigFile(join(repo.root, "tsconfig.json"), path => ts.sys.readFile(path)).config;
  const declared = field(config, "compilerOptions");
  if (!isRecord(declared)) throw new Error(`${repo.root}/tsconfig.json: no compilerOptions to resolve imports with`);
  const compiler = ts.convertCompilerOptionsFromJson(declared, repo.root).options;
  const cache = ts.createModuleResolutionCache(repo.root, file => file, compiler);
  return (file: string, specifier: string): string | undefined => {
    const resolved = ts.resolveModuleName(specifier, file, compiler, ts.sys, cache).resolvedModule?.resolvedFileName;
    if (resolved) return resolved;
    if (options.base && specifier.startsWith("#desert/"))
      return resolve(repo.root, options.base, "src", specifier.slice(8));
    return specifier.startsWith(".") || isAbsolute(specifier) ? resolve(dirname(file), specifier) : undefined;
  };
};

const importGuard = (repo: Repository, options: ImportOptions) => {
  const canonical = canonicalPaths();
  const within = (folder: string, file: string): boolean => canonical(file).startsWith(`${canonical(folder)}${sep}`);
  const targetOf = importResolver(repo, options);
  const base = options.base === null ? [] : [join(repo.root, options.base, "src")];
  const roots = [...repo.code.map(folder => join(repo.root, folder)), ...base];
  const adapters = [
    ...options.adapters.map(folder => join(repo.root, folder)),
    ...base.flatMap(folder => ["adapters", "storage", "keychain"].map(name => join(folder, name))),
  ];
  const users = Object.keys(options.adapterUsers);
  return (file: string, specifier: string): boolean => {
    if (specifier === "<dynamic>" || specifier.startsWith("@nestjs/")) return true;
    const target = targetOf(file, specifier);
    if (!target) return specifier.startsWith("src/");
    const own = fromRoot(repo.root, file);
    return (
      (!roots.some(folder => within(folder, target)) &&
        !/[\\/]node_modules[\\/]/.test(target) &&
        !(isSpec(file) && within(join(repo.root, "tests", "support"), target))) ||
      (adapters.some(folder => within(folder, target)) &&
        !isSpec(file) &&
        !users.some(path => (path.endsWith("/") ? own.startsWith(path) : own === path)))
    );
  };
};

export function forbidden(
  repo: Repository,
  options: ImportOptions,
  file: string,
  specifier: string,
  rejects = importGuard(repo, options),
): boolean {
  return rejects(file, specifier);
}

export function strayImports(repo: Repository, options: ImportOptions): string[] {
  const files = codeFiles(repo);
  const rejects = importGuard(repo, options);
  return [
    ...staleExemptions(repo, options.adapterUsers),
    ...files.flatMap(file =>
      importsIn(parsed(file))
        .filter(specifier => forbidden(repo, options, file, specifier, rejects))
        .map(specifier => `${fromRoot(repo.root, file)} → ${specifier}`),
    ),
  ];
}
