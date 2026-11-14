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
 * Unknown source/origins fail closed. This static gate is not JavaScript isolation. */
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
