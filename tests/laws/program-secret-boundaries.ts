import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { filesUnder, root as base } from "../support/sources.ts";
import { field } from "../contract/json.ts";
import { secretBoundaryViolations, virtualProgram } from "./secret-boundaries.ts";
import { secretPublicApi } from "./secret-public-api.ts";
import { inside, programSourceGraph } from "./program-source-graph.ts";
import { programEntryExports, programEntryFiles } from "./program-entry-exports.ts";
import { registryOrigins } from "./registry-origins.ts";
import { programImports } from "../../src/checks/laws/program-imports.ts";
import { programLawOptions } from "../../src/checks/laws/program-law-options.ts";
// The same composition files after the signed move; no extra door inherits the exemption.
const compositionFiles = [
  "src/checks/adapter-test.ts",
  "src/checks/calculations/check-calculations.ts",
  "src/checks/calculations/check-state-input.ts",
  "src/checks/code/code-imports.ts",
  "src/checks/code/code-upgrade-check.ts",
  "src/checks/code/code-version-check.ts",
  "src/checks/kept/kept-capabilities.ts",
  "src/checks/kept/kept-inspection.ts",
  "src/checks/kept/kept-journals.ts",
  "src/checks/kept/kept-names.ts",
  "src/checks/kept/kept-path.ts",
  "src/checks/kept/kept-upgrade.ts",
  "src/checks/kept/kept-walk.ts",
  "src/checks/kept/renew-kept.ts",
  "src/checks/kept/upgrade-comparison.ts",
  "src/checks/opacity/opacity-derived.ts",
  "src/checks/opacity/secret-cases.ts",
  "src/checks/program-checks.ts",
  "src/checks/promise-temporaries.ts",
  "src/checks/promises/answers/checked-reason.ts",
  "src/checks/promises/answers/current.ts",
  "src/checks/promises/answers/promised-answer.ts",
  "src/checks/promises/answers/promised-entry.ts",
  "src/checks/promises/answers/repeated-answer.ts",
  "src/checks/promises/cases/also-causes.ts",
  "src/checks/promises/cases/opening-checks.ts",
  "src/checks/promises/cases/promised-laws.ts",
  "src/checks/promises/cases/promised-shapes.ts",
  "src/checks/promises/cases/promised.ts",
  "src/checks/promises/choices/closed-choices.ts",
  "src/checks/promises/choices/many-choices.ts",
  "src/checks/promises/choices/promised-choices.ts",
  "src/checks/promises/identities/identity-checks.ts",
  "src/checks/promises/identities/kit-checks.ts",
  "src/checks/promises/menu/promised-find.ts",
  "src/checks/promises/menu/promised-notices.ts",
  "src/checks/promises/off/case-availability.ts",
  "src/checks/promises/off/promised-availability.ts",
  "src/checks/promises/off/promised-off.ts",
  "src/checks/promises/off/promised-preferences.ts",
  "src/checks/promises/off/promised-read.ts",
  "src/checks/promises/promised-keys.ts",
  "src/checks/promises/promised-stage.ts",
  "src/checks/promises/walk/case-walk.ts",
  "src/checks/promises/walk/fixed-entries.ts",
  "src/checks/promises/walk/promised-result.ts",
  "src/checks/promises/walk/promised-route.ts",
  "src/checks/promises/walk/promised-walk.ts",
  "src/checks/read-screen.ts",
  "src/checks/real-terminal.ts",
  "src/doors/socket/server/serve-program.ts",
  "src/doors/socket/server/server-process.ts",
  "src/doors/socket/server/socket-listener.ts",
  "src/doors/terminal/bounded-output.ts",
  "src/doors/terminal/house-output-process.ts",
  "src/doors/terminal/house-output.ts",
  "src/doors/terminal/launch-house.ts",
  "src/doors/terminal/open-terminal.ts",
  "src/doors/terminal/terminal-client.ts",
  "src/doors/terminal/terminal-error.ts",
  "src/doors/terminal/terminal-program.ts",
  "src/house/inherited-wake.ts",
  "src/runtime/calculation-version.ts",
  "src/runtime/code-files.ts",
  "src/runtime/house-custody-maintenance.ts",
  "src/runtime/house-projections.ts",
  "src/runtime/house-resources.ts",
  "src/runtime/house-runtime.ts",
  "src/runtime/projection-version.ts",
];
const production = (directory: string): string[] => filesUnder(directory).filter(file => !file.endsWith(".spec.ts"));
/** Inspect the composition's import graph and trace registry values, never executing program code.
 * Engine public imports are audited leaves; adapters and composition cannot define registered tools.
 * Every computed read checks the selected value, including binding/assignment/parameter destructuring.
 * Methods inside a value are fine; callable/constructible and opaque results are not. Each file is inspected once.
 * Converted object/key origins and constructor, __proto__, prototype reads are rejected in tools.
 * Reflect/module and unknown source/origins fail closed. Paths through any still need lint over the whole graph
 * (current base globs omit .mts/.cts). This catches mistakes/known paths, not JavaScript isolation. */
export function programSecretBoundaries(root: string): string[] {
  const pkg: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const desert = field(pkg, "desert");
  const distribution = field(desert, "kind") === "distribution";
  const entry = field(desert, "program");
  if (!distribution && entry !== undefined) {
    const imports = programImports(programLawOptions(root).repo);
    if (imports.length) return imports;
  }
  if (typeof entry !== "string") return ["missing desert.program"];
  const { main, publicModules, graph, files, sources } = programGraph(root, entry, distribution);
  const adapters = distribution ? files.filter(file => inside(join(root, "src/adapters"), file)) : [];
  const tools = files.filter(file => (!distribution || file !== main) && !adapters.includes(file));
  const inspected = virtualProgram(sources, graph.aliases);
  return [
    ...graph.failures,
    ...(!distribution ? programEntryExports(inspected, base, programEntryFiles(base)) : []),
    ...registryOrigins(
      inspected,
      main,
      new Set([main, ...adapters]),
      distribution ? undefined : join(base, "src/tools/installable/program.ts"),
    ),
    ...secretBoundaryViolations(sources, {
      composition: [...(distribution ? [main] : []), ...compositionFiles.map(file => join(base, file))],
      ...(!distribution
        ? { programDeclaration: { file: main, constructor: join(base, "src/tools/installable/program.ts") } }
        : {}),
      adapters,
      custody: Object.keys(sources).filter(file => inside(join(base, "src"), file)),
      publicTypes: [],
      publicModules,
      tools,
      aliases: graph.aliases,
    }),
  ];
}

function programPublicModules(distribution: boolean) {
  return Object.fromEntries(
    Object.entries(secretPublicApi(base)).filter(
      ([entry]) => distribution || (entry !== "desert/testing" && entry !== join(base, "src/testing.ts")),
    ),
  );
}
function programSources(graph: Readonly<Record<string, string>>) {
  return {
    ...Object.fromEntries(production(join(base, "src")).map(file => [file, readFileSync(file, "utf8")])),
    ...graph,
  };
}

function programGraph(root: string, entry: string, distribution: boolean) {
  const main = resolve(root, entry);
  const publicModules = programPublicModules(distribution);
  const graph = programSourceGraph(root, main, base, publicModules);
  const files = Object.keys(graph.sources);
  const sources = programSources(graph.sources);
  return { main, publicModules, graph, files, sources };
}
