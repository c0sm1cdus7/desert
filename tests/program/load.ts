// The program says once, in package.json, where it composes itself and where it keeps its journals.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Shown } from "../../src/surface/bridge/ports/house-ports.ts";
import type { Composition } from "../../src/tools/promises.ts";
import type { Program } from "../../src/tools/tool-contract.ts";
import { programImports, programDependencies } from "../../src/checks/laws/program-imports.ts";
import { programLawOptions } from "../../src/checks/laws/program-law-options.ts";
import { codeProjectionVersion } from "../../src/runtime/calculation-version.ts";
import { field } from "../contract/json.ts";

export type Composed<X extends Program = Program> = Readonly<{
  where: string;
  root?: string;
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
  const desert = field(pkg, "desert");
  const entry = field(desert, "program");
  const testDistribution = field(desert, "testDistribution");
  const where = testDistribution ?? entry;
  if (typeof where !== "string")
    throw new Error('package.json must say where the program is composed: "desert.program"');
  if (testDistribution !== undefined) {
    if (typeof entry !== "string" || typeof testDistribution !== "string")
      throw new Error("desert.program and desert.testDistribution must name modules");
    const issues = programImports(programLawOptions(root).repo);
    if (issues.length) throw new Error(issues.join("\n"));
  }
  const composed: unknown = await import(pathToFileURL(join(root, where)).href);
  const program = field(composed, "program");
  const shown = field(composed, "shown");
  if (!isProgram(program) || !isShown(shown)) throw new Error(`${where} must export \`program\` and \`shown\``);
  if (typeof testDistribution === "string" && typeof entry === "string") {
    await checkArtifact(root, entry, testDistribution, desert, composed, program);
  }
  const journals = field(field(pkg, "desert"), "journals");
  return { where, root, program, shown, ...(typeof journals === "string" ? { journals: join(root, journals) } : {}) };
}

async function checkArtifact(
  root: string,
  entry: string,
  testDistribution: string,
  desert: unknown,
  composed: unknown,
  program: Composition<Program>,
): Promise<void> {
  const definition: unknown = field(await import(pathToFileURL(join(root, entry)).href), "program");
  if (
    !isRecord(definition) ||
    typeof definition.id !== "string" ||
    typeof definition.install !== "function" ||
    !Array.isArray(definition.codigo) ||
    !definition.codigo.every((path: unknown) => typeof path === "string")
  )
    throw new Error(`${entry} must export an installable program`);
  if (
    JSON.stringify(programDependencies(definition.dependencies)) !==
    JSON.stringify(programDependencies(field(desert, "dependencies")))
  )
    throw new Error("desert.dependencies differs from the program declaration");
  const installed = field(field(composed, "manifest"), "programas");
  const calculation = codeProjectionVersion(definition.codigo).value;
  if (
    !program.registry.some(tool => tool.id === definition.id) ||
    !Array.isArray(installed) ||
    !installed.some(
      (item: unknown) =>
        field(item, "id") === definition.id &&
        field(item, "version") === definition.version &&
        field(item, "calculation") === calculation,
    )
  )
    throw new Error(`${testDistribution} does not compose the declared program artifact`);
}
