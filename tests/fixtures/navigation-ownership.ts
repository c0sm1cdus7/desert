import { compile } from "../../src/compile.ts";
import { Notebook } from "../../products/notebook/product.ts";
import type { HumanSurface } from "../../src/web/types.ts";
import { authoredNotebookSource } from "./authored-notebook.ts";

export function navigationOwnershipFixture() {
  const definition = structuredClone(Notebook);
  const application = compile(definition);
  const surface = application.surface("human") as HumanSurface;
  const composition = authoredNotebookSource();
  return { definition, application, surface, composition };
}
