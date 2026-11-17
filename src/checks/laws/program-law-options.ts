// Reads every mandatory repository-law option from the adopting program's package declaration.
import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { field, isRecord } from "../../fields/json-values.ts";
import type { Exemptions, Repository } from "./law-files.ts";
import type { RuleExemptions } from "./prompts.ts";

export type ProgramLawOptions = Readonly<{
  repo: Repository;
  name: string;
  base: string | null;
  adapters: readonly string[];
  adapterUsers: Exemptions;
  mayTalkOutside: Exemptions;
  catalog: readonly string[];
  exemptWords: Exemptions;
  exemptRules: RuleExemptions;
  data: Exemptions;
  maxLines: number;
}>;
/** The base keeps every file within 300 lines; a program may ask less of itself, never more. */
const longest = 300;
const fail = (key: string): never => {
  throw new Error(`package.json desert.laws.${key}: missing or invalid option`);
};
const local = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  !isAbsolute(value) &&
  !value.split(/[\\/]/).some(part => part === ".." || part === ".") &&
  !value.includes("\\");
/** A declared folder that is not there would make its law check nothing: it is an invalid option. */
const folder = (root: string, path: string): boolean =>
  existsSync(join(root, path)) && statSync(join(root, path)).isDirectory();
/** A catalog that holds a whole code folder would exempt all of its prose from the catalog law. */
const trimmed = (path: string): string => path.replace(/\/+$/u, "");
const covers = (catalog: string, code: string): boolean =>
  trimmed(code) === trimmed(catalog) || trimmed(code).startsWith(`${trimmed(catalog)}/`);
const paths = (options: unknown, key: string): readonly string[] => {
  const value = field(options, key);
  if (!Array.isArray(value) || !value.every(local)) return fail(key);
  return value;
};
const exemptions = (options: unknown, key: string): Exemptions => {
  const value = field(options, key);
  if (!isRecord(value)) return fail(key);
  const result: Record<string, string> = {};
  for (const [path, reason] of Object.entries(value)) {
    if (!local(path) || typeof reason !== "string" || !reason.trim()) return fail(key);
    result[path] = reason;
  }
  return result;
};
const ruleExemptions = (options: unknown): RuleExemptions => {
  const value = field(options, "exemptRules");
  if (!isRecord(value)) return fail("exemptRules");
  const result: Record<string, { reason: string; texts: readonly string[] }> = {};
  for (const [path, entry] of Object.entries(value)) {
    const reason = field(entry, "reason");
    const texts = field(entry, "texts");
    if (
      !local(path) ||
      typeof reason !== "string" ||
      !reason.trim() ||
      !Array.isArray(texts) ||
      !texts.length ||
      !texts.every((text): text is string => typeof text === "string")
    )
      return fail("exemptRules");
    result[path] = { reason, texts };
  }
  return result;
};

export function programLawOptions(root: string): ProgramLawOptions {
  const pkg: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const options = field(field(pkg, "desert"), "laws");
  const code = paths(options, "code");
  if (!code.length) return fail("code");
  const name = field(pkg, "name");
  if (typeof name !== "string" || !name) return fail("name");
  const base = field(options, "base");
  if (base !== null && (!local(base) || !folder(root, base))) return fail("base");
  const maxLines = field(options, "maxLines");
  if (typeof maxLines !== "number" || !Number.isSafeInteger(maxLines) || maxLines < 1 || maxLines > longest)
    return fail("maxLines");
  const adapters = paths(options, "adapters");
  if (!adapters.every(path => folder(root, path))) return fail("adapters");
  const catalog = paths(options, "catalog");
  if (catalog.some(path => code.some(own => covers(path, own)))) return fail("catalog");
  return {
    repo: { root, code },
    name,
    base,
    maxLines,
    adapters,
    adapterUsers: exemptions(options, "adapterUsers"),
    mayTalkOutside: exemptions(options, "mayTalkOutside"),
    catalog,
    exemptWords: exemptions(options, "exemptWords"),
    exemptRules: ruleExemptions(options),
    data: exemptions(options, "data"),
  };
}
