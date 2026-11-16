import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { filesUnder, root as base } from "../support/sources.ts";
import { field } from "../contract/json.ts";
import { secretBoundaryViolations, virtualProgram } from "./secret-boundaries.ts";
import { secretPublicApi } from "./secret-public-api.ts";
import { inside, programSourceGraph } from "./program-source-graph.ts";
import { registryOrigins } from "./registry-origins.ts";
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
  const entry = field(field(pkg, "desert"), "program");
  if (typeof entry !== "string") return ["missing desert.program"];
  const main = resolve(root, entry);
  const publicModules = secretPublicApi(base);
  const graph = programSourceGraph(root, main, base, publicModules);
  const files = Object.keys(graph.sources);
  const sources = {
    ...Object.fromEntries(production(join(base, "src")).map(file => [file, readFileSync(file, "utf8")])),
    ...graph.sources,
  };
  const adapters = files.filter(file => inside(join(root, "src/adapters"), file));
  const tools = files.filter(file => file !== main && !adapters.includes(file));
  return [
    ...graph.failures,
    ...registryOrigins(virtualProgram(sources, graph.aliases), main, new Set([main, ...adapters])),
    ...secretBoundaryViolations(sources, {
      composition: [main, ...production(join(base, "src/programs"))],
      adapters,
      custody: Object.keys(sources).filter(file => inside(join(base, "src"), file)),
      publicTypes: [],
      publicModules,
      tools,
      aliases: graph.aliases,
    }),
  ];
}
