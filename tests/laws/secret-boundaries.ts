import { posix } from "node:path";
import ts from "typescript";
import { boundaryEscapes, boundaryImports } from "./secret-syntax.ts";
import { factoryLeaks } from "./secret-types.ts";
import { trackConversions } from "./secret-expression.ts";
export interface SecretBoundaryPolicy {
  composition: readonly string[];
  adapters: readonly string[];
  custody: readonly string[];
  publicTypes: readonly string[];
  publicModules?: Readonly<Record<string, readonly string[]>>;
  aliases?: Readonly<Record<string, string>>;
  tools?: readonly string[];
}
export function virtualProgram(sources: Readonly<Record<string, string>>, aliases: Readonly<Record<string, string>>) {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2023,
    noResolve: false,
    strict: true,
    noUncheckedIndexedAccess: true,
    allowImportingTsExtensions: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    // Package imports are already resolved by the source graph, including its package import map.
    resolvePackageJsonImports: false,
  };
  const standard = ts.createCompilerHost(options);
  const host: ts.CompilerHost = {
    ...standard,
    resolveModuleNameLiterals: (names, containing) =>
      names.map(name => {
        const file = targetOf(containing, name.text, sources, aliases);
        if (file) return { resolvedModule: { resolvedFileName: file, extension: ts.Extension.Ts } };
        const from = containing.endsWith(".d.ts") ? containing : import.meta.filename;
        const typed = ts.resolveModuleName(name.text, from, options, standard).resolvedModule;
        return { resolvedModule: typed?.extension === ts.Extension.Dts ? typed : undefined };
      }),
    fileExists: path => path in sources || (path.endsWith(".d.ts") && standard.fileExists(path)),
    readFile: path => sources[path] ?? (path.endsWith(".d.ts") ? standard.readFile(path) : undefined),
    getSourceFile: (path, target) =>
      sources[path] === undefined
        ? declarationFile(path, target, standard)
        : ts.createSourceFile(path, sources[path], target, true),
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    directoryExists: () => true,
    getCanonicalFileName: path => path,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };
  const program = ts.createProgram(Object.keys(sources), options, host);
  trackConversions(program);
  return program;
}
function declarationFile(path: string, target: ts.ScriptTarget | ts.CreateSourceFileOptions, host: ts.CompilerHost) {
  return path.endsWith(".d.ts") ? host.getSourceFile(path, target) : undefined;
}
function targetOf(
  file: string,
  specifier: string,
  sources: Readonly<Record<string, string>>,
  aliases: Readonly<Record<string, string>>,
): string | undefined {
  let path = aliases[`${file}\0${specifier}`] ?? aliases[specifier];
  for (const [alias, target] of Object.entries(aliases)) {
    const prefix = alias.replace(/\*$/, "");
    if (alias.endsWith("*") && specifier.startsWith(prefix)) path = target.replace("*", specifier.slice(prefix.length));
  }
  path ??= specifier.startsWith(".") ? posix.join(posix.dirname(file), specifier) : specifier;
  return [
    path,
    path.replace(/\.js$/, ".ts"),
    `${path}.ts`,
    `${path}.mts`,
    `${path}.cts`,
    `${path}.tsx`,
    `${path}/index.ts`,
  ].find(candidate => candidate in sources);
}
/** Closed module graph: unknown packages and nonliteral imports fail, rather than becoming uninspected leaves. */
export function secretBoundaryViolations(
  sources: Readonly<Record<string, string>>,
  policy: SecretBoundaryPolicy,
): string[] {
  const program = virtualProgram(sources, policy.aliases ?? {}),
    checker = program.getTypeChecker();
  const privileged = new Set([...policy.composition, ...policy.adapters, ...policy.custody]);
  const publicTypes = new Set(policy.publicTypes);
  trackConversions(
    program,
    new Set(Object.keys(sources).filter(file => !privileged.has(file) && !publicTypes.has(file))),
  );
  const publicModules = policy.publicModules ?? {};
  const roots = policy.tools ?? Object.keys(sources).filter(file => !privileged.has(file) && !publicTypes.has(file));
  const found: string[] = [];
  const walk = (file: string, chain: readonly string[], seen: Set<string>): void => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = program.getSourceFile(file);
    if (!source) {
      found.push([...chain, file, "missing source"].join(" → "));
      return;
    }
    for (const escape of boundaryEscapes(source, checker)) found.push([...chain, file, escape].join(" → "));
    for (const edge of boundaryImports(source)) {
      const target = targetOf(file, edge.specifier, sources, policy.aliases ?? {});
      const allowed = publicModules[target ?? edge.specifier];
      if (allowed && edge.names.length && edge.names.every(name => allowed.includes(name))) continue;
      if (target && publicTypes.has(target)) continue;
      if (!target || privileged.has(target) || allowed) found.push([...chain, file, edge.specifier].join(" → "));
      else walk(target, [...chain, file], seen);
    }
  };
  for (const file of roots) walk(file, [], new Set());
  for (const file of policy.adapters) {
    const source = program.getSourceFile(file);
    if (source && factoryLeaks(source, checker, new Set(policy.custody))) found.push(`${file} → resolver returned`);
  }
  return [...new Set(found)];
}
