import { NotebookViewProgram } from "../../products/notebook/product.ts";
import { ReadNote } from "../../products/notebook/journeys.ts";
import type { HumanSurface } from "../../src/web/types.ts";
import { readScopes } from "../../src/web/client/view-scopes.ts";

export function notebookScope(surface: HumanSurface) {
  const scope = readScopes(NotebookViewProgram, surface).find(scope => scope.read.id === ReadNote.id);
  if (!scope) throw new Error("NOTEBOOK_READ_SCOPE_REQUIRED");
  return scope;
}
