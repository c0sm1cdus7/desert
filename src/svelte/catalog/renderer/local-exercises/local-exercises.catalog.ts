// LocalExercises: the public catalog's exercises drawn locally through the local exercise content.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LocalExercisesContract } from "./local-exercises.contract.ts";

export const LocalExercises = defineComposition({
  id: "local-exercises",
  purpose: { key: "localExercises.purpose" },
  messages: ["localExercises.purpose"],
  owner: { entry: "LocalExercises.svelte" },
  uses: ["local-exercise-content"], approval: "none", contract: LocalExercisesContract,
} as const);
