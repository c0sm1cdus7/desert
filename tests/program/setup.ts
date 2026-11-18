// Runs in the coordinator before any program part starts, with no organization opened or check executed.
import type { TestProject } from "vitest/node";
import { checkProgramCode } from "./code.ts";
import { loadProgram } from "./load.ts";
import { programGroups } from "./registration.ts";
import { summarize } from "./manifest.ts";
declare module "vitest" {
  export interface ProvidedContext {
    programList: string;
  }
}
/** A program the loader rejects ends the run with the reason in sight: Vite 8.3.8 breaks while mapping that error's
 * trace («code.charCodeAt is not a function») and Vitest would only say «No test files found». */
export default async function setup(project: TestProject): Promise<void> {
  try {
    const composed = await loadProgram();
    checkProgramCode(composed);
    project.provide("programList", summarize(programGroups(composed)));
  } catch (error) {
    process.stderr.write(
      `\nThe DESERT gate rejected the program:\n${error instanceof Error ? error.message : String(error)}\n\n`,
    );
    process.exit(1);
  }
}
