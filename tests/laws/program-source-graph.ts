import { isBuiltin } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, dirname, join, resolve, sep } from "node:path";
import ts from "typescript";
import { boundaryImports } from "./secret-syntax.ts";
export const inside = (directory: string, file: string): boolean => file.startsWith(`${directory}${sep}`);
export function compilerOptions(root: string): ts.CompilerOptions {
  const config = join(root, "tsconfig.json");
  if (!existsSync(config)) return {};
  const result = ts.readConfigFile(config, path => readFileSync(path, "utf8"));
  return ts.parseJsonConfigFileContent(result.config, ts.sys, root).options;
}
/** Follow local imports, aliases and reexports even outside src and in specs. Engine/public API is a leaf. */
export function programSourceGraph(
  root: string,
  main: string,
  base: string,
  publicModules: Readonly<Record<string, readonly string[]>>,
) {
  const options = compilerOptions(root);
  const sources: Record<string, string> = {};
  const failures: string[] = [];
  const aliases = Object.fromEntries(
    Object.entries(options.paths ?? {}).flatMap(([name, paths]) => (paths[0] ? [[name, resolve(root, paths[0])]] : [])),
  );
  const visit = (file: string): void => {
    if (file in sources) return;
    if (!/\.(?:[cm]?ts|tsx)$/u.test(file) || /\.d\.[cm]?ts$/u.test(file) || !existsSync(file)) {
      failures.push(`${file}: source cannot be inspected`);
      return;
    }
    const code = readFileSync(file, "utf8");
    sources[file] = code;
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
    for (const edge of boundaryImports(source)) {
      const resolved = ts.resolveModuleName(edge.specifier, file, options, ts.sys).resolvedModule?.resolvedFileName;
      let local: string | undefined;
      if (edge.specifier.startsWith(".")) local = resolve(dirname(file), edge.specifier);
      else if (isAbsolute(edge.specifier)) local = edge.specifier;
      const target = resolved ?? local;
      if (target) aliases[`${file}\0${edge.specifier}`] = target;
      if (target && inside(join(base, "src"), target)) continue;
      if (publicModules[edge.specifier]) continue;
      if (target) visit(target);
      else if (!isBuiltin(edge.specifier)) failures.push(`${file}: cannot inspect ${edge.specifier}`);
    }
  };
  visit(main);
  return { sources, failures, aliases };
}
