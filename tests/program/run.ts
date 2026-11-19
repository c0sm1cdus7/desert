// Every matching file loads the program itself, so Vitest can execute the parts in separate workers.
import { describe, it, inject } from "vitest";
import { sameProgramList } from "./manifest.ts";
import { checkProgramCode } from "./code.ts";
import { loadProgram } from "./load.ts";
import { programGroups, registerPart } from "./registration.ts";

export async function runProgramPart(part: number): Promise<void> {
  const composed = await loadProgram();
  checkProgramCode(composed);
  const groups = programGroups(composed);
  sameProgramList(groups, inject("programList"));
  registerPart(groups, part, (name, checks) => {
    describe(name, () => {
      for (const check of checks) it(check.name, check.run, check.timeoutMs);
    });
  });
}
