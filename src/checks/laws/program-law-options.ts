// Reads every mandatory repository-law option from the adopting program's package declaration.
import { readFileSync } from "node:fs";
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
  maxLines: number | null;
}>;
const fail = (key: string): never => {
  throw new Error(`package.json desert.laws.${key}: missing or invalid option`);
};
const local = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  !isAbsolute(value) &&
  !value.split(/[\\/]/).some(part => part === ".." || part === ".") &&
  !value.includes("\\");
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
  if (base !== null && !local(base)) return fail("base");
  const maxLines = field(options, "maxLines");
  if (maxLines !== null && (typeof maxLines !== "number" || !Number.isSafeInteger(maxLines) || maxLines < 1))
    return fail("maxLines");
  return {
    repo: { root, code },
    name,
    base,
    maxLines,
    adapters: paths(options, "adapters"),
    adapterUsers: exemptions(options, "adapterUsers"),
    mayTalkOutside: exemptions(options, "mayTalkOutside"),
    catalog: paths(options, "catalog"),
    exemptWords: exemptions(options, "exemptWords"),
    exemptRules: ruleExemptions(options),
    data: exemptions(options, "data"),
  };
}
