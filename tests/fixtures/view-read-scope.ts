import type { ViewProgram } from "../../src/views/program-schema.ts";
import type { HumanSurface, ValidateInput } from "../../src/web/types.ts";
import { readScopes } from "../../src/web/client/view-scopes.ts";

export function viewReadScope(program: ViewProgram, surface: HumanSurface, validate: ValidateInput, readId: string) {
  const scope = readScopes(program, surface).find(scope => scope.read.id === readId);
  if (!scope) throw new Error("MISSING_TEST_READ_SCOPE");
  return scope;
}
