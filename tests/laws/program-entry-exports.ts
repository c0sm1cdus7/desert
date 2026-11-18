import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { field, isRecord } from "../../src/fields/json-values.ts";
import { isProgramEntry } from "../../src/checks/laws/program-imports.ts";
import { filesUnder } from "../support/sources.ts";
import { EntryValues } from "./program-entry-values.ts";

/** Expand the package's actual export map, including every currently allowed fields subpath. */
export function programEntryFiles(base: string): Readonly<Record<string, string>> {
  const pkg: unknown = JSON.parse(readFileSync(join(base, "package.json"), "utf8"));
  const exports = field(pkg, "exports");
  if (!isRecord(exports)) throw new Error("missing package exports");
  return Object.fromEntries(
    Object.entries(exports).flatMap(([entry, target]) => {
      if (typeof target !== "string") throw new Error(`uninspectable export: ${entry}`);
      const name = `desert/${entry.slice(2)}`;
      if (!entry.includes("*")) return isProgramEntry(name) ? [[name, join(base, target)]] : [];
      const [prefix, suffix = ""] = target.split("*");
      if (!prefix || target.split("*").length !== 2) throw new Error(`uninspectable export: ${entry}`);
      return filesUnder(join(base, "src")).flatMap(file => {
        const local = `./${relative(base, file)}`;
        if (!local.startsWith(prefix) || !local.endsWith(suffix)) return [];
        const expanded = name.replace("*", local.slice(prefix.length, local.length - suffix.length));
        return isProgramEntry(expanded) ? [[expanded, file]] : [];
      });
    }),
  );
}

/** Resolve symbols without evaluating modules; aliases, stars and namespace barrels retain their origins. */
export function programEntryExports(
  program: ts.Program,
  base: string,
  entries: Readonly<Record<string, string>>,
): string[] {
  const checker = program.getTypeChecker();
  const found = new Set<string>();
  for (const [entry, file] of Object.entries(entries)) {
    const source = program.getSourceFile(file);
    const module = source && checker.getSymbolAtLocation(source);
    if (!module) {
      found.add(`${entry} → cannot inspect exports`);
      continue;
    }
    for (const symbol of checker.getExportsOfModule(module)) {
      const values = new EntryValues(checker, base, path => found.add(`${entry} → ${path}`));
      values.symbol(symbol, symbol.name);
    }
  }
  return [...found];
}
