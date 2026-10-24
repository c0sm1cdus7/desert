// Problem: a modal message that explains a warning or an error; it closes on request unless it is locked.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ProblemContract } from "./problem.contract.ts";

export const Problem = defineComposition({
  id: "problem",
  purpose: "Explain a warning or error in a modal message the person dismisses unless it is locked.",
  owner: { entry: "Problem.svelte" },
  uses: ["surface-frame"], approval: "required", contract: ProblemContract,
} as const);
