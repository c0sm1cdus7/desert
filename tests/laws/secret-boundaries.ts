import { posix, resolve } from "node:path";
import ts from "typescript";
import { boundaryEscapes, boundaryImports } from "./secret-syntax.ts";
import { factoryLeaks } from "./secret-types.ts";
import { trackConversions } from "./secret-expression.ts";
import type { ProgramDeclaration } from "./program-declaration.ts";
export interface SecretBoundaryPolicy {
  programDeclaration?: ProgramDeclaration;
  composition: readonly string[];
  adapters: readonly string[];
  custody: readonly string[];
  publicTypes: readonly string[];
  publicModules?: Readonly<Record<string, readonly string[]>>;
  aliases?: Readonly<Record<string, string>>;
  tools?: readonly string[];
}
const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2023,
  noResolve: false,
  strict: true,
  types: ["node"],
  typeRoots: [resolve(import.meta.dirname, "../../node_modules/@types")],
  noUncheckedIndexedAccess: true,
  allowImportingTsExtensions: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  // Package imports are already resolved by the source graph, including its package import map.
  resolvePackageJsonImports: false,
};
export function virtualProgram(sources: Readonly<Record<string, string>>, aliases: Readonly<Record<string, string>>) {
  const standard = ts.createCompilerHost(options);
  const targetOf = sourceResolver(sources, aliases);
  const host: ts.CompilerHost = {
    ...standard,
    resolveModuleNameLiterals: (names, containing) =>
      names.map(name => {
        const file = targetOf(containing, name.text);
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
function sourceResolver(sources: Readonly<Record<string, string>>, aliases: Readonly<Record<string, string>>) {
  const wildcards = Object.entries(aliases).filter(([alias]) => alias.endsWith("*"));
  return (file: string, specifier: string): string | undefined => {
    let path = aliases[`${file}\0${specifier}`] ?? aliases[specifier];
    for (const [alias, target] of wildcards) {
      const prefix = alias.slice(0, -1);
      if (specifier.startsWith(prefix)) path = target.replace("*", specifier.slice(prefix.length));
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
  };
}
/** Store one predecessor per file; render a chain only when there is a diagnostic. */
function exampleChain(file: string, parents: ReadonlyMap<string, string>): string {
  const chain = [file];
  let parent = parents.get(file);
  while (parent !== undefined) {
    chain.push(parent);
    parent = parents.get(parent);
  }
  return chain.reverse().join(" → ");
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
  const found = walkSources(program, sources, policy, privileged, publicTypes);
  for (const file of policy.adapters) {
    const source = program.getSourceFile(file);
    if (source && factoryLeaks(source, checker, new Set(policy.custody))) found.push(`${file} → resolver returned`);
  }
  return [...new Set(found)];
}

function walkSources(
  program: ts.Program,
  sources: Readonly<Record<string, string>>,
  policy: SecretBoundaryPolicy,
  privileged: ReadonlySet<string>,
  publicTypes: ReadonlySet<string>,
): string[] {
  const checker = program.getTypeChecker();
  const publicModules = policy.publicModules ?? {};
  const roots = policy.tools ?? Object.keys(sources).filter(file => !privileged.has(file) && !publicTypes.has(file));
  const found: string[] = [];
  const seen = new Set<string>(),
    parents = new Map<string, string>();
  const targetOf = sourceResolver(sources, policy.aliases ?? {});
  const walk = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = program.getSourceFile(file);
    if (!source) {
      found.push(`${exampleChain(file, parents)} → missing source`);
      return;
    }
    for (const escape of boundaryEscapes(source, checker, policy.programDeclaration))
      found.push(`${exampleChain(file, parents)}:${escape}`);
    for (const edge of boundaryImports(source)) {
      const target = targetOf(file, edge.specifier);
      const allowed = publicModules[target ?? edge.specifier];
      if (allowed && edge.names.length && edge.names.every(name => allowed.includes(name))) continue;
      if (target && publicTypes.has(target)) continue;
      if (!target || privileged.has(target) || target === policy.programDeclaration?.file || allowed)
        found.push(`${exampleChain(file, parents)}:${edge.position} → ${edge.specifier}`);
      else if (!seen.has(target)) {
        parents.set(target, file);
        walk(target);
      }
    }
  };
  for (const file of roots) walk(file);
  return found;
}
