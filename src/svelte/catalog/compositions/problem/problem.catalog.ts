// Problem: the transitional adapter of the problem node onto Dialog (DESIGN §4, item 62): a warning or error explained in
// a dialog the person closes unless it is locked.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ProblemContract } from "./problem.contract.ts";

export const Problem = defineComposition({
  id: "problem",
  purpose: { key: "problem.purpose" },
  messages: ["problem.purpose", "problem.close"],
  owner: { entry: "Problem.svelte" },
  uses: ["dialog"], renders: ["problem"], approval: "required", contract: ProblemContract,
} as const);
