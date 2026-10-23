// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ProblemContract } from "./problem.contract.ts";

export const Problem = defineComposition({
  id: "problem",
  purpose: "Explain a warning or error and keep any available recovery action beside it.",
  owner: { entry: "Problem.svelte" },
  uses: ["surface-frame"], approval: "required", contract: ProblemContract,
} as const);
