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
export default async function setup(project: TestProject): Promise<void> {
  const composed = await loadProgram();
  checkProgramCode(composed);
  project.provide("programList", summarize(programGroups(composed)));
}
