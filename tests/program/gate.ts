// A program package runs the base's whole gate from its own tests: the loader first (imports and secrets, before the
// program is evaluated), then the derived checks, its kept journals, its secret boundaries and the repository laws.
import { checkProgramCode } from "./code.ts";
import { loadProgram } from "./load.ts";
import { programGroups, type Group } from "./registration.ts";
export type { Group };
export async function programGate(root: string): Promise<readonly Group[]> {
  const composed = await loadProgram(root);
  checkProgramCode(composed);
  return programGroups(composed);
}
