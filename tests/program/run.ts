// Every matching file loads the program itself, so Vitest can execute the parts in separate workers.
import { describe, it } from "vitest";
import { loadProgram } from "./load.ts";
import { programGroups, registerPart } from "./registration.ts";

export async function runProgramPart(part: number): Promise<void> {
  const groups = programGroups(await loadProgram());
  registerPart(groups, part, (name, checks) => {
    describe(name, () => {
      for (const check of checks) it(check.name, check.run);
    });
  });
}
