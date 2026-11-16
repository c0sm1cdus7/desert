// The program says once, in package.json, where it composes itself and where it keeps its journals.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Shown } from "../../src/surface/bridge/ports/house-ports.ts";
import type { Composition } from "../../src/tools/promises.ts";
import type { Program } from "../../src/tools/tool-contract.ts";
import { field } from "../contract/json.ts";

export type Composed<X extends Program = Program> = Readonly<{
  where: string;
  program: Composition<X>;
  shown: Shown<X>;
  journals?: string;
}>;
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isProgram = (value: unknown): value is Composition<Program> =>
  isRecord(value) && Array.isArray(value.registry) && isRecord(value.slices) && isRecord(value.words);
const isShown = (value: unknown): value is Shown<Program> =>
  isRecord(value) && isRecord(value.words) && isRecord(value.locale);

export async function loadProgram(root = process.cwd()): Promise<Composed> {
  const pkg: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const where = field(field(pkg, "desert"), "program");
  if (typeof where !== "string")
    throw new Error('package.json must say where the program is composed: "desert.program"');
  const composed: unknown = await import(pathToFileURL(join(root, where)).href);
  const program = field(composed, "program");
  const shown = field(composed, "shown");
  if (!isProgram(program) || !isShown(shown)) throw new Error(`${where} must export \`program\` and \`shown\``);
  const journals = field(field(pkg, "desert"), "journals");
  return { where, program, shown, ...(typeof journals === "string" ? { journals: join(root, journals) } : {}) };
}
