// Every adopting program runs all seven repository laws from its own gate and its own declared folders.
import { join } from "node:path";
import ts from "typescript";
import { isRecord } from "../../fields/json-values.ts";
import { outsideAccess, outsideGlobals } from "./adapters.ts";
import { uncataloguedWords } from "./biases.ts";
import { catalogLaws } from "./catalog-coverage.ts";
import { importCycles } from "./cycles.ts";
import {
  gateScripts,
  ignoredFiles,
  looseRules,
  packageShape,
  readLint,
  skippedTests,
  strayTests,
  uncollectedTests,
} from "./gate.ts";
import { strayImports } from "./imports.ts";
import { codeFiles, fromRoot, withParsedFiles, type Repository } from "./law-files.ts";
import { messageCoverage } from "./message-coverage.ts";
import { programImports } from "./program-imports.ts";
import { programLawOptions } from "./program-law-options.ts";
import { hiddenRules, instructionFiles } from "./prompts.ts";
import { longFiles, longLines, looseCompiler, repeatedClasses, switchedOffChecks, unsafeCasts } from "./size.ts";

/** Compiled program files also belong to a declared law folder, including a separate startup folder. */
export function uncoveredCode(repo: Repository, options: Readonly<{ base: string | null }>): string[] {
  const known = new Set(codeFiles(repo));
  const config = ts.readConfigFile(join(repo.root, "tsconfig.json"), path => ts.sys.readFile(path));
  if (config.error || !isRecord(config.config)) return ["tsconfig.json"];
  const compiled = ts.parseJsonConfigFileContent(config.config, ts.sys, repo.root).fileNames;
  return compiled
    .filter(file => {
      const path = fromRoot(repo.root, file);
      return (
        !known.has(file) &&
        path !== "vitest.config.ts" &&
        !path.startsWith("tests/") &&
        !(options.base !== null && path.startsWith(`${options.base}/`))
      );
    })
    .map(file => fromRoot(repo.root, file));
}

export async function programLaws(root: string): Promise<string[]> {
  const options = programLawOptions(root);
  const { repo, maxLines } = options;
  const readings = await readLint(repo);
  return withParsedFiles(() => [
    ...importCycles(repo),
    ...programImports(repo),
    ...strayImports(repo, options),
    ...outsideAccess(repo, options),
    ...outsideGlobals(repo, options),
    ...longFiles(repo, maxLines),
    ...longLines(repo),
    ...unsafeCasts(repo),
    ...switchedOffChecks(repo),
    ...looseCompiler(repo),
    ...repeatedClasses(repo),
    ...uncoveredCode(repo, options),
    ...ignoredFiles(repo, readings),
    ...looseRules(repo, { readings, maxLines }),
    ...gateScripts(repo),
    ...packageShape(repo, options.name),
    ...skippedTests(repo),
    ...strayTests(repo, options),
    ...uncollectedTests(repo, options),
    ...uncataloguedWords(repo, { catalog: options.catalog, exempt: options.exemptWords }),
    ...hiddenRules(repo, { exempt: options.exemptRules }),
    ...instructionFiles(repo, options),
    ...messageCoverage(repo),
    ...catalogLaws(repo, options.catalog),
  ]);
}
